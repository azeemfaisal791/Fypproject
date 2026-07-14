const express = require("express");
const multer = require("multer");
const { transcribeAudio } = require("../utils/openai");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // ~10s of audio is well under this
  fileFilter: (req, file, cb) => {
    // Chrome records audio/webm, Safari audio/mp4, Firefox audio/ogg
    const ok =
      file.mimetype &&
      (file.mimetype.startsWith("audio/") || file.mimetype.includes("webm") || file.mimetype.includes("ogg"));
    if (ok) return cb(null, true);
    cb(new Error("Please send an audio recording"));
  },
});

// POST /api/search/voice   (multipart/form-data, field name: "audio")
router.post("/voice", (req, res) => {
  upload.single("audio")(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        const msg =
          uploadErr.code === "LIMIT_FILE_SIZE"
            ? "Recording is too long. Please keep it under 10 seconds."
            : uploadErr.message;
        return res.status(400).json({ message: msg });
      }
      if (!req.file || req.file.buffer.length === 0) {
        return res.status(400).json({ message: "No audio received. Please try recording again." });
      }

      // Preserve a sensible file extension — some providers sniff by name
      const ext = req.file.mimetype.includes("mp4")
        ? "m4a"
        : req.file.mimetype.includes("ogg")
        ? "ogg"
        : "webm";

      const text = await transcribeAudio(req.file.buffer, `voice.${ext}`, req.file.mimetype);

      if (!text) {
        return res.json({ text: "", message: "We couldn't hear anything. Please try again closer to the mic." });
      }

      res.json({ text });
    } catch (err) {
      console.error("[voice-search] failed:", err.message);
      res.status(err.status || 500).json({
        message: err.status ? err.message : "Voice search failed. Please try again.",
      });
    }
  });
});

module.exports = router;
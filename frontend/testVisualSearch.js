import { useRef, useState } from "react";
import { apiUpload } from "../api";

// Text search works. Voice search (Vision 5.4) records mic audio and
// transcribes it with Whisper via POST /api/search/voice; if the mic or
// backend is unavailable it falls back to the browser's Web Speech API.
// Image search (Vision 5.3): pick a product photo -> parent uploads it
// to POST /api/search/visual and shows the matches.
const MAX_RECORD_MS = 8000; // auto-stop after 8 seconds

export default function SearchBar({ onSearch, onImageSelect, imageBusy = false }) {
  const [query, setQuery] = useState("");
  const [voiceState, setVoiceState] = useState("idle"); // idle | recording | transcribing
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const stopTimerRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const applyTranscript = (text) => {
    const clean = (text || "").trim();
    if (!clean) return;
    setQuery(clean);
    onSearch(clean);
  };

  // ---------- Voice search: Whisper (primary) ----------
  const stopRecording = () => {
    clearTimeout(stopTimerRef.current);
    recorderRef.current?.stop();
  };

  const startVoice = async () => {
    if (voiceState === "recording") return stopRecording(); // tap again to stop
    if (voiceState !== "idle") return;

    // No mic API (old browser / http without permissions) -> Web Speech fallback
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return webSpeechFallback();
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert("Microphone access was denied. Please allow the microphone and try again.");
      return;
    }

    const chunks = [];
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); // release the mic
      setVoiceState("transcribing");
      try {
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        const fd = new FormData();
        fd.append("audio", blob, "voice.webm");
        const data = await apiUpload("/search/voice", fd);
        if (data.text) applyTranscript(data.text);
        else if (data.message) alert(data.message);
      } catch {
        // Backend/AI down -> try the browser's own recognition instead
        webSpeechFallback();
      } finally {
        setVoiceState("idle");
      }
    };

    rec.start();
    setVoiceState("recording");
    stopTimerRef.current = setTimeout(stopRecording, MAX_RECORD_MS);
  };

  // ---------- Voice search: Web Speech API (fallback) ----------
  const webSpeechFallback = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice search is not available right now. Please type your search instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    setVoiceState("recording");
    rec.onresult = (e) => applyTranscript(e.results[0][0].transcript);
    rec.onend = () => setVoiceState("idle");
    rec.onerror = () => setVoiceState("idle");
    rec.start();
  };

  // ---------- Image search ----------
  const pickImage = (e) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the SAME file again still fires onChange
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert("Image is too large. Please choose an image under 8MB.");
      return;
    }
    onImageSelect?.(file);
  };

  const voiceLabel =
    voiceState === "recording" ? "Stop ●" : voiceState === "transcribing" ? "Transcribing..." : "Voice";

  return (
    <form className="search-row" onSubmit={submit}>
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={startVoice}
        disabled={voiceState === "transcribing"}
        title={voiceState === "recording" ? "Tap to stop recording" : "Voice search"}
      >
        {voiceLabel}
      </button>

      {/* Hidden file input; the visible button just opens it */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={pickImage}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => fileRef.current?.click()}
        disabled={imageBusy}
        title="Search by image"
      >
        {imageBusy ? "Searching..." : "Image"}
      </button>
    </form>
  );
}
import { useRef, useState } from "react";

// Text search works. Voice search uses the browser's Web Speech API.
// Image search (Vision 5.3): pick a product photo from disk → the parent
// page uploads it to POST /api/search/visual and shows the matches.
export default function SearchBar({ onSearch, onImageSelect, imageBusy = false }) {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const fileRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice search is not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    setListening(true);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setQuery(text);
      onSearch(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
  };

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
      <button type="button" className="icon-btn" onClick={startVoice} title="Voice search">
        {listening ? "Listening..." : "Voice"}
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
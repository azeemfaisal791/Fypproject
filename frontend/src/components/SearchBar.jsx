import { useState } from "react";

// Text search works now. Voice search uses the browser's Web Speech API
// as a placeholder until the OpenAI Whisper backend route is added.
// Visual search button is a placeholder for the image-search module (Vision 5.3).
export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);

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

  const visualSearch = () => {
    alert("Visual search will be enabled when the image-search AI module is added (next phase).");
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
      <button type="button" className="icon-btn" onClick={visualSearch} title="Search by image">
        Image
      </button>
    </form>
  );
}

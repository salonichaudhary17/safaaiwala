import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { t } from "../lib/i18n";
import { askAssistant } from "../lib/api";
import { isVoiceSupported, listenOnce, speak } from "../lib/voice";
import Icon from "../components/Icon";

export default function Assistant() {
  const { lang, collector } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await askAssistant(text, lang, collector.location);
      setMessages((prev) => [...prev, { role: "assistant", text: res.answer }]);
      speak(res.answer, lang);
    } catch {
      const fallback =
        lang === "hi"
          ? "अभी जवाब नहीं मिल पाया, कृपया दोबारा कोशिश करें।"
          : lang === "mr"
          ? "सध्या उत्तर मिळाले नाही, कृपया पुन्हा प्रयत्न करा."
          : "Couldn't reach the assistant right now, please try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMic() {
    if (!isVoiceSupported()) {
      alert("Voice input isn't supported on this browser. Try typing instead.");
      return;
    }
    setListening(true);
    try {
      const transcript = await listenOnce(lang);
      await send(transcript);
    } catch {
      // user cancelled or no speech detected — fail silently, this is a
      // low-literacy tool and an error toast would just add noise
    } finally {
      setListening(false);
    }
  }

  return (
    <div className="stack" style={{ height: "100%" }}>
      <div>
        <div className="h1">{t("assistantTitle", lang)}</div>
        <p className="muted">{t("assistantHint", lang)}</p>
      </div>

      <div
        className="stack"
        style={{ flex: 1, gap: 10, alignItems: "stretch", minHeight: 200 }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${m.role}`}
            style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
          >
            {m.text}
          </div>
        ))}
        {loading && <div className="chat-bubble assistant muted">...</div>}
        <div ref={endRef} />
      </div>

      <div className="row" style={{ gap: 10 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={t("typeMessage", lang)}
        />
        <button
          className={`mic-btn ${listening ? "listening" : ""}`}
          onClick={handleMic}
          aria-label={t("listening", lang)}
        >
          <Icon name="mic" size={26} color="#fff" />
        </button>
      </div>
      <button className="btn btn-primary btn-block" onClick={() => send(input)} disabled={!input.trim()}>
        {t("send", lang)}
      </button>
    </div>
  );
}

import { useSpeechFeedback } from "../hooks/useSpeechFeedback";
import { normalizeSpeechLang } from "../lib/speechLocale";

export default function TextToSpeech({ text, lang = "hi-IN", fallbackSrc }) {
  const { speak, isSpeaking, isSupported, hasMarathiVoice } = useSpeechFeedback();
  const speechLang = normalizeSpeechLang(lang);

  const listenLabel =
    speechLang === "mr" ? "ऐका" : speechLang === "hi" ? "सुनें" : "Listen";

  const handleSpeak = () => {
    speak(text, {
      lang: speechLang,
      fallbackSrc:
        speechLang === "mr" && (!hasMarathiVoice || !isSupported)
          ? fallbackSrc
          : fallbackSrc && !isSupported
            ? fallbackSrc
            : undefined,
    });
  };

  return (
    <button
      onClick={handleSpeak}
      type="button"
      className="btn btn-secondary"
      aria-label={listenLabel}
      disabled={isSpeaking && isSupported}
      style={{ minHeight: 40, gap: 6 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M11 5 6 9H3v6h3l5 4V5Zm7.07 1.93a8 8 0 0 1 0 10.14M15.54 8.46a5 5 0 0 1 0 7.07"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{isSpeaking ? "🔊" : listenLabel}</span>
    </button>
  );
}

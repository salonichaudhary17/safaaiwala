const LANG_CODES = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

export function isVoiceSupported() {
  return (
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  );
}

/**
 * listenOnce - starts speech recognition and resolves with the transcript.
 * Uses the browser's built-in engine so it works without any AWS keys in
 * this dev build. Production note: AWS Transcribe gives more reliable
 * results for noisy field environments and can be swapped in behind this
 * same function signature.
 */
export function listenOnce(lang) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error("Speech recognition not supported on this device"));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODES[lang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => resolve(event.results[0][0].transcript);
    recognition.onerror = (event) => reject(event.error);
    recognition.start();
  });
}

/**
 * speak - reads text aloud in the given language.
 * Production note: swap for AWS Polly if device TTS voices for hi-IN/mr-IN
 * are missing on very low-end Android builds.
 */
export function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_CODES[lang] || "en-IN";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

function pickVoice(lang) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (lang.startsWith("hi")) {
    return (
      voices.find((voice) => voice.lang.toLowerCase().startsWith("hi")) ||
      voices.find((voice) => /hindi/i.test(voice.name)) ||
      null
    );
  }
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-in")) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

function speak(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang.startsWith("hi") ? "hi-IN" : "en-IN";
  utterance.rate = 0.96;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function parseCommand(transcript) {
  const text = transcript.toLowerCase().trim();

  if (
    /price|bhaav|bhav|भाव|rate|aaj ka|आज का भाव|kitna|कितना/.test(text)
  ) {
    return { type: "prices" };
  }
  if (/scan|scanner|camera|स्कैन|फोटो|photo|classify/.test(text)) {
    return { type: "scanner" };
  }
  if (/pickup|pick up|collect|पिकअप|उठवा|schedule/.test(text)) {
    return { type: "pickup" };
  }
  if (/dashboard|recycler|पोर्टल|रीसाइकल/.test(text)) {
    return { type: "portal" };
  }
  if (/home|होम|home page/.test(text)) {
    return { type: "home" };
  }
  if (/english|अंग्रेजी/.test(text)) {
    return { type: "lang", lang: "en" };
  }
  if (/hindi|हिंदी|हिन्दी/.test(text)) {
    return { type: "lang", lang: "hi" };
  }
  return { type: "unknown", text };
}

export default function VoiceAssistant({ onNavigate, onSchedulePickup }) {
  const { user } = useAuth();
  const { lang, setLang, online } = useApp();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(Boolean(SpeechRecognitionCtor));
  const [lastHeard, setLastHeard] = useState("");
  const [status, setStatus] = useState(
    lang === "hi" ? "माइक दबाकर बोलें" : "Tap mic and speak"
  );
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    setSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    if (!SpeechRecognitionCtor) return undefined;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += chunk;
      }
      if (!finalTranscript) return;

      setLastHeard(finalTranscript);
      const command = parseCommand(finalTranscript);

      if (command.type === "prices") {
        onNavigate?.("home");
        speak(
          lang === "hi"
            ? "आज का भाव खोल रहा हूँ।"
            : "Opening today's live prices.",
          lang
        );
        setStatus(lang === "hi" ? "आज का भाव" : "Live prices");
      } else if (command.type === "scanner") {
        onNavigate?.("scan");
        speak(
          lang === "hi"
            ? "स्कैनर खोल रहा हूँ। कैमरा पर सामान दिखाएँ।"
            : "Opening the scanner. Show the item to the camera.",
          lang
        );
        setStatus(lang === "hi" ? "स्कैनर" : "Scanner");
      } else if (command.type === "pickup") {
        onNavigate?.("scan");
        speak(
          lang === "hi"
            ? "पिकअप शेड्यूल कर रहा हूँ।"
            : "Scheduling a pickup request.",
          lang
        );
        onSchedulePickup?.();
        setStatus(lang === "hi" ? "पिकअप" : "Pickup");
      } else if (command.type === "portal") {
        onNavigate?.("portal");
        speak(
          lang === "hi"
            ? "रीसाइकलर डैशबोर्ड खोल रहा हूँ।"
            : "Opening the recycler dashboard.",
          lang
        );
      } else if (command.type === "home") {
        onNavigate?.("home");
        speak(lang === "hi" ? "होम पेज।" : "Home.", lang);
      } else if (command.type === "lang") {
        setLang(command.lang);
        speak(
          command.lang === "hi" ? "अब हिंदी में सुन रहा हूँ।" : "Listening in English now.",
          command.lang
        );
      } else {
        speak(
          lang === "hi"
            ? "समझ नहीं आया। भाव, स्कैन, या पिकअप कहें।"
            : "I did not catch that. Try prices, scan, or pickup.",
          lang
        );
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setSupported(false);
        setStatus(lang === "hi" ? "माइक की अनुमति दें" : "Allow microphone access");
        shouldListenRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    };
  }, [lang, onNavigate, onSchedulePickup, setLang]);

  function toggle() {
    if (!SpeechRecognitionCtor) {
      setSupported(false);
      return;
    }

    if (listening) {
      shouldListenRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      setListening(false);
      setStatus(lang === "hi" ? "रुका" : "Stopped");
      return;
    }

    shouldListenRef.current = true;
    try {
      recognitionRef.current.lang = lang === "hi" ? "hi-IN" : "en-IN";
      recognitionRef.current.start();
      setListening(true);
      setStatus(lang === "hi" ? "सुन रहा हूँ..." : "Listening...");
      speak(
        lang === "hi"
          ? `नमस्ते ${user?.name || ""}। भाव, स्कैन या पिकअप बोलें।`
          : `Hello ${user?.name || ""}. Say prices, scan, or pickup.`,
        lang
      );
    } catch {
      setListening(false);
    }
  }

  if (!supported) {
    return (
      <button className="voice-fab" type="button" title="Voice unavailable" disabled>
        <MicOff size={22} />
      </button>
    );
  }

  return (
    <div className="voice-dock">
      <button
        type="button"
        className={`voice-fab ${listening ? "listening" : ""}`}
        onClick={toggle}
        aria-pressed={listening}
      >
        {listening ? <Mic size={22} /> : <Volume2 size={22} />}
      </button>
      <div className="voice-status">
        <div>{status}{!online ? " · offline" : ""}</div>
        {lastHeard ? <div className="muted">{lastHeard}</div> : null}
      </div>
    </div>
  );
}

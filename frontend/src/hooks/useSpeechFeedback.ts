import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import {
  SPEECH_LANG_CODES,
  buildPriceSpeechText,
  hasLocalVoiceFor,
  normalizeSpeechLang,
  pickSpeechVoice,
  type PriceSpeechInput,
  type SpeechLang,
} from "../lib/speechLocale";

export interface SpeakOptions {
  lang?: SpeechLang;
  rate?: number;
  fallbackSrc?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface SpeakQueueItem {
  text: string;
  onStart?: () => void;
}

function readVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices();
}

export function useSpeechFeedback() {
  const app = useApp();
  const { i18n } = useTranslation();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => readVoices());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window,
    []
  );

  const lang = normalizeSpeechLang(app?.lang || i18n.language);

  useEffect(() => {
    if (!isSupported) return undefined;

    const refresh = () => setVoices(readVoices());
    refresh();
    window.speechSynthesis.addEventListener?.("voiceschanged", refresh);
    window.speechSynthesis.onvoiceschanged = refresh;

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", refresh);
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isSupported]);

  const hasMarathiVoice = useMemo(
    () => hasLocalVoiceFor(voices, "mr"),
    [voices]
  );

  const stopFallbackAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopFallbackAudio();
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, [isSupported, stopFallbackAudio]);

  const playFallback = useCallback(
    (src: string, callbacks?: Pick<SpeakOptions, "onStart" | "onEnd" | "onError">) => {
      stopFallbackAudio();
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
      const audio = new Audio(src);
      audioRef.current = audio;
      audio.onplay = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        callbacks?.onStart?.();
      };
      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
        callbacks?.onEnd?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        audioRef.current = null;
        callbacks?.onError?.();
      };
      void audio.play().catch(() => {
        callbacks?.onError?.();
      });
    },
    [isSupported, stopFallbackAudio]
  );

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const spokenLang = normalizeSpeechLang(options.lang || lang);
      const trimmed = text.trim();
      if (!trimmed) return;

      const needsMarathiFallback =
        spokenLang === "mr" && !hasMarathiVoice && Boolean(options.fallbackSrc);

      if (needsMarathiFallback && options.fallbackSrc) {
        playFallback(options.fallbackSrc, options);
        return;
      }

      if (!isSupported) {
        if (options.fallbackSrc) {
          playFallback(options.fallbackSrc, options);
          return;
        }
        options.onError?.();
        return;
      }

      stopFallbackAudio();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      const preferredLang: SpeechLang =
        spokenLang === "mr" && !hasMarathiVoice ? "hi" : spokenLang;
      utterance.lang = SPEECH_LANG_CODES[preferredLang];
      utterance.rate = options.rate ?? 0.88;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = pickSpeechVoice(voices, preferredLang);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        options.onStart?.();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        options.onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        if (spokenLang === "mr" && options.fallbackSrc) {
          playFallback(options.fallbackSrc, options);
          return;
        }
        options.onError?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [hasMarathiVoice, isSupported, lang, playFallback, stopFallbackAudio, voices]
  );

  const speakQueue = useCallback(
    (items: SpeakQueueItem[], options: SpeakOptions = {}) => {
      if (!items.length) return;
      if (!isSupported) {
        options.onError?.();
        return;
      }

      stopFallbackAudio();
      window.speechSynthesis.cancel();

      const spokenLang = normalizeSpeechLang(options.lang || lang);
      const preferredLang: SpeechLang =
        spokenLang === "mr" && !hasMarathiVoice ? "hi" : spokenLang;
      const voice = pickSpeechVoice(voices, preferredLang);

      items.forEach((item, index) => {
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.lang = SPEECH_LANG_CODES[preferredLang];
        utterance.rate = options.rate ?? 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          item.onStart?.();
        };
        utterance.onend = () => {
          if (index === items.length - 1) {
            setIsSpeaking(false);
            setIsPaused(false);
            options.onEnd?.();
          }
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          options.onError?.();
        };
        window.speechSynthesis.speak(utterance);
      });
    },
    [hasMarathiVoice, isSupported, lang, stopFallbackAudio, voices]
  );

  const speakPrice = useCallback(
    (input: Omit<PriceSpeechInput, "lang"> & { lang?: SpeechLang }) => {
      const spokenLang = normalizeSpeechLang(input.lang || lang);
      speak(
        buildPriceSpeechText({ ...input, lang: spokenLang }),
        { lang: spokenLang }
      );
    },
    [lang, speak]
  );

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
      return;
    }
    if (isSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      void audioRef.current.play();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }
    if (isSupported) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  }, [isSupported]);

  return {
    lang,
    bcp47: SPEECH_LANG_CODES[lang],
    isSupported,
    isSpeaking,
    isPaused,
    hasMarathiVoice,
    voices,
    speak,
    speakPrice,
    speakQueue,
    playFallback,
    pause,
    resume,
    stop,
  };
}

export { buildPriceSpeechText, SPEECH_LANG_CODES };

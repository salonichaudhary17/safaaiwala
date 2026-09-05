import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook providing localized Web Speech API TTS guidance.
 * Fallbacks gracefully if speech synthesis is unsupported on lower-end Android Go devices.
 */
export const useAudioGuidance = () => {
  const { i18n } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
    }
  }, []);

  const speak = useCallback((text) => {
    if (!isSupported || !text) return;

    // Cancel ongoing speech synthesis immediately
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map application language code to SpeechSynthesis BCP 47 language code
    const langMap = {
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN',
    };

    utterance.lang = langMap[i18n.language] || 'hi-IN';
    utterance.rate = 0.85; // Slightly slower speech rate for low-literacy comprehension
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [i18n.language, isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
};
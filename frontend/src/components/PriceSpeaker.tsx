import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useSpeechFeedback } from "../hooks/useSpeechFeedback";

interface PriceSpeakerProps {
  materialName: string;
  price?: number | null;
  unit?: string;
  weightKg?: number | null;
  estimatedValue?: number | null;
  autoSpeak?: boolean;
  autoSpeakKey?: string | number;
}

export default function PriceSpeaker({
  materialName,
  price = null,
  unit = "kg",
  weightKg = null,
  estimatedValue = null,
  autoSpeak = false,
  autoSpeakKey,
}: PriceSpeakerProps) {
  const { t } = useTranslation();
  const { isSupported, isSpeaking, speakPrice, stop } = useSpeechFeedback();
  const lastKeyRef = useRef<string | number | null>(null);

  const payload = {
    materialName,
    pricePerKg: price,
    weightKg,
    estimatedValue,
    unit,
  };

  useEffect(() => {
    return () => stop();
  }, [stop]);

  useEffect(() => {
    if (!autoSpeak || !isSupported) return;
    const key =
      autoSpeakKey ??
      `${materialName}|${price}|${weightKg}|${estimatedValue}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    speakPrice(payload);
  }, [
    autoSpeak,
    autoSpeakKey,
    estimatedValue,
    isSupported,
    materialName,
    price,
    speakPrice,
    weightKg,
  ]);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={() => speakPrice(payload)}
      aria-label={t("speakPrice")}
      disabled={isSpeaking}
    >
      {isSpeaking ? "🔊" : "🔈"} {t("listenPrice")}
    </button>
  );
}

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

interface PriceSpeakerProps {
  materialName: string;
  price: number;
  unit?: string;
}

const LANGUAGE_MAP: Record<
  string,
  string
> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

function formatPrice(
  price: number,
  language: string
) {
  const formatter =
    new Intl.NumberFormat(
      language === "hi"
        ? "hi-IN"
        : language === "mr"
        ? "mr-IN"
        : "en-IN",
      {
        maximumFractionDigits: 0,
      }
    );

  return formatter.format(
    price
  );
}

export default function PriceSpeaker({
  materialName,
  price,
  unit = "kg",
}: PriceSpeakerProps) {
  const { i18n, t } =
    useTranslation();

  const [speaking, setSpeaking] =
    useState(false);

  const supported =
    typeof window !==
      "undefined" &&
    "speechSynthesis" in
      window &&
    "SpeechSynthesisUtterance" in
      window;

  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supported]);

  const speak = useCallback(() => {
    if (
      !supported ||
      !Number.isFinite(price)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const language =
      i18n.language || "hi";

    const localizedPrice =
      formatPrice(
        price,
        language
      );

    let text: string;

    if (language === "hi") {
      text = `${materialName} का भाव ${localizedPrice} रुपये प्रति ${unit} है।`;
    } else if (
      language === "mr"
    ) {
      text = `${materialName} चा भाव ${localizedPrice} रुपये प्रति ${unit} आहे.`;
    } else {
      text = `${materialName} price is ${localizedPrice} rupees per ${unit}.`;
    }

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang =
      LANGUAGE_MAP[
        language
      ] || "hi-IN";

    utterance.rate = 0.82;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () =>
      setSpeaking(true);

    utterance.onend = () =>
      setSpeaking(false);

    utterance.onerror = () =>
      setSpeaking(false);

    window.speechSynthesis.speak(
      utterance
    );
  }, [
    i18n.language,
    materialName,
    price,
    supported,
    unit,
  ]);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={speak}
      aria-label={t(
        "speakPrice"
      )}
      disabled={speaking}
    >
      {speaking
        ? "🔊"
        : "🔈"}{" "}
      {t("listenPrice")}
    </button>
  );
}
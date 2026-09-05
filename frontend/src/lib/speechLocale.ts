export type SpeechLang = "en" | "hi" | "mr";

export const SPEECH_LANG_CODES: Record<SpeechLang, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

const HI_0_99 = [
  "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
  "बीस", "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस",
  "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस",
  "चालीस", "इकतालीस", "बयालीस", "तैंतालीस", "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास",
  "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ",
  "साठ", "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर",
  "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी",
  "अस्सी", "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सतासी", "अठासी", "नवासी",
  "नब्बे", "इक्यानबे", "बानबे", "तिरानबे", "चौरानबे", "पंचानबे", "छियानबे", "सत्तानबे", "अट्ठानबे", "निन्यानबे",
];

const MR_0_99 = [
  "शून्य", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ",
  "दहा", "अकरा", "बारा", "तेरा", "चौदा", "पंधरा", "सोळा", "सतरा", "अठरा", "एकोणीस",
  "वीस", "एकवीस", "बावीस", "तेवीस", "चोवीस", "पंचवीस", "सव्वीस", "सत्तावीस", "अठ्ठावीस", "एकोणतीस",
  "तीस", "एकतीस", "बत्तीस", "तेहेतीस", "चौतीस", "पस्तीस", "छत्तीस", "सदतीस", "अडतीस", "एकोणचाळीस",
  "चाळीस", "एकेचाळीस", "बेचाळीस", "त्रेचाळीस", "चव्वेचाळीस", "पंचेचाळीस", "सेहेचाळीस", "सत्तेचाळीस", "अठ्ठेचाळीस", "एकोणपन्नास",
  "पन्नास", "एकावन्न", "बावन्न", "त्रेपन्न", "चोपन्न", "पंचावन्न", "छप्पन्न", "सत्तावन्न", "अठ्ठावन्न", "एकोणसाठ",
  "साठ", "एकसष्ठ", "बासष्ठ", "त्रेसष्ठ", "चौसष्ठ", "पासष्ठ", "सहासष्ठ", "सत्तेसष्ठ", "अठ्ठेसष्ठ", "एकोणसत्तर",
  "सत्तर", "एकाहत्तर", "बाहत्तर", "त्र्याहत्तर", "चौऱ्याहत्तर", "पंच्याहत्तर", "शहात्तर", "सत्याहत्तर", "अठ्ठ्याहत्तर", "एकोणऐंशी",
  "ऐंशी", "एक्याऐंशी", "ब्याऐंशी", "त्र्याऐंशी", "चौऱ्याऐंशी", "पंच्याऐंशी", "शहाऐंशी", "सत्त्याऐंशी", "अठ्ठ्याऐंशी", "एकोणनव्वद",
  "नव्वद", "एक्याण्णव", "ब्याण्णव", "त्र्याण्णव", "चौऱ्याण्णव", "पंच्याण्णव", "शहाण्णव", "सत्त्याण्णव", "अठ्ठ्याण्णव", "नव्व्याण्णव",
];

const EN_0_19 = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];

const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function normalizeSpeechLang(lang: string | undefined | null): SpeechLang {
  if (lang?.startsWith("mr")) return "mr";
  if (lang?.startsWith("en")) return "en";
  return "hi";
}

export function toDevanagariDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => DEVANAGARI_DIGITS[Number(digit)]);
}

export function formatSpokenQuantity(value: number, lang: SpeechLang): string {
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
  if (lang === "en") return rounded;
  return toDevanagariDigits(rounded);
}

function underHundredEn(n: number): string {
  if (n < 20) return EN_0_19[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${EN_TENS[tens]} ${EN_0_19[ones]}` : EN_TENS[tens];
}

function underThousand(
  n: number,
  lang: SpeechLang,
  hundredWord: string
): string {
  if (n < 100) {
    if (lang === "en") return underHundredEn(n);
    return (lang === "mr" ? MR_0_99 : HI_0_99)[n];
  }
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredLabel =
    lang === "en"
      ? `${underHundredEn(hundreds)} ${hundredWord}`
      : `${(lang === "mr" ? MR_0_99 : HI_0_99)[hundreds]} ${hundredWord}`;
  if (!rest) return hundredLabel;
  const restLabel =
    lang === "en" ? underHundredEn(rest) : (lang === "mr" ? MR_0_99 : HI_0_99)[rest];
  return `${hundredLabel} ${restLabel}`;
}

export function numberToIndianWords(value: number, lang: SpeechLang): string {
  const n = Math.round(Math.abs(value));
  if (n === 0) {
    return lang === "en" ? "zero" : lang === "mr" ? "शून्य" : "शून्य";
  }

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];

  const labels =
    lang === "en"
      ? { crore: "crore", lakh: "lakh", thousand: "thousand", hundred: "hundred" }
      : lang === "mr"
        ? { crore: "कोटी", lakh: "लाख", thousand: "हजार", hundred: "शे" }
        : { crore: "करोड़", lakh: "लाख", thousand: "हजार", hundred: "सौ" };

  if (crore) parts.push(`${underThousand(crore, lang, labels.hundred)} ${labels.crore}`);
  if (lakh) parts.push(`${underThousand(lakh, lang, labels.hundred)} ${labels.lakh}`);
  if (thousand) parts.push(`${underThousand(thousand, lang, labels.hundred)} ${labels.thousand}`);
  if (rest) parts.push(underThousand(rest, lang, labels.hundred));

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export interface PriceSpeechInput {
  materialName: string;
  pricePerKg?: number | null;
  weightKg?: number | null;
  estimatedValue?: number | null;
  unit?: string;
  lang: SpeechLang;
}

export function buildPriceSpeechText({
  materialName,
  pricePerKg,
  weightKg,
  estimatedValue,
  unit = "kg",
  lang,
}: PriceSpeechInput): string {
  const name = materialName.trim() || (lang === "en" ? "scrap" : lang === "mr" ? "भंगार" : "कबाड़");
  const hasWeight = typeof weightKg === "number" && Number.isFinite(weightKg) && weightKg > 0;
  const hasEstimate =
    typeof estimatedValue === "number" && Number.isFinite(estimatedValue) && estimatedValue >= 0;
  const hasRate = typeof pricePerKg === "number" && Number.isFinite(pricePerKg);

  if (hasWeight && hasEstimate) {
    const qty = formatSpokenQuantity(weightKg, lang);
    const words = numberToIndianWords(estimatedValue, lang);
    if (lang === "hi") {
      return `${qty} किलो ${name}, अनुमानित मूल्य ${words} रुपये।`;
    }
    if (lang === "mr") {
      return `${qty} किलो ${name}, अंदाजे मूल्य ${words} रुपये.`;
    }
    return `${qty} kilograms ${name}, estimated value ${words} rupees.`;
  }

  if (hasRate) {
    const rate = numberToIndianWords(pricePerKg, lang);
    const unitLabel = unit === "kg" ? (lang === "en" ? "kilogram" : "किलो") : unit;
    if (lang === "hi") {
      return `${name} का भाव ${rate} रुपये प्रति ${unitLabel} है।`;
    }
    if (lang === "mr") {
      return `${name} चा भाव ${rate} रुपये प्रति ${unitLabel} आहे.`;
    }
    return `${name} price is ${rate} rupees per ${unitLabel}.`;
  }

  if (lang === "hi") return `${name} का भाव अभी उपलब्ध नहीं है।`;
  if (lang === "mr") return `${name} चा भाव सध्या उपलब्ध नाही.`;
  return `${name} price is not available right now.`;
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpeechLang
): SpeechSynthesisVoice | null {
  const bcp47 = SPEECH_LANG_CODES[lang].toLowerCase();
  const prefix = lang.toLowerCase();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === bcp47) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`)) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

export function hasLocalVoiceFor(
  voices: SpeechSynthesisVoice[],
  lang: SpeechLang
): boolean {
  return Boolean(pickSpeechVoice(voices, lang));
}

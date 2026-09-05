import i18n from "i18next";
import {
  initReactI18next,
} from "react-i18next";

import en from "./locales/en";
import hi from "./locales/hi";
import mr from "./locales/mr";

const LANGUAGE_KEY =
  "safaaiwala_language";

const storedLanguage =
  typeof window !==
  "undefined"
    ? window.localStorage.getItem(
        LANGUAGE_KEY
      )
    : null;

const initialLanguage =
  storedLanguage === "en" ||
  storedLanguage === "hi" ||
  storedLanguage === "mr"
    ? storedLanguage
    : "hi";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      hi,
      mr,
    },

    lng: initialLanguage,

    fallbackLng: "hi",

    supportedLngs: [
      "en",
      "hi",
      "mr",
    ],

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

i18n.on(
  "languageChanged",
  (language : string) => {
    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.setItem(
        LANGUAGE_KEY,
        language
      );
    }

    document.documentElement.lang =
      language === "hi"
        ? "hi-IN"
        : language === "mr"
        ? "mr-IN"
        : "en-IN";
  }
);

export default i18n;
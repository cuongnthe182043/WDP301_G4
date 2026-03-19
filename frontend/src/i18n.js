import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },

    fallbackLng: "vi",
    supportedLngs: ["vi", "en"],

    // Normalize "vi-VN" → "vi", "en-US" → "en"
    load: "languageOnly",

    // REQUIRED when using static (pre-loaded) resources — makes init synchronous
    initImmediate: false,

    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "dfs_lang",
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

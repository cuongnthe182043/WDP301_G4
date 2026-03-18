/**
 * LanguageContext — owns language as real React state.
 *
 * Why not rely on i18next events alone?
 * react-i18next v16 uses useSyncExternalStore internally. If the
 * snapshot function doesn't change between renders, React skips the
 * re-render even though changeLanguage() was called. Keeping a plain
 * useState here guarantees the switcher (and any component that reads
 * useLanguage()) always re-renders when the language changes.
 */
import React, { createContext, useContext, useState, useCallback } from "react";
import i18n from "../i18n";

const LanguageContext = createContext(null);

const SUPPORTED = ["vi", "en"];

function resolveInitial() {
  // 1. Previously saved choice
  const saved = localStorage.getItem("dfs_lang");
  if (saved && SUPPORTED.includes(saved)) return saved;
  // 2. Browser locale (normalize "vi-VN" → "vi")
  const browser = (navigator.language || "vi").split("-")[0].toLowerCase();
  return SUPPORTED.includes(browser) ? browser : "vi";
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(resolveInitial);

  const changeLanguage = useCallback((code) => {
    if (!SUPPORTED.includes(code) || code === lang) return;
    // 1. Update React state → triggers re-render of all useLanguage() consumers
    setLang(code);
    // 2. Persist choice
    localStorage.setItem("dfs_lang", code);
    // 3. Tell i18next → triggers re-render of all useTranslation() consumers
    i18n.changeLanguage(code);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
};

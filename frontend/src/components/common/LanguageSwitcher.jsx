import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

/* ── Inline flag SVGs (no extra deps) ─────────────────────── */
const FlagVN = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="16" rx="2.5" fill="#DA251D"/>
    <polygon
      points="11,2.8 12.3,7.1 16.7,7.1 13.1,9.7 14.4,14 11,11.4 7.6,14 8.9,9.7 5.3,7.1 9.7,7.1"
      fill="#FFFF00"
    />
  </svg>
);

const FlagEN = () => (
  <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="22" height="16" rx="2.5" fill="#012169"/>
    <path d="M0 0 L22 16 M22 0 L0 16" stroke="#fff" strokeWidth="3"/>
    <path d="M0 0 L22 16 M22 0 L0 16" stroke="#C8102E" strokeWidth="1.8"/>
    <path d="M11 0 V16 M0 8 H22" stroke="#fff" strokeWidth="5"/>
    <path d="M11 0 V16 M0 8 H22" stroke="#C8102E" strokeWidth="2.5"/>
  </svg>
);

const LANGS = [
  { code: "vi", label: "Tiếng Việt", Flag: FlagVN },
  { code: "en", label: "English",    Flag: FlagEN },
];

export default function LanguageSwitcher({ iconColor }) {
  const { lang, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isDark = theme === "dark";

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  const switchTo = (code) => {
    changeLanguage(code);
    setOpen(false);
  };

  /* ── Panel colors ───────────────────────────────────────── */
  const bg       = isDark ? "#18181b" : "#ffffff";
  const border   = isDark ? "#27272a" : "#e2e8f0";
  const shadow   = isDark
    ? "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)"
    : "0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.06)";
  const hoverBg  = isDark ? "#27272a" : "#f4f4f5";
  const activeBg = isDark ? "#3f3f46" : "#eff6ff";
  const textCol  = isDark ? "#f4f4f5" : "#09090b";
  const subCol   = isDark ? "#71717a" : "#94a3b8";

  return (
    <div className="relative">

      {/* ── Trigger button ─────────────────────────────────── */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-9 px-2 rounded-full outline-none focus:outline-none"
        style={{ color: iconColor }}
        title={t("language.label")}
      >
        <current.Flag />
        <span
          className="hidden sm:block text-xs font-bold leading-none"
          style={{ color: iconColor }}
        >
          {current.code.toUpperCase()}
        </span>
      </motion.button>

      {/* ── Dropdown ───────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: -6 }}
              animate={{ opacity: 1, scale: 1,    y:  0 }}
              exit={{    opacity: 0, scale: 0.93, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-12 z-50 w-48 rounded-2xl overflow-hidden"
              style={{
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: shadow,
                fontFamily: "'Quicksand', sans-serif",
              }}
            >
              {/* Header row */}
              <div className="px-3 py-2" style={{ borderBottom: `1px solid ${border}` }}>
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: subCol }}
                >
                  {t("language.label")}
                </p>
              </div>

              {/* Language options */}
              {LANGS.map(({ code, label, Flag }) => {
                const isActive = lang === code;
                return (
                  <button
                    key={code}
                    onClick={() => switchTo(code)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                    style={{
                      background: isActive ? activeBg : "transparent",
                      color: textCol,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = hoverBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isActive ? activeBg : "transparent";
                    }}
                  >
                    <Flag />
                    <span className="text-sm font-semibold flex-1">{label}</span>
                    {isActive && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: "#3b82f6" }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

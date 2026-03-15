import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, SunMedium } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeSettingsPanel({ iconColor }) {
  const { theme, toggleTheme, brightness, setBrightness } = useTheme();
  const [open, setOpen] = useState(false);
  const isDark = theme === "dark";

  /* zinc-900 panel in dark, white panel in light */
  const panelBg     = isDark ? "#18181b" : "#ffffff";
  const panelBorder = isDark ? "#27272a" : "#e2e8f0";
  const panelShadow = isDark
    ? "0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)"
    : "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)";
  const labelColor  = isDark ? "#71717a" : "#94a3b8";
  const trackBg     = isDark ? "#09090b" : "#f4f4f5";
  const textPrimary = isDark ? "#f4f4f5" : "#09090b";
  const textSecond  = isDark ? "#a1a1aa" : "#71717a";
  const accentBlue  = isDark ? "#60a5fa" : "#3b82f6";
  const activeBtn   = isDark
    ? { background: "#3b82f6", color: "#ffffff" }
    : { background: "#2563eb", color: "#ffffff" };
  const inactiveBtn = { color: isDark ? "#52525b" : "#a1a1aa" };

  return (
    <div className="relative">
      {/* Trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-full outline-none focus:outline-none"
        style={{ color: iconColor }}
        title="Giao diện"
      >
        <div
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={open ? { background: "rgba(255,255,255,0.18)" } : {}}
        >
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
        </div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-12 z-50 w-60 rounded-2xl p-4"
              style={{
                background: panelBg,
                border: `1px solid ${panelBorder}`,
                boxShadow: panelShadow,
                fontFamily: "'Quicksand', sans-serif",
              }}
            >
              {/* Title */}
              <p
                className="text-[10px] font-black uppercase tracking-widest mb-3"
                style={{ color: labelColor }}
              >
                Giao diện
              </p>

              {/* Light / Dark toggle */}
              <div
                className="flex rounded-xl p-1 mb-4"
                style={{ background: trackBg }}
              >
                {[
                  { key: "light", Icon: Sun,  label: "Sáng" },
                  { key: "dark",  Icon: Moon, label: "Tối"  },
                ].map(({ key, Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => key !== theme && toggleTheme()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                    style={theme === key ? activeBtn : inactiveBtn}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <SunMedium size={13} style={{ color: accentBlue }} />
                    <span className="text-xs font-semibold" style={{ color: textPrimary }}>
                      Độ sáng
                    </span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: accentBlue }}>
                    {brightness}%
                  </span>
                </div>

                <input
                  type="range"
                  min={20}
                  max={100}
                  step={5}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${accentBlue} ${brightness}%, ${panelBorder} ${brightness}%)`,
                    accentColor: accentBlue,
                  }}
                />

                <div
                  className="flex justify-between text-[10px] font-medium mt-1.5"
                  style={{ color: textSecond }}
                >
                  <span>Tối</span>
                  <span>Sáng nhất</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

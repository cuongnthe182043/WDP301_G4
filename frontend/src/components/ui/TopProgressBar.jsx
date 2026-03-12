import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * NProgress-style top progress bar that fires on every route change.
 * Pure CSS animation — no framer-motion dependency for the bar itself
 * so it stays extremely lightweight.
 */
export default function TopProgressBar() {
  const location  = useLocation();
  const [visible, setVisible]   = useState(false);
  const [width,   setWidth]     = useState(0);
  const [fading,  setFading]    = useState(false);
  const timerRef  = useRef(null);
  const prevPath  = useRef(location.pathname + location.search);

  const clear = () => {
    clearTimeout(timerRef.current);
  };

  const start = () => {
    clear();
    setFading(false);
    setWidth(0);
    setVisible(true);

    // Ramp width quickly then stall just before 100%
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWidth(30);
        timerRef.current = setTimeout(() => setWidth(65), 120);
        timerRef.current = setTimeout(() => setWidth(85), 500);
        timerRef.current = setTimeout(() => setWidth(92), 1400);
      });
    });
  };

  const finish = () => {
    clear();
    setWidth(100);
    timerRef.current = setTimeout(() => {
      setFading(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setWidth(0);
        setFading(false);
      }, 380);
    }, 160);
  };

  useEffect(() => {
    const next = location.pathname + location.search;
    if (next !== prevPath.current) {
      prevPath.current = next;
      start();
      // Complete quickly — React routes are synchronous once chunk is loaded
      timerRef.current = setTimeout(finish, 350);
    }
    return clear;
  }, [location]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        pointerEvents: "none",
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.35s ease" : "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${width}%`,
          background: "linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #60a5fa 100%)",
          boxShadow: "0 0 10px rgba(59,130,246,0.6), 0 0 4px rgba(37,99,235,0.4)",
          borderRadius: "0 3px 3px 0",
          transition: width === 100
            ? "width 0.18s ease"
            : "width 0.45s cubic-bezier(0.1, 0.5, 0.5, 1)",
        }}
      />
      {/* Leading glow dot */}
      <div
        style={{
          position: "absolute",
          right: `calc(${100 - width}% - 1px)`,
          top: "50%",
          transform: "translateY(-50%)",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#60a5fa",
          boxShadow: "0 0 8px 2px rgba(96,165,250,0.8)",
          transition: "right 0.45s cubic-bezier(0.1, 0.5, 0.5, 1)",
        }}
      />
    </div>
  );
}

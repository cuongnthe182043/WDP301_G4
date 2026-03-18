import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dfsLogo from "../../assets/icons/DFS-NonBG1.png";

/**
 * Full-screen animated loader shown while AuthContext initialises.
 * Fades out smoothly once `ready` becomes true.
 */
export default function AppLoader({ ready = false }) {
  // Keep the DOM node alive long enough for the exit animation to finish
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setMounted(false), 600);
      return () => clearTimeout(t);
    }
  }, [ready]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {!ready && (
        <motion.div
          key="app-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: "easeInOut" } }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(160deg, #f0f6ff 0%, #e8f0fe 50%, #f5f8ff 100%)",
          }}
        >
          {/* Soft ambient blobs */}
          <div style={{
            position: "absolute", width: 480, height: 480,
            borderRadius: "50%", top: "-120px", left: "-120px",
            background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", width: 360, height: 360,
            borderRadius: "50%", bottom: "-80px", right: "-80px",
            background: "radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Spinner + logo stack */}
          <div style={{ position: "relative", width: 100, height: 100, marginBottom: 28 }}>

            {/* Outer slow-spin gradient ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "conic-gradient(from 0deg, transparent 60%, #2563eb 100%)",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)",
              }}
            />

            {/* Inner fast-spin accent ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute", inset: 8, borderRadius: "50%",
                background: "conic-gradient(from 180deg, transparent 50%, #60a5fa 100%)",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 0)",
                opacity: 0.7,
              }}
            />

            {/* Pulsing glow behind logo */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 18, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(37,99,235,0.25), transparent 70%)",
              }}
            />

            {/* Logo */}
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute", inset: 18, borderRadius: "50%",
                overflow: "hidden", background: "#fff",
                boxShadow: "0 4px 20px rgba(29,78,216,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <img
                src={dfsLogo}
                alt="Daily Fit"
                style={{ width: "75%", height: "75%", objectFit: "contain" }}
              />
            </motion.div>
          </div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: "center" }}
          >
            <p style={{
              fontFamily: "'Baloo 2', cursive",
              fontWeight: 800,
              fontSize: 22,
              color: "#1e3a8a",
              letterSpacing: "-0.02em",
              margin: 0,
            }}>
              Daily Fit
            </p>
            <p style={{
              fontFamily: "'Quicksand', sans-serif",
              fontWeight: 600,
              fontSize: 12,
              color: "#93c5fd",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: "3px 0 0",
            }}>
              Smart Fashion
            </p>
          </motion.div>

          {/* Dot pulse row */}
          <div style={{ display: "flex", gap: 7, marginTop: 28 }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -7, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

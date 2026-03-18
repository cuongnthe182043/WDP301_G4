import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [brightness, setBrightness] = useState(() => {
    const saved = Number(localStorage.getItem("brightness"));
    return saved >= 20 && saved <= 100 ? saved : 100;
  });

  // Apply/remove "dark" class on <html>
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Apply brightness filter to #root
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      root.style.filter = brightness < 100 ? `brightness(${brightness / 100})` : "";
    }
    localStorage.setItem("brightness", String(brightness));
  }, [brightness]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, brightness, setBrightness }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

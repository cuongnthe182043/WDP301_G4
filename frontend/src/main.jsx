import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n"; // must be imported before App so translations are ready

import { HeroUIProvider } from "@heroui/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./components/common/ToastProvider";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";

/* ── Global font import for the entire app ── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Baloo+2:wght@400;500;600;700;800&display=swap";
document.head.appendChild(fontLink);

const globalStyle = document.createElement("style");
globalStyle.id = "dfs-global-fonts";
globalStyle.textContent = `
  *, *::before, *::after {
    font-family: 'Quicksand', 'Segoe UI', system-ui, sans-serif !important;
  }
  .font-display, h1, h2, h3, h4, h5, h6, .syne {
    font-family: 'Baloo 2', cursive !important;
  }
`;
document.head.appendChild(globalStyle);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
      <HeroUIProvider>
        <ToastProvider>
          <BrowserRouter>
            <AuthProvider>
              <CartProvider>
                <NotificationProvider>
                  <App />
                </NotificationProvider>
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </HeroUIProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
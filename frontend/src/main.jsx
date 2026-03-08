import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { HeroUIProvider } from "@heroui/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/common/ToastProvider";

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
    <HeroUIProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </HeroUIProvider>
  </React.StrictMode>
);
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import QueryProvider from "./providers/QueryProvider";
import { TelegramProvider } from "./providers/TelegramProvider";
import { SoundProvider } from "./contexts/SoundContext";

// --- Development Tools ---

// 1. Telegram Mock (dev mode only, when not in Telegram)
if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
  import("./dev-mock-telegram").then(() => {
    console.log("🔧 Telegram WebApp Mock loaded for development");
  });
}

// 2. eruda Debug Console (via ?debug=1 query param or localStorage)
const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.get("debug") === "1" || localStorage.getItem("debug") === "1";
if (debugMode) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/eruda";
  script.onload = () => {
    (window as any).eruda?.init();
    console.log("🐛 eruda debug console initialized");
  };
  document.body.appendChild(script);
  // Persist debug mode
  localStorage.setItem("debug", "1");
}

// --- End Development Tools ---

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element with id 'root' not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <TelegramProvider>
          <SoundProvider>
            <App />
          </SoundProvider>
        </TelegramProvider>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);

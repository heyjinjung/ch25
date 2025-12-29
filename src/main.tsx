// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import QueryProvider from "./providers/QueryProvider";
import { TelegramProvider } from "./providers/TelegramProvider";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element with id 'root' not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <TelegramProvider>
          <App />
        </TelegramProvider>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);

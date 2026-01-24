import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import QueryProvider from "./providers/QueryProvider";
import { TelegramProvider } from "./providers/TelegramProvider";
import { SoundProvider } from "./contexts/SoundContext";
import { ThemeProvider } from "./v2/contexts/ThemeContext";
import "./v2/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <TelegramProvider>
          <SoundProvider>
            <ThemeProvider>
              <AppRouter />
            </ThemeProvider>
          </SoundProvider>
        </TelegramProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

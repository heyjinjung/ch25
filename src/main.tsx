import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "./router/AppRouter";
import QueryProvider from "./providers/QueryProvider";
import { TelegramProvider } from "./providers/TelegramProvider";
import "./v2/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <TelegramProvider>
          <AppRouter />
        </TelegramProvider>
      </QueryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

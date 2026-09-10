import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppContent from "./App";
import { I18nProvider } from "./i18n"; // поправь путь под своё расположение
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  </BrowserRouter>
);
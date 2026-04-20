import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[sw] registration failed", err);
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster position="bottom-right" theme="dark" richColors />
  </React.StrictMode>,
);

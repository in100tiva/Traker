import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Desregistra qualquer Service Worker antigo e limpa todos os caches.
// Um SW anterior fazia cache-first do /index.html, o que prendia usuários
// em builds antigos após deploy. Aqui garantimos que ninguém fica travado.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister().catch(() => {});
    }
  });
  if ("caches" in window) {
    caches.keys().then((keys) => {
      for (const k of keys) {
        caches.delete(k).catch(() => {});
      }
    });
  }
}

function ThemedToaster() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return (
    <Toaster
      position="bottom-right"
      theme={dark ? "dark" : "light"}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <ThemedToaster />
  </React.StrictMode>,
);

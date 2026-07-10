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
  // Mobile: toasts no topo (não brigam com a bottom nav nem com o teclado);
  // desktop: canto inferior direito, como antes.
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 759px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 759px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <Toaster
      position={isMobile ? "top-center" : "bottom-right"}
      theme="dark"
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

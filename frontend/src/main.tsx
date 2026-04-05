import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRouter, AuthProvider } from "./core";
import "./index.css";

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: app should still work without offline caching.
      });
    });
  } else {
    // In dev, stale SW caches can hide fresh UI updates.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });

    if ("caches" in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          void caches.delete(cacheName);
        });
      });
    }
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

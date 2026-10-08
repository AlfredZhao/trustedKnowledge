import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "katex/dist/katex.min.css";
import "./styles.css";
import { SLIDES_QUERY_KEY } from "./utils/markdownSlidesSession";
import { MarkdownSlidesBoundary } from "./components/MarkdownSlidesBoundary";

const MarkdownSlideWindow = React.lazy(() => import("./components/MarkdownSlideWindow"));

const UI_STATE_STORAGE_KEY = "trustedKnowledge.uiState.v2";

function BootScrollLock() {
  React.useEffect(() => {
    document.body.classList.remove("app-booting");
  }, []);

  return null;
}

try {
  const rawUiState = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
  if (rawUiState) {
    const parsedUiState = JSON.parse(rawUiState) as { themeMode?: unknown };
    const storedTheme = parsedUiState.themeMode;
    if (storedTheme === "light" || storedTheme === "dark") {
      document.documentElement.dataset.theme = storedTheme;
      document.documentElement.style.colorScheme = storedTheme;

      const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", storedTheme === "light" ? "#f4f7f9" : "#0f766e");
      }
    }
  }
} catch {
  // Ignore storage parse failures and fall back to the default dark theme.
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app remains usable without the PWA cache layer.
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BootScrollLock />
    {new URLSearchParams(window.location.search).has(SLIDES_QUERY_KEY)
      ? <MarkdownSlidesBoundary onClose={() => { window.location.replace(window.location.pathname); }}><React.Suspense fallback={<div className="slide-screen slide-status" role="status">正在加载幻灯片…</div>}><MarkdownSlideWindow /></React.Suspense></MarkdownSlidesBoundary>
      : <App />}
  </React.StrictMode>,
);

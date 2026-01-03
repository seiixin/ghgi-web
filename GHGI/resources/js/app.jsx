import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";

const appName = import.meta.env.VITE_APP_NAME || "Laravel";

// ---- Click Debugger (dev only) ----
// If buttons are "hoverable but not clickable", this will reveal the actual top element receiving clicks.
if (import.meta.env.DEV) {
  window.__GHGI_CLICK_DEBUG__ = window.__GHGI_CLICK_DEBUG__ ?? true;

  document.addEventListener(
    "click",
    (e) => {
      if (!window.__GHGI_CLICK_DEBUG__) return;
      const x = e.clientX;
      const y = e.clientY;
      const stack = document.elementsFromPoint(x, y).slice(0, 6);
      // eslint-disable-next-line no-console
      console.log("[GHGI click]", { x, y, target: e.target, stack });
    },
    true
  );
}

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) =>
    resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob("./Pages/**/*.jsx")),
  setup({ el, App, props }) {
    const root = createRoot(el);
    root.render(<App {...props} />);
  },
  progress: {
    color: "#4B5563",
  },
});

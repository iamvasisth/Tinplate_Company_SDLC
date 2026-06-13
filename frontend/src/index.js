import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles.css';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";


/**
 * index.js – Entry point with aggressive ResizeObserver loop suppression
 * The ResizeObserver loop error is a Chrome bug and does not affect our app.
 */

// ===== SUPPRESSION LAYER (runs before anything else) =====
(() => {
  // 1. Patch ResizeObserver to defer callbacks via requestAnimationFrame
  const NativeRO = window.ResizeObserver;
  window.ResizeObserver = class PatchedRO extends NativeRO {
    constructor(callback) {
      super((entries, observer) => {
        try {
          requestAnimationFrame(() => callback(entries, observer));
        } catch (e) {
          if (!e.message?.includes("ResizeObserver loop")) {
            console.error(e);
          }
        }
      });
    }
  };

  // 2. Capture-phase error listener (fires BEFORE React's overlay)
  window.addEventListener("error", (e) => {
    if (e.message?.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);  // ← CAPTURE phase (critical)

  // 3. Also block it as an unhandled rejection
  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason?.message?.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  // 4. Patch console.error to filter the annoying message
  const originalConsoleError = console.error;
  console.error = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes("ResizeObserver loop")) {
      return;  // swallow it completely
    }
    originalConsoleError.apply(console, args);
  };
})();
// ===== END OF SUPPRESSION =====

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
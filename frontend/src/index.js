import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles.css';

import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from "./AuthContext";

/**
 * index.js – Entry point with bulletproof ResizeObserver loop suppression
 * The ResizeObserver loop error is a known Chrome bug and does not affect our app.
 */

// ------ Suppression layer (BEFORE anything else) ------
(() => {
  // 1. Patch ResizeObserver to wrap callbacks in a try/catch that swallows the loop error.
  const NativeResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class PatchedResizeObserver extends NativeResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        try {
          requestAnimationFrame(() => callback(entries, observer));
        } catch (e) {
          if (!e.message?.includes("ResizeObserver loop")) {
            console.error(e);   // only log other errors
          }
        }
      });
    }
  };

  // 2. Prevent the error from being fired as an `error` event on the window.
  window.addEventListener("error", (e) => {
    if (e.message?.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  // 3. Also catch it if it somehow escapes as an unhandledrejection (paranoid safety).
  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason?.message?.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
})();
// ------ End of suppression layer ------

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
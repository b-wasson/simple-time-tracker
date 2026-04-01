import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

function mount() {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Wait for Tauri to inject __TAURI_INTERNALS__ before mounting React.
// In a real Tauri webview this is synchronous, but polling guards against
// any race condition on slower machines.
function waitForTauri(retries = 20) {
  if ((window as any).__TAURI_INTERNALS__) {
    mount();
  } else if (retries > 0) {
    setTimeout(() => waitForTauri(retries - 1), 50);
  } else {
    // Bridge never appeared — mount anyway so the error screen shows
    console.warn("Tauri bridge not detected after 1s. Are you running via `npm run tauri dev`?");
    mount();
  }
}

waitForTauri();
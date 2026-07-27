import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { register as registerServiceWorker } from "./serviceWorkerRegistration";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>
);

// Register the Service Worker.
// The portable build is a single html file with no `service-worker.js` next to it.
if (import.meta.env.MODE !== "portable") {
    registerServiceWorker();
}
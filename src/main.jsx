import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
// Make sure to import your ProductPage component here
import ProductPage from "./ProductPage.jsx"; 
import { register as registerServiceWorker } from "./serviceWorkerRegistration";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                {/* If path is /, show App */}
                <Route path="/" element={<App />} />
                
                {/* If path is /info, show ProductPage */}
                <Route path="/info" element={<ProductPage />} />
                
                {/* If path is /, show App */}
                <Route path="/circuitpython-online-ide-2/" element={<App />} />
                
                {/* If path is /info, show ProductPage */}
                <Route path="/circuitpython-online-ide-2/info" element={<ProductPage />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);

// Register the Service Worker
registerServiceWorker();
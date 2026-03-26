import React from "react";
import ReactDOM from "react-dom/client";
import { AiOverlayApp } from "./components/ai-overlay/AiOverlayApp";
import "./styles/glassmorphism.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AiOverlayApp />
  </React.StrictMode>
);

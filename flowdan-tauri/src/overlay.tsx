import React from "react";
import ReactDOM from "react-dom/client";
import { OverlayApp } from "./components/overlay/OverlayApp";
import "./styles/glassmorphism.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>
);

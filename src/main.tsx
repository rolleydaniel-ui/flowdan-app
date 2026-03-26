import React from "react";
import ReactDOM from "react-dom/client";
import { DashboardApp } from "./components/dashboard/DashboardApp";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const el = document.getElementById("root");
if (!el) {
  throw new Error("找不到根節點：#root。請檢查 public/index.html。");
}

const root = ReactDOM.createRoot(el);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.jsx";
import Complete from "./pages/complete.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="" element={<App />} />
      <Route path="/complete" element={<Complete />} />/
    </Routes>
  </BrowserRouter>
);

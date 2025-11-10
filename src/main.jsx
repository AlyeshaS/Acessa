import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.jsx";
import Search_page from "./pages/Search_page.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="" element={<App />} />
      {/* <Route path="/search" element={<Search_page />} />/ */}
    </Routes>
  </BrowserRouter>
);

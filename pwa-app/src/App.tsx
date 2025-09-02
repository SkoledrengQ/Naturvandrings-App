// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { HeaderProvider } from "./contexts/HeaderContext";
import Header from "./components/Header";

// Pages
import Home from "./pages/Home";
import RoutesList from "./pages/RoutesList";
import RouteDetail from "./pages/RouteDetail";
import RouteRun from "./pages/RouteRun";

export default function App() {
  return (
    <HeaderProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/routes" element={<RoutesList />} />
        <Route path="/routes/:id" element={<RouteDetail />} />
        <Route path="/routes/:id/run" element={<RouteRun />} />
      </Routes>
    </HeaderProvider>
  );
}

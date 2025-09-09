import { Routes, Route } from "react-router-dom";
import { HeaderProvider } from "./contexts/HeaderContext";
import Header from "./components/Header";
import Home from "./pages/Home";
import RoutesList from "./pages/RoutesList";
import RouteDetail from "./pages/RouteDetail";
import RouteRun from "./pages/RouteRun";
import "./styles/ui.css";

export default function App() {
  return (
    <HeaderProvider>
      <Header />

      {/* Spacer der altid skubber indhold under den fixed header */}
      <div id="header-spacer" style={{ height: "var(--headerH, 76px)" }} />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routes" element={<RoutesList />} />
          <Route path="/routes/:id" element={<RouteDetail />} />
          <Route path="/routes/:id/run" element={<RouteRun />} />
        </Routes>
      </main>
    </HeaderProvider>
  );
}

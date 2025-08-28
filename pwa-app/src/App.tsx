import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import RoutesList from "./pages/RoutesList";
import RouteDetail from "./pages/RouteDetail";
import RouteRun from "./pages/RouteRun";

export default function App() {
  return (
    <div>
      <header>
        <nav>
          <Link to="/">Forside</Link> |{" "}
          <Link to="/routes">Ruter</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routes" element={<RoutesList />} />
          <Route path="/routes/:id" element={<RouteDetail />} />
          <Route path="/routes/:id/run" element={<RouteRun />} />
        </Routes>
      </main>
    </div>
  );
}
 
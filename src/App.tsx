import React from "react";
import { Home } from "./pages/Home.js";
import { Dashboard } from "./pages/Dashboard.js";

export function App() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  if (path === "/app" || path.startsWith("/app/")) {
    return <Dashboard />;
  }

  return <Home />;
}

export default App;

import { useState, useEffect } from "react";
import Home from "./pages/Home";
import PredefinedPage from "./pages/Predefined";

function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route.startsWith("#/predefined") || route.startsWith("#predefined")) {
    return <PredefinedPage />;
  }

  return <Home />;
}

export default App;

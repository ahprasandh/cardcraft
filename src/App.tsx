import { useState, useEffect } from "react";
import Home from "./pages/Home";
import PredefinedPage from "./pages/Predefined";
import Render from "./pages/Render";
import Gallery from "./pages/Gallery";

function App() {
  const [route, setRoute] = useState(window.location.hash || "#/");

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || "#/");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route.startsWith("#/gallery") || route.startsWith("#gallery")) {
    return <Gallery />;
  }

  if (route.startsWith("#/render") || route.startsWith("#render")) {
    return <Render />;
  }

  if (route.startsWith("#/predefined") || route.startsWith("#predefined")) {
    return <PredefinedPage />;
  }

  return <Home />;
}

export default App;

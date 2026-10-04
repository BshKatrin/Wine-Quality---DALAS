import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ReleaseStore } from "./data/release";

const bootstrap = document.getElementById("wine-bootstrap");
const initial = bootstrap ? JSON.parse(bootstrap.textContent!) : null;
const initialRelease = initial
  ? ReleaseStore.fromPreview(initial.manifest, initial.preview)
  : null;
const app = (
  <StrictMode>
    <App initialRelease={initialRelease} />
  </StrictMode>
);
const root = document.getElementById("root")!;
if (initialRelease) hydrateRoot(root, app);
else createRoot(root).render(app);

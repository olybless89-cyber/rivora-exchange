import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Vite bakes this in at build time -- must be set in Vercel's Environment
// Variables (Production scope) AND the project redeployed (without build
// cache) after setting it, or every API call silently falls back to a
// relative path against Vercel's own domain, which has no backend.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) setBaseUrl(apiBase);

createRoot(document.getElementById("root")!).render(<App />);

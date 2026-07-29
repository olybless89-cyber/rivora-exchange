import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Vite bakes this in at build time -- must be set in Vercel's Environment
// Variables (Production scope) AND the project redeployed (without build
// cache) after setting it, or every API call silently falls back to a
// relative path against Vercel's own domain, which has no backend.
//
// VITE_API_BASE_URL should just be the bare backend origin (e.g.
// "https://rivora-exchange.onrender.com"), NOT including "/api". The
// openapi spec declares `servers: - url: /api` and every generated request
// path is relative to that (e.g. "/auth/register" really means
// "/api/auth/register" on the real server, since app.ts mounts the whole
// router under app.use("/api", router)). orval's fetch client does not
// auto-prepend the servers url, so we append "/api" here once, in code --
// that way the env var can never be pasted in a way that breaks routing.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
if (apiBase) setBaseUrl(`${apiBase.replace(/\/+$/, "")}/api`);

createRoot(document.getElementById("root")!).render(<App />);

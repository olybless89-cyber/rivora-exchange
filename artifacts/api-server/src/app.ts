import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
// pino-http >= v8 exports its factory as a NAMED export (not default) --
// `import pinoHttp from "pino-http"` type-resolves to the whole module
// namespace under NodeNext moduleResolution, which isn't callable.
import { pinoHttp } from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin: [
      /\.vercel\.app$/,
      /\.onrender\.com$/,
      /localhost/,
      "https://rivoraexchange.com",
      "https://www.rivoraexchange.com",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", router);

// Global error handler -- exposes underlying DB/runtime errors in response
// so failures are diagnosable from the client/logs instead of a bare 500.
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // req.log is injected by pino-http at runtime; cast to access it
  (req as any).log?.error?.({ err }, "Unhandled error");
  res.status(500).json({ error: err?.message ?? "Internal Server Error" });
});

export default app;

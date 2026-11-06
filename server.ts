/**
 * Local development (and self-hosting) server: the same API router Vercel
 * runs, plus Vite in dev or the built client in production.
 */
import express from "express";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { handle } = await import("./lib/server/router.js");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use("/api", express.json({ limit: "6mb" }));
app.all("/api/*", (req, res) => handle(req as any, res as any));
app.all("/api", (req, res) => handle(req as any, res as any));

if (process.env.NODE_ENV !== "production" && !process.argv.includes("--production")) {
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
} else {
  const dist = path.join(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, "0.0.0.0", () => console.log(`Project Cupid on http://localhost:${PORT}`));

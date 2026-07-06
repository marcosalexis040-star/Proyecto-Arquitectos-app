import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import specRoutes from "./routes/spec.routes.js";
import { getProvider } from "./services/provider.js";

// __dirname no existe en ES modules; se deriva de import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Frontend estático (public/index.html se sirve en la raíz "/")
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => {
  const provider = getProvider();
  res.json({
    status: "ok",
    service: "prompt-to-spec-backend",
    mockMode: provider === "mock",
    provider,
  });
});

app.use("/api", specRoutes);

// 404 para rutas no definidas
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Ruta no encontrada." });
});

// Manejador de errores global (JSON malformado, errores no capturados)
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, error: "El cuerpo de la petición no es JSON válido." });
  }
  console.error("[app] Error no manejado:", err);
  res.status(500).json({ success: false, error: "Error interno del servidor." });
});

export default app;

import express from "express";
import cors from "cors";
import specRoutes from "./routes/spec.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "prompt-to-spec-backend",
    mockMode: process.env.MOCK_CLAUDE !== "false" || !process.env.ANTHROPIC_API_KEY,
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

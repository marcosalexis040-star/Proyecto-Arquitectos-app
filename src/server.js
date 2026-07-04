import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const mockMode = process.env.MOCK_CLAUDE !== "false" || !process.env.ANTHROPIC_API_KEY;
  console.log(`🏛️  Prompt-to-Spec backend escuchando en http://localhost:${PORT}`);
  console.log(`    Modo Claude: ${mockMode ? "SIMULADO (mock)" : "REAL (API de Anthropic)"}`);
  console.log(`    Endpoint:    POST http://localhost:${PORT}/api/generate-spec`);
});

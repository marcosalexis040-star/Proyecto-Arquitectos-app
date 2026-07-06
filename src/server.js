import "dotenv/config";
import app from "./app.js";
import { getProvider } from "./services/provider.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const provider = getProvider();
  const label = provider === "mock" ? "SIMULADO (mock)" : provider.toUpperCase();
  console.log(`🏛️  Prompt-to-Spec backend escuchando en http://localhost:${PORT}`);
  console.log(`    Proveedor IA: ${label}`);
  console.log(`    Endpoint:    POST http://localhost:${PORT}/api/generate-spec`);
});

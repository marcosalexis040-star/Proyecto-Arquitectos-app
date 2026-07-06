/**
 * Decide qué proveedor de IA usa /api/generate-spec.
 *
 * Prioridad: AI_PROVIDER explícito > OPENROUTER_API_KEY > ANTHROPIC_API_KEY > mock.
 * Con MOCK_CLAUDE=true (o sin ninguna key configurada) siempre se usa el mock,
 * sin importar qué keys existan, para que la demo nunca consuma crédito por accidente.
 */
export function getProvider() {
  const explicit = process.env.AI_PROVIDER;
  if (explicit === "anthropic" || explicit === "openrouter" || explicit === "mock") {
    return explicit;
  }

  if (process.env.MOCK_CLAUDE === "false") {
    if (process.env.OPENROUTER_API_KEY) return "openrouter";
    if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  }

  return "mock";
}

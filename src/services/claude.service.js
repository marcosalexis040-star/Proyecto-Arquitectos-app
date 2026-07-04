import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompts/system-prompt.js";

const MODEL = "claude-opus-4-8";

// Lee ANTHROPIC_API_KEY del entorno automáticamente.
const client = new Anthropic();

/**
 * Genera la especificación técnica llamando a la API de Claude.
 * Usa streaming + finalMessage() para evitar timeouts HTTP en documentos largos.
 *
 * @param {string} description Descripción casual del espacio arquitectónico.
 * @returns {Promise<{spec: string, model: string, usage: object}>}
 */
export async function generateSpecWithClaude(description) {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // El cache se activa cuando el prefijo supere el mínimo del modelo
        // (4096 tokens en Opus 4.8); dejarlo listo no tiene costo si no aplica.
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Descripción del espacio a especificar:\n\n"${description}"`,
      },
    ],
  });

  const message = await stream.finalMessage();

  const spec = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return { spec, model: message.model, usage: message.usage };
}

/**
 * Traduce errores del SDK de Anthropic a un shape manejable por el controlador.
 * Devuelve { status, message } o null si no es un error de la API.
 */
export function mapAnthropicError(error) {
  if (error instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: "ANTHROPIC_API_KEY inválida o ausente en el servidor." };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 503, message: "Límite de peticiones a Claude alcanzado. Intenta de nuevo en unos segundos." };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return { status: 502, message: "No se pudo conectar con la API de Claude." };
  }
  if (error instanceof Anthropic.APIError) {
    return { status: 502, message: `Error de la API de Claude (${error.status}).` };
  }
  return null;
}

import { SYSTEM_PROMPT } from "../prompts/system-prompt.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Slug estable y ampliamente disponible en OpenRouter. Si quieres un modelo
// distinto (p. ej. una versión más nueva de Claude), define OPENROUTER_MODEL
// con el "id" exacto que aparece en https://openrouter.ai/models — no lo
// adivines, un slug incorrecto responde 400.
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Genera la especificación técnica llamando a Claude a través de OpenRouter
 * (API compatible con el formato de OpenAI Chat Completions).
 *
 * @param {string} description Descripción casual del espacio arquitectónico.
 * @returns {Promise<{spec: string, model: string, usage: object|null}>}
 */
export async function generateSpecWithOpenRouter(description) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY no está configurada.");
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Encabezados recomendados por OpenRouter para identificar la app
        // en su leaderboard; no son obligatorios para que la petición funcione.
        "HTTP-Referer": "https://prompt-to-spec-pro.onrender.com",
        "X-Title": "Prompt-to-Spec Pro",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Descripción del espacio a especificar:\n\n"${description}"`,
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(`OpenRouter respondió HTTP ${response.status}: ${bodyText.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const spec = payload.choices?.[0]?.message?.content;

  if (!spec) {
    throw new Error("OpenRouter no devolvió contenido en la respuesta.");
  }

  return { spec, model: payload.model || model, usage: payload.usage ?? null };
}

/**
 * Traduce errores de la llamada a OpenRouter a un shape manejable por el controlador.
 * Devuelve { status, message } o null si no se reconoce el error.
 */
export function mapOpenRouterError(error) {
  if (error.name === "AbortError") {
    return { status: 504, message: "OpenRouter tardó demasiado en responder." };
  }

  if (typeof error.status === "number") {
    if (error.status === 401) {
      return { status: 500, message: "OPENROUTER_API_KEY inválida o ausente en el servidor." };
    }
    if (error.status === 402) {
      return { status: 402, message: "Sin crédito suficiente en la cuenta de OpenRouter." };
    }
    if (error.status === 429) {
      return { status: 503, message: "Límite de peticiones a OpenRouter alcanzado. Intenta de nuevo en unos segundos." };
    }
    if (error.status >= 500) {
      return { status: 502, message: "Error del servicio de OpenRouter." };
    }
    return { status: 502, message: `Error de OpenRouter (HTTP ${error.status}). Verifica OPENROUTER_MODEL.` };
  }

  return null;
}

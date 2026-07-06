import { generateSpecWithClaude, mapAnthropicError } from "../services/claude.service.js";
import { generateSpecWithOpenRouter, mapOpenRouterError } from "../services/openrouter.service.js";
import { generateSpecMock } from "../services/mock.service.js";
import { getProvider } from "../services/provider.js";

const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * POST /api/generate-spec
 * Body: { "description": "Cocina moderna con barras de mármol y pisos de madera" }
 */
export async function generateSpec(req, res) {
  const { description } = req.body ?? {};

  if (typeof description !== "string" || description.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'El campo "description" es obligatorio y debe ser un texto no vacío.',
    });
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    });
  }

  const cleanDescription = description.trim();
  const provider = getProvider();
  const mocked = provider === "mock";

  try {
    let result;
    if (provider === "openrouter") {
      result = await generateSpecWithOpenRouter(cleanDescription);
    } else if (provider === "anthropic") {
      result = await generateSpecWithClaude(cleanDescription);
    } else {
      result = generateSpecMock(cleanDescription);
    }

    return res.status(200).json({
      success: true,
      data: {
        specification: result.spec,
        format: "markdown",
        standard: "CSI MasterFormat",
      },
      meta: {
        mocked,
        provider,
        model: result.model,
        usage: result.usage,
        input: cleanDescription,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const apiError =
      provider === "openrouter" ? mapOpenRouterError(error) : mapAnthropicError(error);

    if (apiError) {
      console.error(`[generate-spec] Error de ${provider}: ${error.message}`);
      return res.status(apiError.status).json({ success: false, error: apiError.message });
    }

    console.error("[generate-spec] Error inesperado:", error);
    return res.status(500).json({
      success: false,
      error: "Error interno al generar la especificación.",
    });
  }
}

# Prompt-to-Spec — Backend (MVP)

Micro-SaaS para arquitectos: transforma descripciones casuales de espacios arquitectónicos (p. ej. *"Cocina moderna con barras de mármol y pisos de madera"*) en documentos de especificación técnica estructurados bajo el estándar **CSI MasterFormat**, divididos en **Materiales**, **Ejecución** y **Control de Calidad**.

## Stack

- Node.js (≥ 18) + Express
- SDK oficial `@anthropic-ai/sdk` (modelo `claude-opus-4-8`), con **OpenRouter** como proveedor alternativo
- Modo simulado (mock) para desarrollar sin consumir ninguna API

## Estructura del proyecto

```
├── src/
│   ├── server.js                  # Punto de entrada (carga .env y levanta el servidor)
│   ├── app.js                     # App de Express: middlewares, rutas, manejo de errores
│   ├── routes/
│   │   └── spec.routes.js         # POST /api/generate-spec
│   ├── controllers/
│   │   └── spec.controller.js     # Validación del body y orquestación mock/real
│   ├── services/
│   │   ├── provider.js            # Decide qué proveedor usar (mock/anthropic/openrouter)
│   │   ├── claude.service.js      # Cliente de la API directa de Anthropic (streaming + errores tipados)
│   │   ├── openrouter.service.js  # Cliente alternativo vía OpenRouter (fetch nativo, sin SDK extra)
│   │   └── mock.service.js        # Respuesta simulada con el mismo contrato de salida
│   └── prompts/
│       └── system-prompt.js       # Prompt de sistema especializado en CSI MasterFormat
├── public/
│   ├── index.html                 # Frontend: UI minimalista (Tailwind + Inter vía CDN)
│   └── app.js                     # Lógica del frontend: fetch, loading, render Markdown, copy
├── tests/
│   └── api.test.js                # Pruebas del endpoint y del frontend estático
├── .env.example                   # Plantilla de variables de entorno
└── package.json
```

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de entorno
cp .env.example .env

# 3. Levantar el servidor (con recarga automática en desarrollo)
npm run dev
# o en producción:
npm start
```

Por defecto el servidor corre en `http://localhost:3000` en **modo simulado** (`MOCK_CLAUDE=true`), por lo que no necesitas API key para probar la lógica.

Al abrir `http://localhost:3000` en el navegador verás el **frontend web**: una interfaz minimalista (estética Vercel/Apple, en inglés para el mercado de EE. UU.) donde el arquitecto describe el espacio, genera la especificación, la copia al portapapeles o la **descarga como PDF** listo para imprimir (tamaño carta, con encabezado y fecha, vía `html2pdf.js`). El Markdown se renderiza con `marked` y se sanea con `DOMPurify` antes de insertarse en el DOM; Tailwind CSS y la fuente Inter se cargan vía CDN.

Para generar especificaciones reales, edita tu `.env` y elige **una** de las dos opciones (con `MOCK_CLAUDE=false` en ambos casos):

**Opción A — API directa de Anthropic** ([platform.claude.com](https://platform.claude.com)):
```
MOCK_CLAUDE=false
ANTHROPIC_API_KEY=sk-ant-...
```

**Opción B — OpenRouter** ([openrouter.ai](https://openrouter.ai)), si ya tienes crédito ahí:
```
MOCK_CLAUDE=false
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet   # opcional; ver nota abajo
```

Si defines ambas keys, **OpenRouter tiene prioridad**. `OPENROUTER_MODEL` acepta el *slug* exacto de cualquier modelo listado en [openrouter.ai/models](https://openrouter.ai/models) — no solo Claude; cópialo tal cual aparece ahí, un valor inventado responde 400.

También puedes forzar explícitamente un proveedor con `AI_PROVIDER=anthropic|openrouter|mock`, ignorando la lógica automática basada en qué keys estén presentes.

## API

### `POST /api/generate-spec`

**Body:**

```json
{
  "description": "Cocina moderna con barras de mármol y pisos de madera"
}
```

**Respuesta 200:**

```json
{
  "success": true,
  "data": {
    "specification": "# Especificación Técnica — CSI MasterFormat\n...",
    "format": "markdown",
    "standard": "CSI MasterFormat"
  },
  "meta": {
    "mocked": true,
    "provider": "mock",
    "model": "mock",
    "usage": null,
    "input": "Cocina moderna con barras de mármol y pisos de madera",
    "generatedAt": "2026-07-04T00:00:00.000Z"
  }
}
```

**Errores:** `400` (description ausente, vacía, demasiado larga o JSON inválido), `502/503/504` (fallos del proveedor de IA elegido), `500` (error interno).

**Prueba rápida con curl:**

```bash
curl -s http://localhost:3000/api/generate-spec \
  -H "Content-Type: application/json" \
  -d '{"description": "Cocina moderna con barras de mármol y pisos de madera"}'
```

### `GET /health`

Devuelve el estado del servicio, si está en modo simulado y qué `provider` está activo (`"mock" | "anthropic" | "openrouter"`).

## Pruebas

```bash
npm test
```

Ejecuta la suite con el runner nativo de Node (`node --test`) y `supertest`: valida el contrato del endpoint (estructura Markdown/CSI de la respuesta), las reglas de validación del body y el manejo de errores, todo en modo simulado sin consumir la API.

## Despliegue en Render

El repo incluye un blueprint (`render.yaml`) para desplegar con un clic:

1. Crea una cuenta en [render.com](https://render.com) (puedes entrar con tu cuenta de GitHub).
2. En el dashboard: **New +** → **Blueprint** → conecta el repositorio `Proyecto-Arquitectos-app`.
3. Render lee `render.yaml` y crea el Web Service `prompt-to-spec-pro` (plan free). Cuando pregunte por las keys, puedes dejarlas vacías: la demo corre en modo simulado (`MOCK_CLAUDE=true`).
4. Al terminar el deploy tendrás una URL pública tipo `https://prompt-to-spec-pro.onrender.com`.

Para pasar del demo a especificaciones reales: en el dashboard del servicio → **Environment**, cambia `MOCK_CLAUDE` a `false` y define **una** de las dos keys (ver "Opción A / Opción B" arriba). **Nunca pegues una API key directamente en `render.yaml` ni la subas a GitHub** — siempre se define ahí, en el dashboard, donde queda cifrada y fuera del repositorio.

> Nota del plan free: el servicio se "duerme" tras ~15 minutos sin tráfico; la primera visita después de eso tarda ~30–60 s en despertar.

## Roadmap (siguientes fases)

- [x] Frontend web (Fase 2)
- [x] Exportación a PDF (Fase 3)
- [ ] Autenticación de usuarios y límites de uso
- [ ] Persistencia de especificaciones generadas (base de datos)
- [ ] Exportación a DOCX

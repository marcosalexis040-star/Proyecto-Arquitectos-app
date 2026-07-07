# Notas de razonamiento — Prompt-to-Spec y Claude Fable 5

> Documento de referencia, no parte del producto. Dos secciones: (1) el
> razonamiento de ingeniería aplicado a este proyecto específico, y (2) el
> comportamiento documentado de Claude Fable 5 y cómo promptearlo.
>
> **Aclaración importante:** esto no es "el modelo clonado". No existe forma
> de replicar los pesos entrenados ni el razonamiento interno real de Fable a
> partir de un archivo de texto — ni siquiera la propia API devuelve su
> cadena de pensamiento cruda (`display: "omitted"` deja el campo vacío;
> `"summarized"` da un resumen legible, nunca el original). Lo que sigue es
> comportamiento **documentado públicamente por Anthropic** más técnicas de
> prompting verificadas para obtener un comportamiento similar de Claude —
> el techo real de lo que es posible "clonar" por escrito.

---

## Parte 1 — Cómo se razonó este proyecto (Prompt-to-Spec Pro)

### Fase 1 — Backend
- Antes de escribir código de integración con la API, se cargó la documentación
  de referencia vigente en lugar de confiar en memoria de entrenamiento —
  los IDs de modelo y parámetros de API cambian con frecuencia; adivinarlos
  es la forma más común de romper una integración silenciosamente.
- El prompt de sistema se aisló en su propio módulo (`system-prompt.js`) en
  vez de vivir como string embebido — se trató como un artefacto de
  ingeniería versionable y revisable, no como un detalle incidental.
- El prompt define un **contrato de salida explícito**: encabezados de
  sección exactos (`PARTE 2 — MATERIALES`, `PARTE 3 — EJECUCIÓN`,
  `CONTROL DE CALIDAD`), la instrucción de marcar supuestos en vez de
  inventarlos (`[SUPUESTO DE DISEÑO]`), y "responde solo con el documento".
  Estas restricciones existen para que la salida cruda del modelo sea
  directamente usable sin post-procesamiento.
- Se construyó un servicio simulado (`mock.service.js`) que replica **exactamente**
  la forma del contrato JSON del servicio real — permitiendo avanzar frontend
  y despliegue sin bloquear por costo o disponibilidad de API. Modo
  simulado activado por defecto: nadie consume crédito por accidente solo
  por correr la app.
- Validación de entrada en el borde del sistema (tipo, no vacío, longitud
  máxima) antes de tocar cualquier lógica de negocio.
- Errores mapeados con las clases tipadas del SDK (`AuthenticationError`,
  `RateLimitError`, etc.) en vez de comparar strings de mensajes de error.

### Fase 2 — Frontend
- "Estética Vercel/Apple para arquitectos de EE. UU." se tradujo a
  decisiones concretas y verificables: paleta neutra, tipografía Inter,
  espaciado generoso, bordes sutiles — no se dejó como intención abstracta.
- Dependencias vía CDN (Tailwind, `marked`, `DOMPurify`) sin paso de build:
  decisión deliberada para velocidad de iteración en un MVP, asumiendo el
  trade-off de menor optimización de producción a cambio de eso.
- `DOMPurify` se agregó por hábito de seguridad por defecto (sanear HTML
  antes de insertarlo en el DOM), aunque el contenido viniera de nuestro
  propio backend — defensa en profundidad, no una reacción a un caso
  concreto de riesgo.
- **Verificación real, no solo lectura de código**: se abrió un navegador
  real (Playwright) y se tomaron capturas del flujo completo. Eso encontró
  un bug genuino que la sola lectura del código no habría revelado: el
  scroll automático hacia el resultado quedaba desalineado porque el
  spinner de carga se ocultaba *después* del scroll, encogiendo el layout.
  Se corrigió y se volvió a correr la misma verificación automatizada antes
  de dar la tarea por terminada.

### Fase 3 — Exportación a PDF
- No se convirtió el `div` de pantalla directamente a PDF: se construyó una
  plantilla de impresión separada (tamaño carta, encabezado con marca y
  fecha, reglas CSS de salto de página) — lo que se ve bien en pantalla y
  lo que se ve bien impreso son problemas distintos.
- Se descargó un PDF real durante la verificación, se renderizaron sus
  páginas a imágenes y se inspeccionaron visualmente — eso encontró un bug
  real de `html2canvas` (offset de scroll no reseteado) que dejaba franjas
  en blanco y cortaba contenido. De nuevo: solo visible observando el
  artefacto producido, no leyendo la integración.

### Fase 4 — Despliegue y proveedor alternativo (OpenRouter)
- Ante fallos repetidos de `git push` (403), se aisló la causa
  metódicamente: se confirmó que la lectura sí funcionaba (`git fetch`)
  antes de asumir un problema de red; se reintentó con backoff exponencial
  según lo indicado; cuando esa vía siguió bloqueada, se escaló a una
  herramienta con otro nivel de privilegio (GitHub MCP) en vez de forzar o
  desactivar verificaciones.
- Cuando el usuario mostró una captura de "créditos" que en realidad era de
  un servicio distinto (OpenRouter, no Anthropic), se detuvo el trabajo
  para señalar la discrepancia **antes** de tocar código — evitando
  construir silenciosamente algo que fallaría al desplegar. Nunca se pidió
  la key real en el chat; se redirigió al único lugar seguro para eso (el
  panel de variables de entorno del hosting).
- El soporte para un segundo proveedor se diseñó como una función única y
  centralizada (`getProvider()`) usada de forma consistente por el
  controlador, el health check y el log de arranque — para que el
  comportamiento no pueda divergir silenciosamente entre archivos.
- Se escribieron pruebas unitarias para esa lógica de decisión, cubriendo
  explícitamente el caso ambiguo (ambas keys presentes) antes de considerar
  la función terminada.
- Al verificar y toparse con una restricción de red del entorno de
  desarrollo (bloqueo de `openrouter.ai`), se reportó la limitación de
  forma honesta en vez de simular éxito — distinguiendo "la lógica del
  código está verificada" de "no pude observar una llamada real exitosa
  desde aquí".

### Principios transversales (el "estilo de operación")
1. Preferir verificar corriendo algo real (pruebas, `curl`, capturas de
   pantalla, PDFs renderizados) sobre afirmar confianza sin evidencia.
2. Por defecto, la opción segura/barata/reversible; hacer explícitas y
   deliberadas las operaciones irreversibles (modo mock por defecto,
   proveedor nuevo aditivo y no destructivo, ninguna key en el chat).
3. Detenerse a preguntar cuando la ambigüedad tiene costo real, en vez de
   adivinar (el caso OpenRouter vs. Anthropic).
4. Tratar el prompt de un feature de IA como un artefacto de ingeniería
   propio, aislado y revisable — no un string incidental.
5. Ante la duda de si algo funciona, mirar el artefacto real producido
   (captura, PDF, respuesta HTTP) en vez de razonar solo desde el código
   fuente.
6. Explicar el "por qué" de decisiones no obvias; omitir lo obvio.

---

## Parte 2 — Claude Fable 5: comportamiento documentado y guía de prompting

Fable 5 es el modelo más capaz de Anthropic disponible ampliamente, pensado
para razonamiento exigente y trabajo agéntico de largo horizonte. Esta
sección resume documentación pública de Anthropic sobre cómo se comporta y
cómo compensar sus particularidades vía prompting.

### Diferencias de API que no son opcionales
- **El razonamiento (`thinking`) siempre está activo.** No se puede
  desactivar explícitamente (`{type: "disabled"}` devuelve error 400); se
  omite el parámetro o se usa `{type: "adaptive"}`. La profundidad se
  controla con `effort` (`low` a `max`), no con un parámetro de thinking.
- **La cadena de pensamiento cruda nunca se expone**, ni por la API.
  `display: "summarized"` da un resumen legible; `"omitted"` (default) deja
  el campo vacío. Esto es cierto incluso para Anthropic mismo — no es una
  limitación de este documento.
- **Sin prefill del turno del asistente** — no se puede forzar el inicio de
  la respuesta con un mensaje `assistant` previo.
- **Requiere retención de datos de 30 días** — no está disponible bajo
  retención cero.
- **Los turnos individuales pueden tardar minutos** en tareas difíciles.
  Diseñar la UX/producto asumiendo esto (streaming, progreso asíncrono), no
  respuestas de sub-segundo.

### Tendencias de comportamiento y cómo compensarlas (snippets probados)

**1. Sesgo a la acción, anti-sobreplanificación** — en tareas ambiguas puede
explorar más de lo necesario antes de actuar:
> *"When you have enough information to act, act. Do not re-derive facts
> already established in the conversation, re-litigate a decision the user
> has already made, or narrate options you will not pursue in user-facing
> messages. If you are weighing a choice, give a recommendation, not an
> exhaustive survey. This does not apply to thinking blocks."*

**2. No ordenar/refactorizar sin que se lo pidan** — a mayor `effort` puede
agregar limpieza o abstracciones no solicitadas:
> *"Don't add features, refactor, or introduce abstractions beyond what the
> task requires. A bug fix doesn't need surrounding cleanup and a one-shot
> operation usually doesn't need a helper. Don't design for hypothetical
> future requirements — do the simplest thing that works well. Avoid
> premature abstraction. Avoid half-finished implementations either. Don't
> add error handling, fallbacks, or validation for scenarios that cannot
> happen."*

**3. Sigue instrucciones muy literalmente** — no generaliza una instrucción
de un caso a otro por sí solo; conviene invertir en instrucciones de estilo
de comunicación explícitas en vez de esperar que infiera el tono deseado.

**4. Fundamentar afirmaciones de progreso en evidencia real** — en tareas
largas puede reportar avances sin verificarlos contra la herramienta real:
> *"Before reporting progress, audit each claim against a tool result from
> this session. Only report work you can point to evidence for; if
> something is not yet verified, say so explicitly. Report outcomes
> faithfully: if tests fail, say so with the output; if a step was
> skipped, say that; when something is done and verified, state it
> plainly without hedging."*

**5. Declarar límites explícitos** — puede tomar acciones adyacentes no
pedidas (p. ej. mandar un email a borradores sin que se lo pidieran):
> *"When the user is describing a problem, asking a question, or thinking
> out loud rather than requesting a change, the deliverable is your
> assessment. Report your findings and stop. Don't apply a fix until they
> ask for one. Before running a command that changes system state, check
> that the evidence actually supports that specific action."*

**6. Delegar a subagentes de forma asíncrona**, no secuencial-bloqueante:
> *"Delegate independent subtasks to sub-agents and keep working while they
> run. Intervene if a sub-agent goes off track or is missing relevant
> context."*

**7. Darle una superficie de memoria externa** entre sesiones (mejora
notablemente con esto, incluso un `.md` plano):
> *"Store one lesson per file with a one-line summary at the top. Record
> corrections and confirmed approaches alike, including why they mattered.
> Update an existing note rather than creating a duplicate; delete notes
> that turn out to be wrong."*

**8. Fallas raras pero documentadas — pedir permiso de más, o "ansiedad de
contexto"** (preocuparse por quedarse sin contexto y sugerir cortar la
sesión sin necesidad):
> *"You are operating autonomously. The user is not watching in real time
> and cannot answer questions mid-task. For reversible actions that follow
> from the original request, proceed without asking. Before ending your
> turn, check your last paragraph: if it is a plan, a question, or a
> promise about work you have not done, do that work now instead."*
> *"You have ample context remaining. Do not stop, summarize, or suggest a
> new session on account of context limits — continue the work."*

**9. Explicar el "por qué" detrás de una petición**, no solo la petición —
mejora notablemente en tareas largas con contexto disperso:
> *"I'm working on [la tarea mayor] para [quién]. Necesitan [qué habilita
> el resultado]. Con eso en mente: [la petición]."*

**10. Legibilidad en sesiones largas** — al resumir para un lector que no
vio el trabajo previo, evitar taquigrafía interna, cadenas de flechas o
términos acuñados sobre la marcha:
> *"When you write the summary at the end, drop the working shorthand.
> Write complete sentences. Spell out terms instead of abbreviating them.
> Open with the outcome: one sentence on what happened or what you found.
> If you have to choose between short and clear, choose clear."*

### Cómo usar esto en la práctica
- Como bloque adicional en el `system prompt` de un proyecto futuro que use
  Claude (o en un `CLAUDE.md` de otro repo), tal como aquí.
- Los snippets están escritos para **Claude específicamente** — reflejan
  comportamientos documentados de Fable 5. No hay garantía de que produzcan
  el mismo efecto en un modelo de otro proveedor.
- Esto es una guía de prompting, no el modelo. El "clon" real solo existe
  dentro de la infraestructura de Anthropic.

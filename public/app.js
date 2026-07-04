const textarea = document.getElementById("description");
const generateBtn = document.getElementById("generate-btn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const specOutputEl = document.getElementById("spec-output");
const demoBadgeEl = document.getElementById("demo-badge");
const copyBtn = document.getElementById("copy-btn");
const copyLabelEl = document.getElementById("copy-label");
const pdfBtn = document.getElementById("pdf-btn");
const pdfLabelEl = document.getElementById("pdf-label");

// Markdown crudo de la última especificación, para "Copy to Clipboard"
let rawMarkdown = "";
let copyResetTimer = null;

function setLoading(isLoading) {
  generateBtn.disabled = isLoading || textarea.value.trim().length === 0;
  loadingEl.classList.toggle("hidden", !isLoading);
  if (isLoading) {
    errorEl.classList.add("hidden");
    resultEl.classList.add("hidden");
  }
}

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

async function generateSpec() {
  const description = textarea.value.trim();
  if (!description) return;

  setLoading(true);

  try {
    const response = await fetch("/api/generate-spec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || `Request failed (HTTP ${response.status}).`);
    }

    rawMarkdown = payload.data.specification;

    // marked genera el HTML y DOMPurify lo sanea antes de insertarlo en el DOM
    const html = DOMPurify.sanitize(marked.parse(rawMarkdown));
    specOutputEl.innerHTML = html;

    demoBadgeEl.classList.toggle("hidden", !payload.meta?.mocked);
    resultEl.classList.remove("hidden");
    // Ocultar el loading ANTES del scroll: si sigue visible, el layout se
    // encoge después y el scroll queda pasado, tapando el inicio del resultado.
    loadingEl.classList.add("hidden");
    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    showError(
      err instanceof TypeError
        ? "Could not reach the server. Please check your connection and try again."
        : err.message
    );
  } finally {
    setLoading(false);
  }
}

async function copyToClipboard() {
  if (!rawMarkdown) return;

  try {
    await navigator.clipboard.writeText(rawMarkdown);
  } catch {
    // Fallback para contextos sin Clipboard API (p. ej. HTTP no seguro)
    const helper = document.createElement("textarea");
    helper.value = rawMarkdown;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  copyLabelEl.textContent = "Copied!";
  clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copyLabelEl.textContent = "Copy to Clipboard";
  }, 2000);
}

async function downloadPdf() {
  if (!rawMarkdown || pdfBtn.disabled) return;

  pdfBtn.disabled = true;
  pdfLabelEl.textContent = "Preparing PDF...";

  // Plantilla limpia para impresión: mismo contenido renderizado (clases prose
  // de Tailwind incluidas), pero sin el fondo gris ni el borde de la tarjeta.
  const doc = document.createElement("div");
  doc.className = "prose prose-neutral max-w-none bg-white";
  doc.style.width = "7.3in";
  doc.style.fontSize = "11px";

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.innerHTML = `
    <style>
      h1, h2, h3 { page-break-after: avoid; }
      table, tr, li, blockquote { page-break-inside: avoid; }
    </style>
    <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:2px solid #171717; padding-bottom:8px; margin-bottom:20px;">
      <span style="font-weight:700; letter-spacing:-0.01em;">Prompt-to-Spec <span style="color:#a3a3a3;">Pro</span></span>
      <span style="font-size:10px; color:#737373; text-transform:uppercase; letter-spacing:0.1em;">CSI MasterFormat Specification &middot; ${today}</span>
    </div>
  `;
  doc.insertAdjacentHTML("beforeend", DOMPurify.sanitize(specOutputEl.innerHTML));

  const filename = `CSI-Specification-${new Date().toISOString().slice(0, 10)}.pdf`;

  try {
    await html2pdf()
      .set({
        margin: [0.6, 0.6, 0.7, 0.6],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        // scrollY: 0 evita que html2canvas desplace el lienzo cuando la página
        // está scrolleada (deja franjas en blanco y corta el final del documento)
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", scrollY: 0 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(doc)
      .save();
  } catch (err) {
    showError(`Could not generate the PDF: ${err.message}`);
  } finally {
    pdfBtn.disabled = false;
    pdfLabelEl.textContent = "Download PDF";
  }
}

generateBtn.addEventListener("click", generateSpec);
copyBtn.addEventListener("click", copyToClipboard);
pdfBtn.addEventListener("click", downloadPdf);

textarea.addEventListener("input", () => {
  generateBtn.disabled = textarea.value.trim().length === 0;
});

textarea.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    generateSpec();
  }
});

const textarea = document.getElementById("description");
const generateBtn = document.getElementById("generate-btn");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const specOutputEl = document.getElementById("spec-output");
const demoBadgeEl = document.getElementById("demo-badge");
const copyBtn = document.getElementById("copy-btn");
const copyLabelEl = document.getElementById("copy-label");

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

generateBtn.addEventListener("click", generateSpec);
copyBtn.addEventListener("click", copyToClipboard);

textarea.addEventListener("input", () => {
  generateBtn.disabled = textarea.value.trim().length === 0;
});

textarea.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    generateSpec();
  }
});

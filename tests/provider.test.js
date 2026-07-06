import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getProvider } from "../src/services/provider.js";

const ENV_KEYS = ["AI_PROVIDER", "MOCK_CLAUDE", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY"];
let savedEnv;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("getProvider", () => {
  test("por defecto (sin nada configurado) usa mock", () => {
    assert.equal(getProvider(), "mock");
  });

  test("MOCK_CLAUDE=true fuerza mock aunque haya keys", () => {
    process.env.MOCK_CLAUDE = "true";
    process.env.OPENROUTER_API_KEY = "sk-or-x";
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    assert.equal(getProvider(), "mock");
  });

  test("MOCK_CLAUDE=false + OPENROUTER_API_KEY usa openrouter", () => {
    process.env.MOCK_CLAUDE = "false";
    process.env.OPENROUTER_API_KEY = "sk-or-x";
    assert.equal(getProvider(), "openrouter");
  });

  test("MOCK_CLAUDE=false + ANTHROPIC_API_KEY (sin openrouter) usa anthropic", () => {
    process.env.MOCK_CLAUDE = "false";
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    assert.equal(getProvider(), "anthropic");
  });

  test("con ambas keys, OpenRouter tiene prioridad sobre Anthropic", () => {
    process.env.MOCK_CLAUDE = "false";
    process.env.OPENROUTER_API_KEY = "sk-or-x";
    process.env.ANTHROPIC_API_KEY = "sk-ant-x";
    assert.equal(getProvider(), "openrouter");
  });

  test("MOCK_CLAUDE=false sin ninguna key cae de vuelta a mock", () => {
    process.env.MOCK_CLAUDE = "false";
    assert.equal(getProvider(), "mock");
  });

  test("AI_PROVIDER explícito gana sobre cualquier otra combinación", () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.MOCK_CLAUDE = "false";
    process.env.OPENROUTER_API_KEY = "sk-or-x";
    assert.equal(getProvider(), "anthropic");
  });

  test("AI_PROVIDER con valor no reconocido se ignora", () => {
    process.env.AI_PROVIDER = "chatgpt";
    assert.equal(getProvider(), "mock");
  });
});

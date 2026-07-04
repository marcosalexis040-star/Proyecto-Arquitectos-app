import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

process.env.MOCK_CLAUDE = "true";

const { default: app } = await import("../src/app.js");

describe("GET /health", () => {
  test("responde 200 con el estado del servicio", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.mockMode, true);
  });
});

describe("POST /api/generate-spec", () => {
  test("genera una especificación en Markdown con una descripción válida", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .send({ description: "Cocina moderna con barras de mármol y pisos de madera" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.format, "markdown");
    assert.equal(res.body.data.standard, "CSI MasterFormat");
    assert.match(res.body.data.specification, /CSI MasterFormat/);
    assert.match(res.body.data.specification, /PARTE 2 — MATERIALES/);
    assert.match(res.body.data.specification, /PARTE 3 — EJECUCIÓN/);
    assert.match(res.body.data.specification, /CONTROL DE CALIDAD/);
    assert.equal(res.body.meta.mocked, true);
    assert.equal(
      res.body.meta.input,
      "Cocina moderna con barras de mármol y pisos de madera"
    );
  });

  test("recorta espacios de la descripción antes de procesarla", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .send({ description: "  Baño minimalista con porcelanato  " });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.input, "Baño minimalista con porcelanato");
  });

  test("rechaza un body sin description", async () => {
    const res = await request(app).post("/api/generate-spec").send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("rechaza una description vacía o de solo espacios", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .send({ description: "   " });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("rechaza una description que no sea texto", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .send({ description: 42 });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("rechaza una description de más de 2000 caracteres", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .send({ description: "x".repeat(2001) });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  test("rechaza JSON malformado con 400", async () => {
    const res = await request(app)
      .post("/api/generate-spec")
      .set("Content-Type", "application/json")
      .send('{"description": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});

describe("rutas no definidas", () => {
  test("responde 404 en JSON", async () => {
    const res = await request(app).get("/api/no-existe");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

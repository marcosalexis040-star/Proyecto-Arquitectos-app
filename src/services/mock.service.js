/**
 * Simulador de la respuesta de Claude para la fase de desarrollo (MOCK_CLAUDE=true).
 * Devuelve un documento con la MISMA estructura que producirá el prompt real
 * (CSI MasterFormat: Materiales / Ejecución / Control de Calidad), de modo que
 * el frontend y la lógica del endpoint puedan construirse contra este contrato.
 */
export function generateSpecMock(description) {
  const spec = `# Especificación Técnica — CSI MasterFormat

| Campo | Valor |
| --- | --- |
| **Proyecto / Espacio** | ${description} |
| **Divisiones CSI aplicables** | División 09 — Acabados (Finishes); División 12 — Mobiliario (Furnishings) |
| **Alcance** | Suministro e instalación de acabados y superficies descritos por el arquitecto |

---

## SECCIÓN 12 36 40 — CUBIERTAS DE PIEDRA NATURAL (Stone Countertops)

### PARTE 2 — MATERIALES

- Mármol natural clasificación **ASTM C503**, sanidad Grupo A (MIA — Marble Institute of America).
- Espesor nominal: 20 mm (3/4") con laminado a 40 mm en frentes [SUPUESTO DE DISEÑO].
- Acabado pulido brillante; sellador penetrante base solvente aplicado en fábrica.
- Adhesivo estructural epóxico y silicón 100% neutro para juntas perimetrales.

| Propiedad | Requisito | Norma |
| --- | --- | --- |
| Absorción de agua | ≤ 0.20 % | ASTM C97 |
| Resistencia a flexión | ≥ 7 MPa | ASTM C99 |

### PARTE 3 — EJECUCIÓN

1. Verificar nivelación de muebles base: tolerancia máxima 3 mm en 3 m.
2. Plantillar en sitio; fabricar con juntas mínimas y coincidentes con el despiece aprobado.
3. Instalar sobre soporte continuo; asentar con adhesivo epóxico según instrucciones del fabricante.
4. Sellar juntas perimetrales con silicón neutro; retirar excedentes antes del curado.
5. Proteger la superficie con cartón corrugado hasta la entrega del espacio.

### CONTROL DE CALIDAD

- Aprobación de **muestra física** (300 × 300 mm) y mock-up de una junta antes de fabricar.
- Inspección de sanidad de placas al recibo; rechazo por fisuras pasantes o resanes visibles.
- Prueba de repelencia de agua posterior al sellado.
- Entrega de garantía escrita del instalador (1 año) y manual de mantenimiento.

---

## SECCIÓN 09 64 00 — PISOS DE MADERA (Wood Flooring)

### PARTE 2 — MATERIALES

- Duela de madera de ingeniería, capa de uso ≥ 3 mm, clasificación **NWFA** grado selecto [SUPUESTO DE DISEÑO].
- Contenido de humedad al instalar: 6–9 % (medido con higrómetro calibrado).
- Barrera de vapor y bajopiso acústico según recomendación del fabricante.

### PARTE 3 — EJECUCIÓN

1. Aclimatar la madera en el espacio 72 h antes de la instalación.
2. Verificar humedad del sustrato de concreto: ≤ 3 % CM o RH ≤ 80 % (**ASTM F2170**).
3. Instalar dejando junta de expansión (expansion joint) perimetral de 10–15 mm oculta por zoclo.
4. Tolerancia de planicidad del sustrato: 3 mm en 3 m.

### CONTROL DE CALIDAD

- Registro de lecturas de humedad de sustrato y madera antes de instalar.
- Inspección de acabado final con luz rasante; rechazo por desniveles entre tablas > 0.5 mm.
- Garantía del fabricante (acabado) y del instalador (mano de obra).

---

## Notas para el Especificador

- Confirmar el tipo y origen del mármol (los marcados [SUPUESTO DE DISEÑO] requieren decisión del arquitecto).
- Verificar cargas y dimensiones reales del proyecto antes de emitir para construcción.
- Este documento fue generado en **modo simulado** — active la API de Claude (MOCK_CLAUDE=false) para obtener la especificación completa derivada de la descripción.`;

  return {
    spec,
    model: "mock",
    usage: null,
  };
}

<div align="center">

# 🏛 irs-taxpayer-mcp

**Conoce la cifra exacta antes del 31 de diciembre, sin enviar tus finanzas a un chatbot.**

Estimaciones fiscales deterministas TY2024 a TY2026 · CLI local que no usa ningún modelo · 45 herramientas MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md) | [Sitio web](https://dma9527.github.io/irs-taxpayer-mcp/)

</div>

---

> Solo para planificación y fines educativos. No es asesoría fiscal, legal ni financiera, y no es software para presentar declaraciones. Consulte siempre a un profesional fiscal calificado.

## Conoce la cifra antes del 31 de diciembre

¿Conviene convertir a Roth este año? ¿Vender inversiones con ganancias en el tramo del 0%? ¿Completar el 401(k)? Estas decisiones tienen fecha límite, y una estimación aproximada de un chatbot no basta cuando hay dinero real en juego.

`irs-taxpayer-mcp` es un motor determinista de impuestos para contribuyentes individuales de EE. UU. (TY2024 a TY2026). Calcula a partir de las tablas anuales del IRS, muestra el procedimiento y se niega a adivinar cuando un caso no está soportado.

- 🔒 **Tus cifras pueden quedarse en tu equipo.** La CLI directa calcula en local, no inicia MCP, no llama a ningún modelo y no envía datos fiscales a ningún lugar.
- 🎯 **Determinista, no generado.** Las mismas entradas dan siempre el mismo resultado. Un modelo de lenguaje nunca hace la aritmética.
- 🛑 **Falla de forma segura.** Un año, un estado o un dato obligatorio no soportado devuelve un error en lugar de una estimación aproximada.
- 🤖 **También funciona con tu asistente de IA.** 45 herramientas MCP para Claude, Kiro, Cursor y otros clientes MCP.

## 🚀 Pruébalo en 30 segundos

```bash
npm install --global irs-taxpayer-mcp
irs-taxpayer-mcp intake --output taxpayer-facts.json   # cuestionario guiado local
irs-taxpayer-mcp plan --facts taxpayer-facts.json
```

Resultado de ejemplo para un hogar sintético (TY2026, declaración conjunta, $185,000 de salario W-2, $12,000 de ganancias a largo plazo, dos hijos). La salida del comando está en inglés:

```text
# Local Tax Plan for TY2026

Adjusted gross income: $197,000
Taxable income: $164,800
Federal tax after refundable credits: $20,440
Employee FICA: $14,122
Total modeled tax: $34,562
Take-home income: $162,438
```

Añade `--json` para obtener una salida estructurada con supuestos, fuentes oficiales, el detalle del cálculo y `privacy.modelInvoked: false`.

## 💡 Decisiones que te ayuda a resolver

| Pregunta | Herramienta | Ejemplo (datos sintéticos, TY2026) |
| -------- | ----------- | ---------------------------------- |
| ¿Cuánto cuesta una conversión a Roth este año? | `simulate_tax_scenario` | Declaración conjunta con $150,000: una conversión de $30,000 sube el impuesto federal en $6,600, un 22% fijo |
| ¿Puedo vender ganancias con 0% de impuesto? | `optimize_capital_gains` | Muestra el espacio restante en el tramo del 0% y avisa si una pérdida solo compensaría ganancias que ya están libres de impuesto |
| ¿Deducción estándar o detallada? | `standard_vs_itemized` | Aplica el límite SALT, el umbral de donaciones y la deducción de donaciones sin detallar del año elegido |
| ¿Cuánto pago cada trimestre como autónomo? | `estimate_quarterly_tax` | Importes del Formulario 1040-ES con guía de safe harbor |
| ¿Mi retención de nómina es suficiente? | `analyze_paycheck` | Proyecta el impuesto anual con los créditos y sugiere cambios en el W-4 |
| ¿Me ahorraré impuestos si me mudo de estado? | `analyze_relocation_taxes` | Compara perfiles estatales de un año exacto; un estado sin perfil verificado devuelve un error |
| ¿Qué cambió entre dos años fiscales? | `what_changed_between_tax_years` | Cambios de reglas de TY2025 y TY2026 con fuentes primarias |

## 🔒 Privacidad Primero

**El motor determinista no realiza solicitudes de red ni almacena datos fiscales.** Los comandos directos `intake`, `validate` y `plan` no inician MCP ni invocan un modelo.

- Los planes del modo directo incluyen `privacy.modelInvoked: false`. Con MCP el valor es `true`, porque un cliente en la nube puede haber visto los datos.
- Los datos introducidos mediante un cliente MCP pueden ser procesados por el proveedor del modelo de ese cliente. Si necesitas procesamiento totalmente local, usa la CLI.
- Los archivos de datos nuevos se crean con permisos `0600` en macOS y Linux. La importación se limita a 1 MiB, rechaza enlaces simbólicos y campos desconocidos, y no acepta nombres, SSN, direcciones, identificadores de empleador ni números de cuenta.

## 🛠 Herramientas (45)

| Categoría           | Cant. | Descripción                                                                                                 |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| Cálculos federales  | 6     | Impuesto federal, tramos, comparación de estados civiles, pagos trimestrales, federal+estatal, W-4          |
| Deducciones         | 2     | Explorar deducciones, estándar vs detallada                                                                 |
| Créditos            | 4     | 20+ créditos federales, elegibilidad, EITC preciso, PTC TY2026 |
| Jubilación          | 2     | Cuentas de jubilación, estrategias Backdoor Roth                                                            |
| Planificación       | 7     | Plan local estructurado, fin de año, comparación anual, autónomos, hipoteca, educación, MFJ vs MFS           |
| Impuestos estatales | 4     | Información estatal, estimación, comparación, estados sin impuesto                                          |
| Información IRS     | 3     | Fechas límite, estado de reembolso, formularios                                                             |
| Ley OBBB            | 2     | Nuevas deducciones, cambios entre años                                                                      |
| Informes            | 6     | Informe completo, procesamiento 1099, calendario, nómina, simulación, riesgo de auditoría                   |
| Avanzado            | 5     | Lista de documentos, optimización de ganancias, retiros de jubilación, planificación multi-año, reubicación |
| Guía y comentarios  | 4     | Estado del servidor, consulta de reglas, guías de formularios y enlace de comentarios                      |

## ⚡ Inicio Rápido con MCP

Añade esto a la configuración de tu cliente MCP:

```json
{
  "mcpServers": {
    "irs-taxpayer": {
      "command": "npx",
      "args": ["-y", "irs-taxpayer-mcp"]
    }
  }
}
```

Reinicia la aplicación después de guardar. Los datos introducidos en un cliente MCP pueden ser procesados por el proveedor de su modelo, así que decide en consecuencia si introduces datos fiscales reales.

## 📊 Años Fiscales

- **TY2024**: IRS Rev. Proc. 2023-34
- **TY2025**: One Big Beautiful Bill Act (deducción estándar $15,750/$31,500, CTC $2,200, SALT $40K)
- **TY2026**: IRS Rev. Proc. 2025-32 y la base salarial de la SSA para 2026 (deducción estándar $16,100/$32,200/$24,150, CTC $2,200 con hasta $1,700 reembolsables, límite SALT $40,400, reducción de la exención AMT al 50% por encima de $500,000/$1,000,000)

## Alcance y límites

- Es un motor determinista de estimación y planificación, no software para presentar declaraciones. No prepara, firma ni transmite una declaración.
- Las estimaciones federales cubren solo las entradas que cada herramienta modela de forma expresa. No implementan cada línea del Formulario 1040, cada anexo ni cada elección.
- Los datos de referencia estatales cubren los 50 estados y DC, pero la estimación numérica exige un perfil verificado para el año exacto. Las demás rutas devuelven un error.
- No se incluyen impuestos municipales, de condado ni de distritos escolares.
- Las proyecciones de reembolso dependen solo de los datos introducidos y de los créditos reembolsables modelados. No son una determinación del IRS.

El alcance completo está en el [README en inglés](../README.md).

## 🐛 ¿Encontraste un error?

[Abre un issue](https://github.com/dma9527/irs-taxpayer-mcp/issues/new/choose) con el nombre de la herramienta, el año fiscal, un ejemplo redondeado o sintético y el resultado esperado. No publiques datos personales.

## 📄 Licencia

[MIT](../LICENSE)

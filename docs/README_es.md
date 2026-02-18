<div align="center">

# 🏛️ irs-taxpayer-mcp

**Servidor MCP para contribuyentes individuales de EE.UU. — cálculos de impuestos federales/estatales, créditos, deducciones, estrategias de jubilación e información del IRS.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **Aviso**: Esta herramienta proporciona estimaciones solo con fines educativos e informativos. No constituye asesoramiento fiscal, legal o financiero. Consulte siempre a un profesional fiscal calificado.

> **Aviso Legal**: Este software se proporciona "tal cual" sin garantía de ningún tipo. Los autores y colaboradores no son profesionales fiscales, contadores públicos ni abogados. El uso de este software no crea ninguna relación profesional. Las leyes fiscales cambian frecuentemente y varían según la jurisdicción. Los cálculos pueden contener errores, omisiones o no reflejar los cambios legislativos más recientes. Usted es el único responsable de sus decisiones fiscales. Los autores declinan toda responsabilidad por cualquier daño derivado del uso de este software, incluyendo multas fiscales, intereses, declaraciones incorrectas o pérdidas financieras. Consulte [DISCLAIMER.md](../DISCLAIMER.md) para el aviso legal completo.

## 🔒 Privacidad Primero

**Sus datos financieros nunca salen de su computadora.**

- Todos los cálculos fiscales se ejecutan localmente — sin llamadas de red
- Diseño sin estado — nada se guarda entre llamadas
- Sin credenciales requeridas — sin SSN, sin inicio de sesión del IRS
- Solo datos públicos del IRS (formularios, fechas límite)
- Sin telemetría — sin análisis, sin seguimiento

## 🛠️ Herramientas (17)

| Categoría           | Herramienta                 | Descripción                             |
| ------------------- | --------------------------- | --------------------------------------- |
| Cálculos            | `calculate_federal_tax`     | Cálculo completo de impuestos federales |
|                     | `get_tax_brackets`          | Tramos impositivos por estado civil     |
|                     | `compare_filing_statuses`   | Comparar estados civiles                |
|                     | `estimate_quarterly_tax`    | Pagos trimestrales estimados            |
| Deducciones         | `list_deductions`           | Explorar deducciones                    |
|                     | `standard_vs_itemized`      | Estándar vs detallada                   |
| Créditos            | `list_tax_credits`          | 20+ créditos federales                  |
|                     | `check_credit_eligibility`  | Verificar elegibilidad                  |
| Jubilación          | `get_retirement_accounts`   | Detalles de cuentas                     |
|                     | `get_retirement_strategy`   | Estrategias fiscales                    |
| Impuestos estatales | `get_state_tax_info`        | Información estatal                     |
|                     | `estimate_state_tax`        | Estimación estatal                      |
|                     | `compare_state_taxes`       | Comparar estados                        |
|                     | `list_no_income_tax_states` | Estados sin impuesto                    |
| Información IRS     | `get_tax_deadlines`         | Fechas clave                            |
|                     | `check_refund_status`       | Estado de reembolso                     |
|                     | `get_irs_form_info`         | Información de formularios              |

## ⚡ Inicio Rápido

Agregue a la configuración de su cliente MCP (Claude Desktop, Kiro, Cursor, etc.):

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

### Compilar desde Código Fuente

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start
```

## 💬 Ejemplos de Uso

- _"Calcula mi impuesto federal: $150k de ingreso, casado declaración conjunta, 2 hijos"_
- _"Compara California vs Texas vs Washington para $200k de ingreso"_
- _"Soy freelancer ganando $80k — ¿cuánto debo pagar trimestralmente?"_

## 📊 Años Fiscales Soportados

- **TY2024** — Año fiscal actual
- **TY2025** — Estimaciones prospectivas

## 📄 Licencia

[MIT](../LICENSE)

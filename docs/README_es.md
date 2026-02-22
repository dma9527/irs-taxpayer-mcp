<div align="center">

# 🏛️ irs-taxpayer-mcp

**Servidor MCP para contribuyentes individuales de EE.UU. — 39 herramientas para cálculos de impuestos federales/estatales, créditos, deducciones, estrategias de jubilación y planificación fiscal.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **Aviso**: Esta herramienta proporciona estimaciones solo con fines educativos e informativos. Consulte siempre a un profesional fiscal calificado.

## 🔒 Privacidad Primero

**Sus datos financieros nunca salen de su computadora.** Todos los cálculos se ejecutan localmente.

## 🛠️ Herramientas (39)

| Categoría           | Cant. | Descripción                                                                                                 |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| Cálculos federales  | 6     | Impuesto federal, tramos, comparación de estados civiles, pagos trimestrales, federal+estatal, W-4          |
| Deducciones         | 2     | Explorar deducciones, estándar vs detallada                                                                 |
| Créditos            | 3     | 20+ créditos federales, elegibilidad, EITC preciso                                                          |
| Jubilación          | 2     | Cuentas de jubilación, estrategias Backdoor Roth                                                            |
| Planificación       | 6     | Optimización de fin de año, comparación anual, autónomos, hipoteca, educación, MFJ vs MFS                   |
| Impuestos estatales | 4     | Información estatal, estimación, comparación, estados sin impuesto                                          |
| Información IRS     | 3     | Fechas límite, estado de reembolso, formularios                                                             |
| Ley OBBB            | 2     | Nuevas deducciones, cambios entre años                                                                      |
| Informes            | 6     | Informe completo, procesamiento 1099, calendario, nómina, simulación, riesgo de auditoría                   |
| Avanzado            | 5     | Lista de documentos, optimización de ganancias, retiros de jubilación, planificación multi-año, reubicación |

## ⚡ Inicio Rápido

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

## 📊 Años Fiscales

- **TY2024** — IRS Rev. Proc. 2023-34
- **TY2025** — One Big Beautiful Bill Act (deducción estándar $15,750/$31,500, CTC $2,200, SALT $40K)

## 📄 Licencia

[MIT](../LICENSE)

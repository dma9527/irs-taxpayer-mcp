<div align="center">

# 🏛️ irs-taxpayer-mcp

**面向美国个人纳税人的 MCP 服务器 — 39 个工具覆盖联邦/州税计算、税收抵免、扣除项、退休策略、税务规划和审计风险评估。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **免责声明**：本工具仅供教育和参考用途，不构成税务、法律或财务建议。请咨询专业税务顾问。

## 🔒 隐私优先

**你的财务数据永远不会离开你的电脑。** 所有税务计算在本地运行，无网络传输，无数据存储，无需任何凭证。

## 🛠️ 工具（39 个）

| 分类       | 工具数 | 说明                                                          |
| ---------- | ------ | ------------------------------------------------------------- |
| 联邦税计算 | 6      | 联邦税、税率表、报税身份对比、季度预估税、联邦+州税合并、W-4  |
| 扣除分析   | 2      | 扣除项浏览、标准 vs 逐项扣除                                  |
| 税收抵免   | 3      | 20+ 联邦抵免、资格筛查、EITC 精确计算                         |
| 退休策略   | 2      | 退休账户详情、Backdoor Roth 等策略                            |
| 税务规划   | 6      | 年末优化、跨年对比、自雇税、房贷分析、教育优惠、MFJ vs MFS    |
| 州税       | 4      | 州税信息、估算、多州对比、免税州                              |
| IRS 信息   | 3      | 截止日期、退税查询、表格信息                                  |
| OBBB 法案  | 2      | 新增扣除计算、年度变化对比                                    |
| 报告与分析 | 6      | 全景报告、1099 处理、税务日历、工资单分析、情景模拟、审计风险 |
| 高级工具   | 5      | 文档清单、资本利得优化、退休提款策略、多年规划、搬迁分析      |

## ⚡ 快速开始

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

## 💬 使用示例

- _"帮我算一下年收入 15 万、已婚合报、2 个孩子的联邦税"_
- _"比较加州和德州对 20 万收入的税负差异"_
- _"生成一份完整的税务报告：W-2 收入 12 万，加州，有房贷"_
- _"我是自由职业者，收入 8 万，需要交多少季度预估税？"_
- _"如果我搬到德州，每年能省多少税？"_
- _"评估一下我的审计风险"_
- _"帮我做一个 3 年的 Roth 转换计划"_

## 📊 支持的税年

- **TY2024** — IRS Rev. Proc. 2023-34
- **TY2025** — One Big Beautiful Bill Act（标准扣除 $15,750/$31,500、CTC $2,200、SALT $40K）

## 📄 许可证

[MIT](../LICENSE)

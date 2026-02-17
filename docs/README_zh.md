<div align="center">

# 🏛️ irs-taxpayer-mcp

**面向美国个人纳税人的 MCP 服务器 — 联邦/州税计算、税收抵免、扣除项、退休策略和 IRS 信息查询。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **免责声明**：本工具仅供教育和参考用途，不构成税务、法律或财务建议。请咨询专业税务顾问。

## 🔒 隐私优先

**你的财务数据永远不会离开你的电脑。**

- 所有税务计算在本地运行，无网络传输
- 无状态设计，不保存任何用户数据
- 无需 SSN、IRS 账号等任何凭证
- 仅获取 IRS 公开数据（表格、截止日期）
- 零遥测，不收集任何使用数据

## 🛠️ 工具（17 个）

| 分类     | 工具                        | 说明                                                  |
| -------- | --------------------------- | ----------------------------------------------------- |
| 税务计算 | `calculate_federal_tax`     | 联邦税完整计算（含 NIIT、附加 Medicare 税、QBI 扣除） |
|          | `get_tax_brackets`          | 税率表查询                                            |
|          | `compare_filing_statuses`   | 报税身份对比                                          |
|          | `estimate_quarterly_tax`    | 季度预估税                                            |
| 扣除分析 | `list_deductions`           | 扣除项浏览                                            |
|          | `standard_vs_itemized`      | 标准 vs 逐项扣除比较                                  |
| 税收抵免 | `list_tax_credits`          | 20+ 联邦抵免                                          |
|          | `check_credit_eligibility`  | 资格筛查                                              |
| 退休策略 | `get_retirement_accounts`   | 退休账户详情                                          |
|          | `get_retirement_strategy`   | 退休策略指南                                          |
| 州税     | `get_state_tax_info`        | 州税信息                                              |
|          | `estimate_state_tax`        | 州税估算                                              |
|          | `compare_state_taxes`       | 多州对比                                              |
|          | `list_no_income_tax_states` | 免税州列表                                            |
| IRS 信息 | `get_tax_deadlines`         | 关键日期                                              |
|          | `check_refund_status`       | 退税查询指引                                          |
|          | `get_irs_form_info`         | 表格信息                                              |

## ⚡ 快速开始

在 MCP 客户端（Claude Desktop、Kiro、Cursor 等）中添加配置：

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

### 从源码构建

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start
```

## 💬 使用示例

连接后，可以这样问你的 AI 助手：

- _"帮我算一下年收入 15 万、已婚合报、2 个孩子的联邦税"_
- _"比较加州和德州对 20 万收入的税负差异"_
- _"我是自由职业者，收入 8 万，需要交多少季度预估税？"_
- _"我符合哪些税收抵免的条件？"_
- _"Backdoor Roth IRA 怎么操作？"_

## 📊 支持的税年

- **TY2024** — 当前报税年度
- **TY2025** — 前瞻性估算

## 📄 许可证

[MIT](../LICENSE)

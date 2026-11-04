<div align="center">

# 🏛 irs-taxpayer-mcp

**在 12 月 31 日之前算清楚年底的税务决策，而不用把财务数据交给聊天机器人。**

确定性的 TY2024 至 TY2026 税务估算 · 不调用模型的本地 CLI · 45 个 MCP 工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md) | [官网](https://dma9527.github.io/irs-taxpayer-mcp/)

</div>

---

> 仅供规划和教育用途，不构成税务、法律或财务建议，也不是报税软件。请咨询专业税务顾问。

## 在 12 月 31 日之前算清楚数字

今年要不要做 Roth 转换？要不要在 0% 税率档卖出已经盈利的投资？要不要把 401(k) 补满？这些决定都有截止日期，涉及真金白银时，聊天机器人的粗略估算不够用。

`irs-taxpayer-mcp` 是面向美国个人纳税人的确定性税务引擎，覆盖 TY2024 至 TY2026。它根据 IRS 年度表格计算，展示计算过程，遇到不支持的情况时拒绝猜测。

- 🔒 **数据可以留在本机。** 直接使用 CLI 时在本地计算，不启动 MCP，不调用模型，也不发送任何税务数据。
- 🎯 **确定性，而不是生成。** 相同的输入永远得到相同的结果，算术不由语言模型完成。
- 🛑 **不支持就报错。** 遇到不支持的年份、州或缺少必需信息时，返回错误，而不是给出粗略估算。
- 🤖 **也能配合 AI 助手使用。** 提供 45 个 MCP 工具，适用于 Claude、Kiro、Cursor 等 MCP 客户端。

## 🚀 30 秒上手

```bash
npm install --global irs-taxpayer-mcp
irs-taxpayer-mcp intake --output taxpayer-facts.json   # 本地引导式问卷
irs-taxpayer-mcp plan --facts taxpayer-facts.json
```

下面是一个合成家庭的示例结果（TY2026，已婚合报，W-2 收入 $185,000，长期资本利得 $12,000，两个孩子）。命令输出为英文：

```text
# Local Tax Plan for TY2026

Adjusted gross income: $197,000
Taxable income: $164,800
Federal tax after refundable credits: $20,440
Employee FICA: $14,122
Total modeled tax: $34,562
Take-home income: $162,438
```

加上 `--json` 可以得到结构化输出，包含假设、官方来源、计算过程，以及 `privacy.modelInvoked: false`。

## 💡 它能帮你做的决定

| 问题 | 工具 | 示例（合成数据，TY2026） |
| ---- | ---- | ------------------------ |
| 今年做 Roth 转换要多交多少税？ | `simulate_tax_scenario` | 已婚合报、收入 $150,000：转换 $30,000 会让联邦税增加 $6,600，即固定 22% |
| 能不能在 0% 税率下卖出盈利的持仓？ | `optimize_capital_gains` | 显示 0% 档剩余的空间；如果亏损只会抵消本来就免税的收益，会给出警告 |
| 该用标准扣除还是逐项扣除？ | `standard_vs_itemized` | 按所选年份应用 SALT 上限、慈善扣除下限和非逐项扣除者的慈善扣除 |
| 自由职业者每个季度要交多少？ | `estimate_quarterly_tax` | 1040-ES 金额和 safe harbor 说明 |
| 工资单上的预扣税够不够？ | `analyze_paycheck` | 计入抵免后预测全年税额，并建议调整 W-4 |
| 搬到别的州能省税吗？ | `analyze_relocation_taxes` | 按具体年份比较州税；没有已验证数据的州会返回错误 |
| 两个税年之间有什么变化？ | `what_changed_between_tax_years` | TY2025 与 TY2026 的规则变化，附主要来源引用 |

## 🔒 隐私优先

**确定性计算引擎不会联网，也不会存储纳税数据。** 直接使用 `intake`、`validate` 和 `plan` 命令时，不会启动 MCP，也不会调用模型。

- 直接模式输出的方案包含 `privacy.modelInvoked: false`。通过 MCP 调用时该值为 `true`，因为云端客户端可能已经看到这些信息。
- 通过 MCP 客户端输入的 tax facts 可能由该客户端的模型供应商处理。需要完全本地处理时，请使用上面的 CLI。
- 新建的 facts 文件在 macOS 和 Linux 上权限为 `0600`。导入文件上限为 1 MiB，拒绝符号链接和未知字段，也不接受姓名、SSN、地址、雇主编号或账号。

## 🛠 工具（45 个）

| 分类       | 工具数 | 说明                                                          |
| ---------- | ------ | ------------------------------------------------------------- |
| 联邦税计算 | 6      | 联邦税、税率表、报税身份对比、季度预估税、联邦+州税合并、W-4  |
| 扣除分析   | 2      | 扣除项浏览、标准 vs 逐项扣除                                  |
| 税收抵免   | 4      | 20+ 联邦抵免、资格筛查、EITC 精确计算、TY2026 保费税收抵免    |
| 退休策略   | 2      | 退休账户详情、Backdoor Roth 等策略                            |
| 税务规划   | 7      | 本地结构化方案、年末优化、跨年对比、自雇税、房贷、教育、MFJ vs MFS |
| 州税       | 4      | 州税信息、估算、多州对比、免税州                              |
| IRS 信息   | 3      | 截止日期、退税查询、表格信息                                  |
| OBBB 法案  | 2      | 新增扣除计算、年度变化对比                                    |
| 报告与分析 | 6      | 全景报告、1099 处理、税务日历、工资单分析、情景模拟、审计风险 |
| 高级工具   | 5      | 文档清单、资本利得优化、退休提款策略、多年规划、搬迁分析      |
| 指导与反馈 | 4      | 健康检查、规则查询、表格指南、反馈链接                        |

## ⚡ MCP 快速开始

在 MCP 客户端的配置中加入：

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

配置后重启应用。通过 MCP 客户端输入的数据可能由其模型供应商处理，请据此决定是否输入真实的纳税信息。

## 💬 MCP 使用示例

- _"帮我算一下年收入 15 万、已婚合报、2 个孩子的联邦税"_
- _"比较加州和德州对 20 万收入的税负差异"_
- _"生成一份完整的税务报告：W-2 收入 12 万，加州，有房贷"_
- _"我是自由职业者，收入 8 万，需要交多少季度预估税？"_
- _"如果我搬到德州，每年能省多少税？"_
- _"评估一下我的审计风险"_
- _"帮我做一个 3 年的 Roth 转换计划"_

## 📊 支持的税年

- **TY2024**：IRS Rev. Proc. 2023-34
- **TY2025**：One Big Beautiful Bill Act（标准扣除 $15,750/$31,500、CTC $2,200、SALT $40K）
- **TY2026**：IRS Rev. Proc. 2025-32 与 SSA 2026 缴费基数（标准扣除 $16,100/$32,200/$24,150、CTC $2,200 且最高 $1,700 可退还、SALT 上限 $40,400、AMT 豁免额在 $500,000/$1,000,000 以上按 50% 递减）

## 范围与边界

- 本项目是确定性的税务估算与规划引擎，不是报税软件，不会生成、签署或提交 tax return。
- 联邦估算只覆盖各工具明确建模的输入，并没有实现 Form 1040 的每一行、每个附表和每项选择。
- 州税参考数据覆盖 50 州和 DC，但数值估算要求具体税年的已验证配置，其他路径会返回错误。
- 不包含市、县和学区所得税。
- 退税预测只基于输入和已建模的可退还抵免，不是 IRS 的退税结果。

完整的支持范围见[英文 README](../README.md)。

## 🐛 发现了错误？

[提交 issue](https://github.com/dma9527/irs-taxpayer-mcp/issues/new/choose)时，请写明工具名称、税年、取整或合成的例子以及预期结果，不要发布任何个人信息。

## 📄 许可证

[MIT](../LICENSE)

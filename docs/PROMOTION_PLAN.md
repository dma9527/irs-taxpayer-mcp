# irs-taxpayer-mcp 推广计划

## 项目现状

- npm: `irs-taxpayer-mcp@0.5.3`
- GitHub: https://github.com/dma9527/irs-taxpayer-mcp
- 43 个工具，197 个测试
- TY2024 + TY2025 (OBBB Act)
- stdio + stateless Streamable HTTP transport
- Docker 支持

> 发布前必须将本项目描述为 tax estimation and planning engine。不要声称它会生成、签署或提交 tax return，也不要声称所有州和 filing status 都支持数值估算。

---

## 第一步：GitHub 优化（5 分钟）

### 1.1 添加 Topics

访问 https://github.com/dma9527/irs-taxpayer-mcp，然后点 About 齿轮图标并添加：

```
mcp, model-context-protocol, tax, irs, tax-calculator, federal-tax,
state-tax, tax-credits, retirement, tax-planning, typescript, cli,
tax-deductions, eitc, amt, capital-gains
```

### 1.2 设置 Description

```
MCP server with 43 deterministic tax estimation and planning tools for supported US individual taxpayer scenarios. Calculations run locally. TY2024 + TY2025 (OBBB Act).
```

### 1.3 设置 Website

```
https://www.npmjs.com/package/irs-taxpayer-mcp
```

### 1.4 启用 Discussions

在 Settings 的 Features 中勾选 Discussions。让用户提问和分享使用经验。

---

## 第二步：提交到 MCP 社区目录

### 2.1 官方 MCP Server 列表（最重要）

仓库：https://github.com/modelcontextprotocol/servers

操作：

1. Fork 该仓库
2. 在 README.md 的合适分类下添加一行
3. 提交 PR

PR 标题：

```
Add irs-taxpayer-mcp: US individual tax estimator (43 tools)
```

PR 描述：

```
## irs-taxpayer-mcp

MCP server for US individual taxpayers with 43 tools covering:
- Federal tax estimates for supported TY2024 and TY2025 inputs
- State reference data for all 50 states and DC, with fail-closed numeric estimates for supported paths
- Federal credit reference data, screening, and modeled CTC and EITC calculations
- Tax planning for year-end decisions, Roth conversions, and relocation scenarios
- Estimation reports, supported 1099 categories, paycheck analysis, and audit-risk heuristics
- Retirement strategies, withdrawal planning, and multi-year projections

Boundary: This is estimation and planning software. It does not prepare, sign, or transmit tax returns.
Privacy: Calculations run locally; no tax data is transmitted by the server.
Data: TY2024 (Rev. Proc. 2023-34) + TY2025 (One Big Beautiful Bill Act).

npm: https://www.npmjs.com/package/irs-taxpayer-mcp
GitHub: https://github.com/dma9527/irs-taxpayer-mcp
```

添加到 README 的行：

```markdown
- [irs-taxpayer-mcp](https://github.com/dma9527/irs-taxpayer-mcp) - 43 local US tax estimation and planning tools for supported TY2024 and TY2025 scenarios.
```

### 2.2 mcp.so

网站：https://mcp.so

操作：

1. 访问 https://mcp.so/submit（或类似的提交页面）
2. 填写 npm 包名：`irs-taxpayer-mcp`
3. 填写 GitHub URL
4. 分类选择：Finance / Tax / Productivity

### 2.3 glama.ai

网站：https://glama.ai/mcp/servers

操作：

1. 访问提交页面
2. 填写包信息
3. 等待审核

### 2.4 Awesome MCP Servers

仓库：https://github.com/punkpeye/awesome-mcp-servers

操作：

1. Fork 仓库
2. 在 Finance 或 Productivity 分类下添加
3. 提交 PR

添加的行：

```markdown
- [irs-taxpayer-mcp](https://github.com/dma9527/irs-taxpayer-mcp) - 43 local estimation and planning tools for supported US federal and state tax scenarios.
```

---

## 第三步：社区推广

### 3.1 Reddit

发帖到以下 subreddits：

- r/ChatGPT 或 r/ClaudeAI: "I built a local MCP server for supported US tax estimates"
- r/tax: "Open-source tax estimator with 43 tools, updated for modeled OBBB provisions"
- r/personalfinance: "Free tax estimation tool that runs locally: no data leaves your computer"
- r/SideProject: 展示项目

帖子模板：

```
Title: I built an open-source MCP tax estimation assistant with 43 local tools

I built an MCP server for Claude, Kiro, and Cursor that produces deterministic tax estimates for explicitly supported TY2024 and TY2025 scenarios.

What it does:
- Estimates supported federal tax scenarios and shows the calculation breakdown
- Compares supported state-tax paths and returns an error when required bracket data is missing
- Estimates supported W-2 and 1099 income categories
- Screens federal credit reference rules and calculates modeled CTC and EITC cases
- Generates a detailed estimation report from the inputs you provide
- Provides audit-risk heuristics, retirement planning, and Roth-conversion scenarios

Boundary: It is not tax preparation or filing software and does not implement every form, schedule, election, or state rule.

Privacy: Calculations run on your machine. No IRS login or SSN is required.

Updated for modeled One Big Beautiful Bill Act provisions in TY2025.

npm: npx irs-taxpayer-mcp --help
GitHub: https://github.com/dma9527/irs-taxpayer-mcp
```

### 3.2 Hacker News

标题：

```
Show HN: Open-source MCP tax estimator - 43 local tools, TY2024/2025
```

### 3.3 Twitter/X

```
Built an open-source tax assistant that runs entirely on your machine 🔒

43 tools: federal tax, state tax, credits, deductions, retirement planning, audit risk assessment

Updated for the One Big Beautiful Bill Act (2025)

npx irs-taxpayer-mcp --help

github.com/dma9527/irs-taxpayer-mcp
```

### 3.4 Dev.to / Medium

写一篇技术文章：

- "Building a Privacy-First Tax Calculator with MCP and TypeScript"
- 讲架构决策（为什么本地计算、为什么 MCP、数据如何验证）
- 展示几个使用场景的截图

---

## 第四步：持续维护

### 4.1 每月

- 检查 GitHub issues，回复用户问题
- 检查是否有 IRS 数据更新或立法变化

### 4.2 每年（10-11月）

- 按 `docs/ANNUAL_UPDATE_CHECKLIST.md` 更新下一年数据
- 发布新版本
- 在社区发布更新公告

### 4.3 报税季（1-4月）

- 这是用户量最高的时期
- 密切关注 issues 和反馈
- 快速修复数据错误

---

## 优先级排序

| 优先级 | 行动                                   | 预计时间 | 影响         |
| ------ | -------------------------------------- | -------- | ------------ |
| P0     | GitHub topics + description            | 5 分钟   | 搜索可发现性 |
| P0     | 提交到官方 MCP servers 列表            | 30 分钟  | 最大曝光渠道 |
| P1     | 提交到 mcp.so + glama.ai               | 15 分钟  | MCP 用户发现 |
| P1     | 提交到 awesome-mcp-servers             | 15 分钟  | GitHub 搜索  |
| P2     | Reddit 发帖 (r/tax, r/personalfinance) | 30 分钟  | 目标用户     |
| P2     | Hacker News Show HN                    | 15 分钟  | 技术社区     |
| P3     | Twitter/X 发帖                         | 10 分钟  | 社交传播     |
| P3     | Dev.to/Medium 技术文章                 | 2-3 小时 | 长期 SEO     |

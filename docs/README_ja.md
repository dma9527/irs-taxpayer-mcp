<div align="center">

# 🏛️ irs-taxpayer-mcp

**米国個人納税者向けMCPサーバー — 連邦/州税計算、税額控除、控除、退職戦略、IRS情報**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **免責事項**：このツールは教育および情報提供のみを目的とした見積もりを提供します。税務、法律、または財務上のアドバイスを構成するものではありません。必ず資格のある税務専門家にご相談ください。

> **法的通知**：本ソフトウェアは「現状のまま」提供され、いかなる種類の保証も伴いません。著者および貢献者は税務専門家、公認会計士、または弁護士ではありません。本ソフトウェアの使用により専門的なサービス関係は生じません。税法は頻繁に変更され、管轄区域によって異なります。計算にはエラー、脱落、または最新の法改正が反映されていない場合があります。税務申告の決定はすべてご自身の責任です。著者は、税務上のペナルティ、利息、誤った申告、または財務上の損失を含む、本ソフトウェアの使用に起因するいかなる損害についても責任を負いません。詳細は [DISCLAIMER.md](../DISCLAIMER.md) をご覧ください。

## 🔒 プライバシー最優先

**あなたの財務データはコンピューターから外に出ることはありません。**

- すべての税計算はローカルで実行 — ネットワーク通信なし
- ステートレス設計 — ユーザーデータの保存なし
- 認証不要 — SSN、IRSログイン不要
- リモートデータはIRS公開情報のみ（フォーム、期限）
- テレメトリなし — 分析・追跡なし

## 🛠️ ツール（17個）

| カテゴリ | ツール                      | 説明                   |
| -------- | --------------------------- | ---------------------- |
| 税計算   | `calculate_federal_tax`     | 連邦税の完全計算       |
|          | `get_tax_brackets`          | 税率表の照会           |
|          | `compare_filing_statuses`   | 申告ステータスの比較   |
|          | `estimate_quarterly_tax`    | 四半期予定納税額       |
| 控除分析 | `list_deductions`           | 控除項目の閲覧         |
|          | `standard_vs_itemized`      | 標準控除 vs 項目別控除 |
| 税額控除 | `list_tax_credits`          | 20以上の連邦税額控除   |
|          | `check_credit_eligibility`  | 適格性チェック         |
| 退職戦略 | `get_retirement_accounts`   | 退職口座の詳細         |
|          | `get_retirement_strategy`   | 退職戦略ガイド         |
| 州税     | `get_state_tax_info`        | 州税情報               |
|          | `estimate_state_tax`        | 州税の見積もり         |
|          | `compare_state_taxes`       | 州間比較               |
|          | `list_no_income_tax_states` | 所得税なしの州         |
| IRS情報  | `get_tax_deadlines`         | 重要な期限             |
|          | `check_refund_status`       | 還付状況の確認方法     |
|          | `get_irs_form_info`         | フォーム情報           |

## ⚡ クイックスタート

MCPクライアント（Claude Desktop、Kiro、Cursorなど）の設定に追加：

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

### ソースからビルド

```bash
git clone https://github.com/dma9527/irs-taxpayer-mcp.git
cd irs-taxpayer-mcp
npm install
npm run build
npm start
```

## 💬 使用例

- _「年収15万ドル、夫婦合算申告、子供2人の連邦税を計算して」_
- _「カリフォルニアとテキサスとワシントンの20万ドル収入に対する税負担を比較して」_
- _「フリーランスで8万ドル稼いでいます。四半期の予定納税額はいくらですか？」_

## 📊 対応税年度

- **TY2024** — 現在の申告年度
- **TY2025** — 将来の見積もり

## 📄 ライセンス

[MIT](../LICENSE)

<div align="center">

# 🏛️ irs-taxpayer-mcp

**米国個人納税者向けMCPサーバー — 連邦/州税計算、税額控除、控除、退職戦略、税務計画、監査リスク評価の39ツール**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![CI](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/dma9527/irs-taxpayer-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/irs-taxpayer-mcp.svg)](https://www.npmjs.com/package/irs-taxpayer-mcp)

[English](../README.md) | [中文](README_zh.md) | [Español](README_es.md) | [日本語](README_ja.md)

</div>

---

> ⚠️ **免責事項**：このツールは教育および情報提供のみを目的としています。必ず資格のある税務専門家にご相談ください。

## 🔒 プライバシー最優先

**あなたの財務データはコンピューターから外に出ることはありません。** すべての計算はローカルで実行されます。

## 🛠️ ツール（39個）

| カテゴリ   | 数  | 説明                                                                         |
| ---------- | --- | ---------------------------------------------------------------------------- |
| 連邦税計算 | 6   | 連邦税、税率表、申告ステータス比較、四半期予定納税、連邦+州税、W-4           |
| 控除分析   | 2   | 控除項目閲覧、標準控除 vs 項目別控除                                         |
| 税額控除   | 3   | 20以上の連邦控除、適格性チェック、EITC精密計算                               |
| 退職戦略   | 2   | 退職口座詳細、Backdoor Roth等の戦略                                          |
| 税務計画   | 6   | 年末最適化、年度比較、自営業税、住宅ローン、教育、MFJ vs MFS                 |
| 州税       | 4   | 州税情報、見積もり、州間比較、所得税なしの州                                 |
| IRS情報    | 3   | 期限、還付状況、フォーム情報                                                 |
| OBBB法     | 2   | 新控除計算、年度変更比較                                                     |
| レポート   | 6   | 完全レポート、1099処理、税務カレンダー、給与分析、シナリオ、監査リスク       |
| 上級ツール | 5   | 書類チェックリスト、キャピタルゲイン最適化、退職引出戦略、多年計画、移転分析 |

## ⚡ クイックスタート

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

## 📊 対応税年度

- **TY2024** — IRS Rev. Proc. 2023-34
- **TY2025** — One Big Beautiful Bill Act（標準控除 $15,750/$31,500、CTC $2,200、SALT $40K）

## 📄 ライセンス

[MIT](../LICENSE)

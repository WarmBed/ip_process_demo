# IPWinner Email Processor — 專案指引

## 自動化測試

本專案有自動化測試工具，可以自動執行 ~60 項部署驗證和功能測試。

### 快速使用

```
/test-email-processor                    # 互動模式：選擇要跑的測試
/test-email-processor v3.2               # 只跑 v3.2 相關測試
/test-email-processor --verify-only      # 只驗證（不執行函式）
/test-email-processor --cleanup          # 清理測試資料
/test-email-processor --reset            # 清理 + 重建環境
/test-email-processor --ping             # 測試 Web App 連線
```

### 前置需求

1. Code.gs 已包含 doGet Web App 程式碼（見下方「doGet 部署」）
2. Web App 已部署，URL 已填入 plugin 設定
3. Chrome 已登入 Google 帳號（claude-in-chrome 驗證用）

### doGet 部署

doGet 程式碼和部署步驟在此：
`~/peter-claude-plugins/plugins/test-email-processor/skills/test-email-processor/references/doget-code.md`

部署後把 Web App URL 填入：
`~/peter-claude-plugins/plugins/test-email-processor/skills/test-email-processor/references/project-urls.md`

### 運作原理

- **執行**：透過 HTTP trigger（`curl ?action=trialRun`）觸發 Apps Script 函式
- **驗證**：Gmail MCP 查標籤 + HTTP 讀 Sheet/Drive 資料
- **報告**：Markdown 報告存到 `~/.test-reports/email-processor/ipwinner/`

### Plugin 完整文件

`~/peter-claude-plugins/plugins/test-email-processor/README.md`

## 專案結構

- `Code.gs` — 主程式（~4,800 行）
- `TODO.md` — 測試和開發待辦
- `docs/product-plan.md` — 產品計畫
- `docs/engineering-plan.md` — 工程計畫
- `email-processor-development-principles.md` — 開發原則

## 開發慣例

- Sheet tab 名稱在 `CONFIG.SHEET_NAMES` 定義
- Gmail 標籤前綴 = `CONFIG.LABEL_PREFIX`（目前是 `AI`）
- 函式命名：`_` 前綴 = 內部函式，不從 UI 直接呼叫

# Changelog

## [0.2.0] - 2026-03-16
### Added
- clasp CLI 自動化部署（push + deploy，不需手動複製貼上）
- 修正案號功能（col 23 欄位 + runFeedback Part 4 搬遷 + cascade + thread 繼承）
- doGet Web App HTTP trigger（支援自動化測試）
- 信件處理按時間排序（舊→新）

### Fixed
- Fix 5: API 400 錯誤未標記為失敗 — 加 early return 跳過 Drive 存檔，掛失敗標籤
- Fix 4: Drive EML 改名日期偏移 — appsscript.json timeZone 改為 Asia/Taipei
- Fix 3: Sender 名單 `@` 萬用 row — _addSender guard + _getFeedbackLearnTarget null check
- Fix 2: runFeedback JSON 缺 sheetCodeCorrected 欄位
- Fix 1: Snapshot/Restore Drive 檔名還原 — snapshot 存 name+folderId，restore 加 rename+moveTo
- Sheet 重複 row — _appendLogRecords 改 upsert（同 messageId 失敗行更新而非 append）
- _retryFailedEmails 補上重試次數欄更新
- UI icon 改善：失敗時顯示 ⚠️ 而非 ✅

### Changed
- 效益統計 showStats 改為即時計算（讀當前設定值，非寫死值）

## [0.1.0] - 2026-03-14
### Added
- 專案初始化，從 IPWinner 主 repo 獨立
- Core processing pipeline: Gmail → Preprocessing → LLM → Drive → Label
- Gemini 3.0 Flash 分類 + 語義命名
- Drive EML/附件自動存檔
- Gmail 三層標籤系統
- Sender 名單自動學習
- Feedback loop（標籤修正 + 名稱修正 + consolidateLearning）
- 黃金測試集 + 定期評估
- 效益統計追蹤
- 排程自動處理 + 重試失敗機制

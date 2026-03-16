# TODO

## Active

### 測試基礎設施重構 — 格式保留還原 + Factory Reset（3/15 實作完成，待部署測試）

**部署**
- [ ] 複製 Code.gs 到 Apps Script
- [ ] 重新部署 Web App（新增 `factoryReset` route）

**測試 1（Snapshot → Restore 格式保留）**
- [ ] `?action=snapshot` 保存當前狀態
- [ ] 手動在處理紀錄加幾筆假資料、在 Sender 名單加一筆測試 sender
- [ ] `?action=restore` 還原
- [ ] `?action=getSheetData&tab=處理紀錄` 確認假資料已消失、原資料回來
- [ ] `?action=getSheetData&tab=Sender名單` 確認測試 sender 已消失、原資料回來
- [ ] 開 Sheet 視覺確認：標題列藍底白字、凍結列、欄寬、隱藏欄全部保留
- [ ] 開分類規則 tab 確認：10 組類別標題行有合併儲存格 + 背景色、規則行有淺色背景 + ID 粗體

**測試 2（Factory Reset）**
- [ ] `?action=factoryReset`
- [ ] 確認 Sender 名單 = 8 筆預設（TIPO, USPTO, EPO...）
- [ ] 確認分類規則 = 完整 30 條規則 + 10 組類別顏色
- [ ] 確認處理紀錄 = 空（只有標題列）
- [ ] 確認設定 = 預設值（信心閾值 0.8 等）
- [ ] 確認 Drive 專利/商標/未分類資料夾存在但內容清空

**測試 3（Async trigger）**
- [ ] `?action=consolidateLearning` → 回應 `{status: 'scheduled'}`（非 timeout）
- [ ] 等 30 秒後 `?action=status` → 確認 status = completed 或 running

---

### v3.2.1 修正與簡化（3/15 實作完成，待部署測試）

**部署**
- [ ] 複製 Code.gs 到 Apps Script
- [ ] 跑 `setupAll()` — 確認無報錯
- [ ] 選單 → 工具 → 更新 Sender 名單下拉選項 → 確認 header 變 `角色（C/A/G/S）`

**測試 1（標籤簡化）**
- [ ] `trialRun()` 跑 10-20 封
- [ ] 有案號信：確認標籤 = 收發碼 + 案件類型（專利/商標）+ [多案號]，**無「未分類」**
- [ ] 無案號信：確認標籤 = 收發碼 + 無案號，**無「未分類」**
- [ ] 垃圾信（已知S）：確認標籤只有「垃圾」，**無「未分類」「無案號」**
- [ ] 垃圾信（自動辨識）：確認標籤 = 垃圾 + 自動辨識來源，**無「未分類」「無案號」**

**測試 2（草稿過濾）**
- [ ] 在 Gmail Drafts 中有草稿的情況下跑 `trialRun()`
- [ ] 確認處理紀錄 Sheet 中無草稿信件出現

**測試 3（Spam sender 學習 — 完整 email）**
- [ ] 在 Gmail 把一封 `workspace-noreply@google.com` 的信移除「自動辨識來源」保留「垃圾」
- [ ] 跑 `runFeedback()`
- [ ] 確認 Sender 名單存的是 `workspace-noreply@google.com`，**不是** `@google.com`
- [ ] 對其他 google.com 信件跑處理，確認不受影響

**測試 4（多案號 bug 修正）**
- [ ] 找一封主旨單案號的 FA 信（同 thread 有多案號 TA）
- [ ] 跑 `trialRun()` 處理該信
- [ ] 確認只存到 1 個案號資料夾
- [ ] log 應有 `⚠️ 主旨單案號，過濾 thread_context 案號:` 訊息

**測試 5（備註截斷 80 字元）**
- [ ] 跑 `runFeedback()` 確認 sender 角色後，查 Sender 名單備註欄
- [ ] 確認長公司名（>40 字元）不被截斷（新上限 80）

**測試 6（小圖片過濾 <3KB）**
- [ ] 跑 `trialRun()` 處理含小圖附件的信（如 cohorizon.com）
- [ ] log 應有 `🗑️ 過濾超小圖片:` 訊息
- [ ] 確認 Drive 無 <3KB 的小圖片檔

**測試 7（客戶名不在語義名）**
- [ ] 跑 `trialRun()` 處理客戶信件
- [ ] 確認 eml_filename 不含客戶公司名（如「國昊」「慧盈」）
- [ ] 確認代理人名（如 BSKB、Tilleke）仍保留在語義名中

---

### v3.2 垃圾信標籤 + 自動辨識 + Sender 學習（3/15 實作完成，待部署測試）

**部署**
- [ ] 複製 Code.gs 到 Apps Script
- [ ] 跑 `_migrateSenderDropdown()` — 更新既有 Sender 名單 B 欄下拉（C/A/G/S）
- [ ] 跑 `_setLabelColors()` — 確認 `AI/收發碼/垃圾` 為灰色

**測試 1（新 sender 廣告信）**
- [ ] `trialRun()` 處理含未知 sender 的廣告信
- [ ] 確認碼=垃圾、有 `AI/狀態/自動辨識來源` 標籤
- [ ] 確認 EML 在 `未分類/垃圾/`（無附件）
- [ ] 確認 Sheet 來源確認狀態=pending

**測試 2（已知 Spam sender）**
- [ ] 在 Sender 名單填入某 sender 角色=S
- [ ] `trialRun()` 處理該 sender 的信
- [ ] 確認碼=垃圾、無 `AI/狀態/自動辨識來源` 標籤
- [ ] 確認無 EML 下載（Drive 無檔案）
- [ ] 確認 Sheet 來源確認狀態=na

**測試 3（有案號廣告不當垃圾）**
- [ ] 找一封有案號的廣告信（LLM 回 `廣告-` 前綴但有歸檔案號）
- [ ] 確認走正常 FX 流程、EML 存到正常案號資料夾

**測試 4（確認垃圾回授）**
- [ ] 在 Gmail 移除「自動辨識來源」標籤（保留「垃圾」）
- [ ] 跑 `runFeedback()`
- [ ] 確認 Sender 名單出現該 sender 角色=S
- [ ] 確認 Sheet 來源確認狀態=confirmed

**測試 5（修正垃圾回授）**
- [ ] 在 Gmail 移除「垃圾」+「自動辨識來源」標籤，掛上正確碼如 FC
- [ ] 跑 `runFeedback()`
- [ ] 確認 Sender 名單出現該 sender 角色=C
- [ ] 確認 EML 從 `未分類/垃圾/` 搬到正確資料夾
- [ ] 確認附件補下載到同資料夾
- [ ] 確認 Sheet 資料夾連結已更新

**測試 6（Sender 名單 dropdown）**
- [ ] 選單 → 工具 → 更新 Sender 名單下拉選項
- [ ] 確認 B 欄下拉有 C/A/G/S

**測試 7（標籤顏色）**
- [ ] 選單 → 工具 → 設定標籤顏色
- [ ] 確認 `AI/收發碼/垃圾` 為灰色

---

### v3.1 Bug 修復 + 新功能（3/15 實作完成，待部署測試）

**部署**
- [ ] 複製 Code.gs 到 Apps Script

**修復 1（收發碼方向）**— 同 thread FA+TA 標籤衝突導致 TA 誤標為 FA
- [ ] 在處理紀錄 Sheet 找同 thread 有 FA+TA 的 pending rows
- [ ] 跑 `runFeedback()`
- [ ] 確認 TA rows 的「來源確認狀態」= `confirmed`（非 `corrected`）
- [ ] 確認「最終收發碼」欄位沒有被寫入 FA

**修復 2（碼改名）**— 收發碼修正後 Drive EML/附件檔名未更新
- [ ] 在 Gmail 手動把某封信的收發碼標籤從 FX 改為 FA
- [ ] 跑 `runFeedback()`
- [ ] 確認 Drive 對應資料夾的 EML 檔名中收發碼已從 FX 變 FA
- [ ] log 應有 `📄 碼改名:` 訊息

**修復 3（簽名圖片過濾）**— Outlook 簽名圖被當一般附件存入 Drive
- [ ] 跑 `processEmails()` 處理含簽名圖的信（如 cohorizon.com 來信）
- [ ] log 應有 `🗑️ 過濾簽名圖片:` 訊息
- [ ] 確認 Drive 資料夾不再有 <5KB 的 jpg/png 小圖

**修復 4（thread_context 污染）**— 單案號 FA 被 LLM 誤歸多案號
- [ ] 找一封主旨只有 1 個案號的信（如 KOIS18001TFR1），同 thread 有多案號回信
- [ ] 跑 `processEmails()`
- [ ] 確認只存到 1 個案號資料夾（非 3 個）
- [ ] 若仍多案號，log 應有 `ℹ️ 主旨單案號但 LLM 判定` 警告

**新功能（公司名稱查詢）**— 回授確認 sender 角色時自動查公司名
- [ ] 在處理紀錄 Sheet 找 pending + 自動辨識來源的 rows
- [ ] 跑 `runFeedback()`
- [ ] 確認 Sender 名單備註欄顯示 `AI推斷確認-{公司名}` 格式
- [ ] 若網站不通（如 cohorizon.com），備註應仍為 `AI推斷確認`（優雅降級）

### 部署 + 全面驗證（3/15 部署後按順序跑）

**Step 0：部署**
- [ ] 複製 Code.gs 到 Apps Script
- [ ] 跑 `setupAll()` — 建立 3 個新 Sheet tab + 設定 Sheet 加「評估通知 Email」

**Step 1：Gmail 標籤系統**
- [ ] 執行 `resetAllAILabels()` — Gmail 確認三層巢狀結構 AI/收發碼/FC、AI/狀態/待確認 等
- [ ] 選單「工具 → 設定標籤顏色」— 確認失敗類紅色、待確認類黃色
- [ ] `trialRun()` 跑幾封 — 確認標籤掛在 `AI/收發碼/FC` 而非 `AI/FC`
- [ ] 模擬處理失敗（暫時改壞 API key）— 確認 Sheet 寫 `[失敗:1]`，重試後 `[放棄]` + 紅標籤

**Step 2：回饋機制**
- [ ] 標籤修正回饋：移除/修改收發碼標籤 → `runFeedback()` → Sender 名單更新
- [ ] 名稱修正回饋：Sheet 填「修正後名稱」→ `runFeedback()` → Drive 檔案改名
- [ ] 直填收發碼回饋：Sheet 填「最終收發碼」→ `runFeedback()` → Sender 名單更新
- [ ] 回授偵測在 `AI/收發碼/` 路徑下正常偵測
- [ ] 處理 68 筆 pending 狀態（確認 sender 角色）

**Step 3：學習整理 Pipeline（Fix 1/2/3）**
- [ ] Fix 1：Sheet 填 3+ 筆修正 → `runFeedback()` → `consolidateLearning()` → 確認「分類規則」Sheet 底部有新 L{nn} 規則 → `trialRun()` 確認出現在 prompt
- [ ] Fix 2：確認已整理的紀錄修正來源欄有 `+consolidated` → 再跑 LLM 處理，`%%CORRECTIONS%%` 不含這些紀錄
- [ ] Fix 3：處理一封和修正紀錄類似的信件 → 查 log 有無 `📎 參考修正紀錄: xxx`

**Step 4：SYSTEM_PROMPT 微調驗證（101 封測試結果）**
- [ ] `trialRun()` 驗證以下 3 點改善：
  - [ ] 「告知-確認收到」→ 應變成「告知-確認收到{具體事項}」
  - [ ] 漏事項碼的信 → 應補上事項碼
  - [ ] `BSKB送件報告` → 應變成 `送件報告-BSKB`
- [ ] 測試「匯出 LLM Prompt 文件」確認 Doc 在專案資料夾

**Step 5：回授評估系統**
- [ ] `seedGoldenSetFromExisting()` — 從既有修正紀錄匯入黃金測試集
- [ ] `runFeedback()` 後確認「黃金測試集」自動新增一列
- [ ] 選單「執行評估測試」→ 確認「評估紀錄」有 detail + summary rows
- [ ] 迴歸偵測：手動改 golden set expected 值 → 重跑評估 → 確認 summary row 標紅 + email
- [ ] `_updateCorrectionStats()` → 確認「修正統計」Tab 有本週數據
- [ ] `consolidateLearning()` → 確認用 Gemini Pro + 60s 後自動觸發 `runEvaluation()`

### v3.3 Excel V22 規則同步（3/15 實作完成，待部署測試）

**已更新內容：**
- [x] SYSTEM_PROMPT 事項碼清單擴充（+P-暫/P-CA/P-CIP/M-*/D-CA/D-CIP/D-似/T-分/申優n/DEC+ASG）
- [x] 前綴詞彙補充（TC +確認收文-/說明/建議；FC +提出；FA +回覆/是否/提供）
- [x] 20 個新 EML 命名模板加入 SYSTEM_PROMPT（暫時案/CA案/CIP案/商品服務清單/DEC+ASG/優先權等）
- [x] Dn 版本號推斷規則加入 SYSTEM_PROMPT
- [x] 商品服務清單-(n, m類) 命名子模式加入 SYSTEM_PROMPT
- [x] V3 設計文件同步更新

**部署**
- [ ] 複製 Code.gs 到 Apps Script

**測試**
- [ ] `trialRun()` 處理幾封含暫時案/CA案/CIP案相關信件，確認新事項碼正確產出
- [ ] 確認現有模板不受影響（回歸測試 — 跑幾封一般新案/OA/送件報告信件）
- [ ] 確認 Dn 版本號推斷：找一封回覆「初稿」的信，確認 LLM 產出 D0
- [ ] 確認商品服務清單命名：找一封含商品服務清單附件的信，確認類別正確

### 效益統計功能（3/15 實作完成，待部署測試）

**部署**
- [ ] 複製 Code.gs 到 Apps Script
- [ ] 跑 `setupAll()` — 確認「設定」Sheet 有 `MANUAL_MINUTES_PER_EMAIL` = 5.5

**測試 1（自動建立 + 首次寫入）**
- [ ] 執行 `processEmails()`
- [ ] 確認自動建立「效益統計」Sheet，有標題列（藍底白字）
- [ ] 確認今天的行有正確數字：處理封數、省下時間、token 用量、API 成本

**測試 2（累加不重複）**
- [ ] 再跑一次 `processEmails()`
- [ ] 確認今天仍然只有 1 行，數字是累加的

**測試 3（showStats 效益區塊）**
- [ ] 執行 `showStats()`
- [ ] 確認彈窗底部有「📈 自動化效益」區塊，含本週/本月/累計數字

**測試 4（基準分鐘數可調）**
- [ ] 到「設定」Sheet 把 `MANUAL_MINUTES_PER_EMAIL` 改成 10
- [ ] 再跑 `processEmails()`
- [ ] 確認新增的省下時間按 10 分鐘/封計算
- [ ] 改回 5.5

**測試 5（週回顧補正）**
- [ ] 手動改「效益統計」Sheet 某天的處理封數為錯誤數字
- [ ] 執行 `_reconcileBenefitsStats()`
- [ ] 確認數字被修正為 LOG Sheet 的實際值
- [ ] 確認累計欄位也跟著更新

---

### Phase 1 待確認

- [ ] **排程與回授頻率 review** — 目前早上 7-8 點排程跑一次；回授機制（`consolidateLearning`）是否改為每 6 小時整理過去 48 小時？原本 24 小時設計代表有問題的信件頂多再跑一次。考量已有「失敗 3 分鐘後自動重試」機制，12 小時可能就夠？需確認最佳頻率

### Phase 2 開發（全面驗證通過後啟動）

- [ ] 確認 Phase 2 需求範圍
- [ ] 附件重新命名（D/A/F 版本管理）
- [ ] 精確子類型碼自動判斷
- [ ] **Unknown sender 附件安全** — 決定防護做法（是否對 FX/TX 未知來源信件不下載附件？掃毒 API？僅儲存不開啟？）避免 Drive 存入惡意檔案
- [ ] **Token 消耗量全面盤點** — Phase 2 功能完成後，盤點所有 Gemini API 呼叫的 token 消耗：每封信分類、`consolidateLearning` 歸納、回授評估（`runEvaluation`）、未來新增的任何 LLM 呼叫。計算各環節單次成本 + 每日/每週總成本估算

### Phase 3 規劃（客戶端導入後）

- [ ] **附件版本標示（D/A/F 第幾版）** — 是否需要查詢 Drive 過往檔案才能正確標示版本號？還是根據 email 上下文內容就能判斷？可能要實際導入客戶端才有足夠案例驗證
- [ ] **Prompt injection 防護** — 郵件主題/內文可能包含惡意 prompt attack 內容，需加入輸入清洗或 output 驗證機制
- [ ] **Unknown sender / 自動辨識附件政策** — 未知來源（FX/TX）和自動辨識來源的信件，是否一律不下載附件？待 Phase 2 安全方案確定後實作
- [ ] **自動辨識狀態追蹤** — 建立定期檢查函式，掃描之前被標為「自動辨識來源」的信件，確認哪些已被人工確認/修正、哪些仍 pending，產出統計報告

---

## Completed

### 2026-03-15
- [x] Bug fix: LLM confidence 遺失未被偵測導致 Sheet 誤標失敗（三層修復：`_parseGeminiResponse` 區分遺失 vs 0、`_callGeminiBatch` 不完整結果觸發重試+fallback、Sheet 紀錄邏輯不再因 confidence=0 標失敗）
- [x] 101 封試跑完成 — 0 失敗、信心全 ≥ 0.95、收發碼分布合理
- [x] Drive 資料夾結構正確 — 49 資料夾、143 檔案（100 EML + 43 附件）
- [x] 同 thread 事項碼對齊正確 — 所有案號資料夾內 OA/ROA 一致
- [x] dates_found 覆蓋率 64%（合理，非每封都有日期）
- [x] 多案號拆多行紀錄正常運作（3 組共 9 筆）
- [x] 排程穩定 — 台北早上 7-8 點自動跑，已設立

### 2026-03-14
- [x] 結構化期限提取 — `_selectDeadline()` + `_extractDatesFromText()`，LLM 分類日期、程式碼選期限
- [x] `_extractMainBody()` — 從 HTML 切割主文，排除引用和簽名檔內容
- [x] Thread 上下文 — `_getThreadSubjects()` + thread_context 傳入 LLM
- [x] Thread 事項碼對齊 — `_alignThreadEventCodes()` 後處理，同 thread 取最高 OA/ROA 序號
- [x] Drive 資料夾快取 — `_createFolderCache()` 避免重複查詢同一資料夾
- [x] LLM 回應解析重構 — `_parseGeminiResponse()` + 單封重試（最多 5 次）
- [x] JSON 修復強化 — `_repairJson()` 新增陣列截斷和通用未閉合括號修復
- [x] SYSTEM_PROMPT 大幅更新 — OA/ROA 判斷規則、OA 縮寫去重、dates_found 輸出、correction_applied、廣告前綴、FA/FC 前綴精確語義
- [x] 分類規則 Sheet 新增 L07-L10（語義名規則 + 期限選擇規則）
- [x] Gmail 標籤 — `resetAllAILabels()` + 確保父標籤先建立
- [x] 自動續行機制 — `_scheduleOnce()` / `_continueProcessing()` / `_retryFailedEmails()`
- [x] Sheet 欄位新增 — col 12 資料夾連結、col 21 dates_found，全部索引偏移
- [x] 多案號多行紀錄 — 每案號一行，各自對應資料夾連結
- [x] consolidateLearning 自動寫入分類規則 Sheet + 標記 consolidated
- [x] CONFIG 調整 — MAX_TOKENS 4096、BODY_SNIPPET_LENGTH 10000、MAX_RETRY 5
- [x] 逾時安全檢查 — 批次迴圈內加 timeout check
- [x] 建立 `docs/product-plan.md`（CEO Product Plan）
- [x] 建立 `docs/engineering-plan.md`（Engineering Architecture）
- [x] 推送 GitHub（初始 commit）
- [x] 建立 `TODO.md`

### 2026-03-13
- [x] 分類規則 Sheet 美化（8 色碼分類 + 標題行）
- [x] LLM Prompt 五大 Bug 修復（TA 期限/OA 去重/過期判斷/語氣/日期不一致）
- [x] email_date 傳入 LLM
- [x] 截止日改為強制規則
- [x] Drive 改名時區 Bug 修復（getSpreadsheetTimeZone）
- [x] Sender 名單去重（_addSender 寫入前掃描）
- [x] LLM Prompt 文件管理系統（exportPromptDoc + consolidateLearning + 週排程）
- [x] Debug Log 強化

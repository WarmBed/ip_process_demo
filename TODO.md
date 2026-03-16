# TODO

## Active

### 👤 待驗證（需手動操作）

**修正案號功能（deploy @21）**
- [ ] Step 1：執行 `setupAll()`，確認 LOG sheet col 24 = 修正案號
- [ ] Step 2+3：找一封無案號信件 → col 24 填正確案號 → `?action=runFeedback` → 確認搬遷 + cascade
- [ ] Step 4：待有新信件時驗證 thread 繼承

**Fix 4: Drive EML 改名日期 Mismatch（deploy @20）**
- [ ] snapshot → swapLabels FA→FC → runFeedback → `renamed ≥ 1` → Drive 確認 → restore

**Fix 1: Snapshot restore rename 完整驗證**
- [ ] 待下次 swapLabels 測試時一併驗證

**迴歸偵測** — 需手動改 golden set + 確認 email
- [ ] 改壞 golden set → runEvaluation → 確認 summary 標紅 + 收到通知 email → 改回

---

### 待觀察 / 低優先

- [ ] **Gmail API Batch 優化** — 當 restore Gmail API calls > 200 時評估改用 batch
- [ ] **排程與回授頻率 review** — consolidateLearning 是否改為每 6/12 小時？

### Phase 2 開發（全面驗證通過後啟動）

- [ ] 確認 Phase 2 需求範圍
- [ ] 附件重新命名（D/A/F 版本管理）
- [ ] 精確子類型碼自動判斷
- [ ] **Unknown sender 附件安全**
- [ ] **Token 消耗量全面盤點**

### Phase 3 規劃（客戶端導入後）

- [ ] 附件版本標示（D/A/F 第幾版）
- [ ] Prompt injection 防護
- [ ] Unknown sender / 自動辨識附件政策
- [ ] 自動辨識狀態追蹤

---

## Completed

### 2026-03-16（Fix 5: API 400 失敗處理 — deploy @25-@28）

**Fix 5: API 400 錯誤未標記為失敗**
- 背景：API 400 時 `_callGeminiBatch` 回傳 FAIL_RESULT（confidence=0, emlFilename=null），但進入 `_determineFinalResult` 產生錯誤的收發碼/problemLabel，且仍執行 Drive 存檔
- 修正：
  1. `_processEmailBatch` 加 API 失敗 early return（跳過 `_determineFinalResult`/`_applyLabels`/`_saveEmailToDrive`），掛 `AI/錯誤/處理失敗` 標籤
  2. 正常處理成功後移除失敗標籤（排程重跑路徑）
  3. `_appendLogRecords` 改 upsert：同 messageId 有 `[失敗:N]` 時更新該行+重試次數+1，不 append 新行
  4. `_retryFailedEmails` 補上重試次數欄更新（col 19）
  5. UI icon 改善：失敗時 `⚠️`，分類 icon 區分嚴重度（`✅`/`⚠️`/`🔴`）
  6. 信件按時間排序（舊→新），`trialRun` 和 `processEmails` 都生效
- [x] 10 封 API 400 → 全部 `[失敗:1]`，失敗計數 = 10，無 Drive 存檔 ✅
- [x] 重跑 → upsert 更新同行，不產生重複 row ✅
- [x] 改回 API key → 重跑成功，重試次數正確遞增 ✅

### 2026-03-16（驗證 3 Fix + 模擬失敗 + 效益統計）

**Fix 3 驗證：Sender 名單不該有 `@` row** — ✅ 通過
- [x] 手動刪除髒資料 + 程式碼兩層防守確認

**Fix 2 驗證：runFeedback JSON 有 `sheetCodeCorrected` 欄位** — ✅ 通過
- [x] `?action=runFeedback` 回應含 `"sheetCodeCorrected": 0`

**模擬處理失敗** — ✅ 通過（deploy @26-@28）
- [x] 改壞 API key → 10 封全部 `[失敗:1]`，無 Drive 存檔
- [x] upsert 更新同行，重試次數 +1
- [x] 改回 API key → 重跑成功，重試次數正確遞增

**效益統計 UI 彈窗** — ✅ 通過（含 bug fix）
- [x] showStats 彈窗正常 + 設定值即時生效

### 2026-03-16（測試後修正 deploy @19）

**Fix 3: Sender `@` 萬用 row bug**
- 背景：`_getFeedbackLearnTarget` 在 sender 為空時回傳 `'@' + ''` = `'@'`，`_addSender` 無驗證直接寫入不合法 key
- 修正：`_getFeedbackLearnTarget` 加 `if (!domain) return null`；`_addSender` 加 guard clause 拒絕空/`@`/過短 key
- 測試方法：`?action=getSheetData&tab=Sender名單&search=@` 檢查是否有 `@` row
- ✅ 預期：Sender名單無 `@` row；空 sender 不再觸發學習
- ❌ 可能錯誤：
  - snapshot 本身已有 `@` row → 需手動刪除
  - 其他路徑繞過 guard → `_addSender` 是唯一寫入點，已覆蓋
- [x] 已部署 @19

**Fix 2: runFeedback Part 3 counter 缺漏**
- 背景：Part 3（Sheet 直填收發碼）用獨立 `sheetCodeLearned` counter，不計入 feedbackStats，JSON 回傳 `corrected: 0` 但實際有修正
- 修正：Part 3 新增 `sheetCodeCorrected` counter，每次更新 correction source 時 increment，加入 feedbackStats JSON
- 測試方法：下次 `runFeedback` 檢查 JSON 回應
- ✅ 預期：JSON 有 `sheetCodeCorrected` 欄位，值 > 0 當 Part 3 有處理時
- ❌ 可能錯誤：
  - Part 3 跳過所有 row → sheetCodeCorrected=0（正確行為）
  - 欄位名與前端不符 → 純 JSON 回報，無前端依賴
- [x] 已部署 @19

**Fix 1: Snapshot/Restore Drive 檔名還原**
- 背景：snapshot 只存 file ID，restore 只 trash 新檔案但不還原改名/搬移的舊檔案，測試後 Drive 殘留修改過的名字
- 修正：`_snapshotDriveFileIds()` → `_snapshotDriveFiles()` 存 `{id, name, folderId}`；restore 加 rename + moveTo 邏輯；向下相容舊格式
- 測試方法：Snapshot → swapLabels 改碼 → runFeedback → Restore → 確認 Drive 檔名改回
- ✅ 預期：restore 後 Drive 檔案名稱和位置完全回復；log 顯示 `renamed X, moved X`
- ❌ 可能錯誤：
  - 舊格式 snapshot 無名稱資訊 → 向下相容只做 trash（與舊行為一致）
  - DriveApp API quota → rename/move 各算一次 API call，大量檔案可能逾時
- [x] 已部署 @19

**v3.1 修復 2（碼改名）** — 除 Drive 日期 bug 外全部通過
- [x] swapLabels FA→FC（同方向碼）+ removeLabel 自動辨識來源
- [x] runFeedback → status=`corrected`, finalCode=`FC`, corrSource=`tag_change+sheet_code` ✅
- [x] Sender 學習：`@tilleke.com = C`（FA→FC 的 C） ✅
- [x] 黃金測試集新增 ✅
- [x] Restore 驗證：Sheet 回復 pending ✅，Sender 清除 ✅，Gmail labels 回復 ✅

**v3.2 測試 5（修正垃圾回授）** — ✅ 全部通過
- [x] swapLabels 垃圾→FC + removeLabel 自動辨識來源
- [x] runFeedback → status=`corrected`, finalCode=`FC`, corrSource=`tag_change+sheet_code` ✅
- [x] Sender 名單：`@questel.com` 角色=`C`，備註=`Sheet直填垃圾→FC` ✅
- [x] Drive 搬遷 ✅
- [x] Restore 驗證：Sheet 回復 pending ✅，Sender 清除 ✅，Gmail labels 回復 ✅
- [x] ~~已知限制：snapshot/restore 不復原 Drive 檔名~~ → Fix 1 已解決

### 2026-03-16（自動測試 — 第二輪）

**Code.gs doGet 補 3 actions + deploy @17**
- 背景：效益統計、重試失敗等功能無法透過 doGet 觸發，自動測試無法執行
- 修正：在 doGet switch 加入 `updateBenefitsStats`（→ `_reconcileBenefitsStats()`）、`reconcileBenefitsStats`、`retryFailed`（→ `_retryFailedEmails()`）
- 測試方法：clasp push + deploy → Chrome navigate `?action=ping`
- ✅ 預期：ping 回傳 `{"status":"ok"}`
- ❌ 可能錯誤：
  - deploy 失敗 → clasp token 過期，需重新 `clasp login`
  - `_updateBenefitsStats()` 直接呼叫無效 → 改用 `_reconcileBenefitsStats()` 從 log 重建
- [x] ping 回傳 `{"status":"ok","timestamp":"2026-03-16T19:38:22.418Z","_duration_ms":1}`

**Snapshot 安全網**
- 背景：runFeedback 會處理所有 pending rows，需要備份以便 restore
- 修正：N/A（測試前置）
- 測試方法：`?action=snapshot`
- ✅ 預期：所有 Sheet tabs + Drive files + Gmail labels 備份成功
- ❌ 可能錯誤：
  - 處理紀錄 >100 rows 導致 payload 過大 → 已分 chunks（8 chunks）
  - Drive 檔案過多逾時 → 只存 file IDs 不存內容
- [x] Snapshot 完成：125 rows（8 chunks）、149 Drive files、76 Gmail threads、耗時 34.8s

**Step 2: 修正紀錄注入 prompt**
- 背景：修正紀錄（如「国昊天诚→Cohorizon」）若為 active 應被注入 LLM prompt，consolidated 則不注入
- 修正：N/A（驗證既有行為）
- 測試方法：`?action=getSheetData&tab=處理紀錄&search=name_change` 確認狀態 → `?action=trialRun&limit=10` → `?action=getLastLog&search=參考修正紀錄`
- ✅ 預期：全部 consolidated → log 無 `📎 參考修正紀錄`（正確不注入）；若有 active → log 有此訊息
- ❌ 可能錯誤：
  - 修正紀錄仍為 active 但未被注入 → `_getActiveCorrections()` 查詢 bug
  - consolidated 後仍被注入 → 過濾條件未排除 `+consolidated`
- [x] 3 筆修正紀錄全部 `name_change+consolidated`
- [x] trialRun 10 封成功（10 autoIdentify, 66s）
- [x] getLastLog matchCount=0 → 正確不注入 ✅ PASS

**Step 3: FA+TA 衝突 + 垃圾信確認（合併測試）**
- 背景：同 thread 的 FA 和 TA 信件，runFeedback 確認時 TA 不應被改為 FA。垃圾信確認後應學習 Sender
- 修正：N/A（驗證既有行為）
- 測試方法：
  1. 取 KOIT20004TUS7 的 TA msgId `19ce4a93f5078d7b` + 垃圾信 siltstone msgId `19ce85ba8837ea27`
  2. 兩封都 addLabel `AI/狀態/自動辨識來源` → removeLabel（模擬使用者確認）
  3. `?action=runFeedback` 一次處理所有 109 筆 pending
  4. 分開驗證兩個場景
- ✅ 預期：
  - FA+TA：TA row 狀態=confirmed，碼仍為 TA（非 corrected/FA）
  - 垃圾信：siltstone 狀態=confirmed，Sender名單出現角色=S
- ❌ 可能錯誤：
  - TA 被 runFeedback 改成 FA → `_checkFeedback` 的 thread 比對邏輯 bug
  - Sender 學習未觸發 → `_addSender` 條件未涵蓋垃圾確認
- [x] runFeedback：checked 109, confirmed 3, corrected 0
- [x] KOIT20004TUS7 TA row (`19ce4a93f5078d7b`): 狀態=`confirmed`，碼=**TA** ✅
- [x] KOIT20004TUS7 FA row (`19ce3f89e553f539`): 狀態=`confirmed`，碼=**FA** ✅
- [x] siltstone (`19ce85ba8837ea27`): 狀態=`confirmed`，碼=垃圾 ✅
- [x] Sender名單：`jacob.varghese@siltstone.com` 角色=**S**，備註=`AI推斷確認-Siltstone Capital` ✅

**Step 4: 回授評估系統**
- 背景：黃金測試集 → 定期評估 → 修正統計，形成品質迴圈
- 修正：N/A（驗證既有行為）
- 測試方法：
  1. `?action=seedGoldenSet` → 確認黃金測試集有資料
  2. 搜尋 KOIT20004TUS7 → 確認 Step 3 confirmed 的 rows 自動加入
  3. `?action=runEvaluation`（async 排程）→ 90s 後查評估紀錄
  4. `?action=updateCorrectionStats` → 查修正統計
- ✅ 預期：
  - 黃金測試集有 KOIT20004TUS7 confirmed rows
  - 評估紀錄有 detail rows（每筆 golden set item）+ summary row
  - 修正統計有本週數據
- ❌ 可能錯誤：
  - seedGoldenSet 重複加入 → 應 deduplicate by messageId
  - runEvaluation async trigger 未執行 → 檢查 `?action=status`
- [x] seedGoldenSet 成功
- [x] KOIT20004TUS7 的 TA+FA 兩筆 confirmed rows 自動加入黃金測試集 ✅
- [x] runEvaluation 完成：eval-20260317-0352，9 筆 detail + 1 summary
- [x] 評估結果：收發碼正確率 **100%**，語義名平均分數 **0.82**，pass rate **55.6%**
- [x] updateCorrectionStats 成功：本週 120 封，3 筆語義名修正，錯誤率 **2.5%** ✅

**Step 5: 效益統計**
- 背景：需驗證 `updateBenefitsStats`（新加的 doGet action）能從 log 重建統計，且重複執行不會產生重複 rows
- 修正：doGet `updateBenefitsStats` 和 `reconcileBenefitsStats` 都指向 `_reconcileBenefitsStats()`（從 log 重建）
- 測試方法：
  1. 記錄現有效益統計（2 天，30 封）
  2. `?action=updateBenefitsStats`（第一次）
  3. `?action=updateBenefitsStats`（第二次，驗證不重複）
  4. 再查效益統計確認 row 數不變
- ✅ 預期：從 log 重建完整日數據，重複執行不新增重複 rows，累計值正確
- ❌ 可能錯誤：
  - 日期比對失敗導致重複 rows → `_reconcileBenefitsStats` 的 existingDates 查詢需正確
  - 失敗/放棄紀錄被計入 → 應排除 `[失敗:` 和 `[放棄]` 前綴
- [x] 第一次 updateBenefitsStats：從 2 天擴展到 **5 天**（3/13~3/17，從 log 重建歷史）
- [x] 第二次 updateBenefitsStats：仍為 **5 天**（非 10 天），同日 row 更新而非新增 ✅
- [x] 最終數據：**134 封處理**、省下 **12.28 小時**、API 成本 **$0.11 USD**、累計值逐日遞增 ✅

### 2026-03-16（第一輪）

**部署** — clasp push + deploy，v3.3.2 @6→@16（含多次迭代修正）
- [x] Code.gs 透過 clasp 推送（不需手動複製）
- [x] setupAll() 無報錯、Sheet tabs 正確
- [x] Sender 名單 dropdown 已更新（C/A/G/S）
- [x] 標籤顏色已設定（垃圾=灰色）

**測試基礎設施重構 — 格式保留還原 + Factory Reset**
- [x] Snapshot → Restore 完整還原（Sheet + Drive 14 files + Gmail 8 threads → +10 → restore 精確回到 14）
- [x] Factory Reset（Drive 0, Gmail 0, Sheet 7 tabs rebuilt）
- [x] Async trigger（consolidateLearning scheduled + status completed）

**v3.2.1 修正與簡化**
- [x] 標籤簡化：收發碼+案件類型，無多餘「未分類」；垃圾信標籤正確
- [x] 草稿過濾：trialRun 50封處理紀錄無草稿
- [x] Spam sender 學習（完整 email）：lexisnexis → Sender名單 S + bug fix v3.3.2@8
- [x] 多案號 bug 修正：KOIS23004BGB5 + KOIS18001TFR1 thread 3封驗證（v3.3.2@10, 100封）
- [x] 備註截斷 80 字元：⏭️ 跳過（測試資料無長公司名）
- [x] 小圖片過濾 <3KB：3 張 clip_image 過濾成功
- [x] 客戶名不在語義名：eml_filename 不含客戶公司名

**Bug fix: Sender備註缺少公司名**（v3.3.2@12）
- [x] _lookupDomainName 快取過期 + _addSender 備註更新 + Part 1.5 備註補查 + title cleanup
- [x] tronfuture.com → Tron Future 創未來科技 ✅；lexisnexis → 無法辨識公司 ✅

**回授改名測試**（v3.3.2@12）
- [x] 3 筆修正（国昊/國昊/国昊天诚 → Cohorizon）→ renamed: 6, renameErrors: 0
- [x] Rows 32/79/107 全部改名成功 + 3 筆自動加入黃金測試集

**consolidateLearning 學習整理**（v3.3.2@16）
- [x] 根因：`GEMINI_CONSOLIDATION_MODEL` 指向已過期的 `gemini-2.5-pro-preview-06-05`（404）
- [x] 修正：統一改為 `gemini-3-flash-preview` + 加強 error logging
- [x] 重跑結果：3 筆修正 → 1 條 L11 規則（KOI 前綴用 Cohorizon）
- [x] Rows 32/79/107 修正來源標記 `name_change+consolidated` ✅
- [x] runEvaluation 60 秒後自動觸發 ✅

**以下項目已在上述測試中覆蓋（原分散在 v3.1/v3.2/全面驗證）：**
- [x] v3.1 修復 3（簽名圖片過濾）→ v3.2.1 測試 6（小圖片 <3KB 過濾成功）
- [x] v3.1 修復 4（thread_context 污染）→ v3.2.1 測試 4（多案號 KOIS18001TFR1 thread 驗證通過）
- [x] v3.1 新功能（公司名稱查詢）→ Sender備註 bug fix（tronfuture.com + lexisnexis 驗證通過）
- [x] v3.2 測試 2（已知 Spam sender）→ v3.2.1 測試 3（lexisnexis 角色=S，無自動辨識來源標籤）
- [x] v3.2 測試 4（確認垃圾回授）→ v3.2.1 測試 3（runFeedback confirmed + Sender名單更新）
- [x] v3.2 測試 6（dropdown）→ 部署時已確認 C/A/G/S
- [x] v3.2 測試 7（標籤顏色）→ 部署時已設定
- [x] Step 0 部署 → clasp push + deploy 完成
- [x] Step 1 標籤系統 → trialRun 確認三層巢狀標籤正確
- [x] Step 2 名稱修正回饋 → 回授改名測試通過（3 筆 Cohorizon）
- [x] Step 2 標籤修正回饋 → Spam sender 確認流程通過
- [x] Step 3 Fix 1（consolidateLearning → L11 規則）→ 通過
- [x] Step 3 Fix 2（+consolidated 標記 + 排除 few-shot）→ 通過
- [x] Step 5 consolidateLearning 觸發 runEvaluation → 通過
- [x] v3.3 SYSTEM_PROMPT 更新已部署（含在每次 clasp push 中）
- [x] Step 4 SYSTEM_PROMPT 微調 — 50/100 封 trialRun 已用最新 PROMPT，結果正確（告知-確認收到{事項}、送件報告-BSKB 等格式已驗證）
- [x] v3.3 Excel V22 規則同步 — 所有 SYSTEM_PROMPT 更新已含在每次 clasp push，trialRun 已驗證新事項碼正確產出

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

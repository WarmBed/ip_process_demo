/**
 * ============================================================
 * IP Winner Email Processor V3 — deployed @28 2026-03-16 16:25
 * ============================================================
 *
 * 【新安裝】
 *   1. 到 https://script.google.com 新建專案
 *   2. 把這整份程式碼貼到 Code.gs（覆蓋原本的內容）
 *   3. 點左邊齒輪「專案設定」→ 勾選「在編輯器中顯示 appsscript.json」
 *      → 打開 appsscript.json → 貼上下面這段：
 *
 *   {
 *     "timeZone": "Asia/Taipei",
 *     "dependencies": {},
 *     "exceptionLogging": "STACKDRIVER",
 *     "runtimeVersion": "V8",
 *     "oauthScopes": [
 *       "https://www.googleapis.com/auth/gmail.modify",
 *       "https://www.googleapis.com/auth/gmail.labels",
 *       "https://www.googleapis.com/auth/gmail.readonly",
 *       "https://www.googleapis.com/auth/spreadsheets",
 *       "https://www.googleapis.com/auth/drive",
 *       "https://www.googleapis.com/auth/script.external_request",
 *       "https://www.googleapis.com/auth/script.scriptapp",
 *       "https://www.googleapis.com/auth/documents"
 *     ]
 *   }
 *
 *   4. 左側選單點「服務」(+) → 搜尋「Gmail API」→ 點「新增」
 *      （標籤顏色設定功能需要 Gmail REST API）
 *   5. 在「專案設定」→「Script 屬性」新增：
 *      GEMINI_API_KEY = 你的 Gemini API Key
 *   6. 在編輯器中選擇 setupAll 函式 → 按 ▶ 執行
 *      （會自動建立 Google Sheet、Drive 資料夾、Gmail 標籤）
 *   7. 到自動建立的 Google Sheet，上方會有「📧 Email Processor V3」選單
 *   8. 選單 → 工具 → 設定標籤顏色（紅=錯誤、黃=待確認、灰=垃圾）
 *   9. 到「Sender名單」Sheet 填入已知 sender
 *  10. 從選單點「🧪 試跑 → 試跑 50 封」開始測試
 *
 * 【升級（覆蓋 Code.gs 後）】
 *   1. 把新版 Code.gs 貼上覆蓋舊版
 *   2. 若左側「服務」尚未加入 Gmail API → 點 (+) 搜尋「Gmail API」新增
 *   3. 選擇 setupAll 函式 → 按 ▶ 執行（會自動補建新的 Sheet tab，不影響既有資料）
 *   4. 選單 → 工具 → 設定標籤顏色（補設新標籤顏色）
 *   5. 若 Sender名單下拉選項需更新 → 選單 → 工具 → 更新 Sender 名單下拉選項
 *
 * ============================================================
 */

// ===================== 設定 =====================

const CONFIG = {
  PROJECT_FOLDER_NAME: 'Email自動整理v2',
  SPREADSHEET_NAME: 'Email自動整理v2-設定檔',

  GEMINI_MODEL: 'gemini-3-flash-preview',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/',
  GEMINI_MAX_TOKENS: 4096,
  GEMINI_TEMPERATURE: 0.1,

  BATCH_SIZE: 20,
  CONFIDENCE_AUTO: 0.8,
  CONFIDENCE_INFER: 0.6,
  CONFIDENCE_LOW: 0.5,
  BODY_SNIPPET_LENGTH: 10000,
  TIMEOUT_SAFETY_MS: 25 * 60 * 1000,
  MAX_RETRY: 5,

  PROMPT_DOC_NAME: 'LLM Prompt 文件',

  SHEET_NAMES: {
    SENDERS: 'Sender名單',
    LOG: '處理紀錄',
    RULES: '分類規則',
    SETTINGS: '設定',
    GOLDEN_SET: '黃金測試集',
    EVAL_RUNS: '評估紀錄',
    CORRECTION_STATS: '修正統計',
    BENEFITS: '效益統計',
  },

  // Gemini Flash token 單價 (USD per token)
  GEMINI_INPUT_PRICE_PER_TOKEN: 0.10 / 1000000,   // $0.10 per 1M input tokens
  GEMINI_OUTPUT_PRICE_PER_TOKEN: 0.40 / 1000000,  // $0.40 per 1M output tokens

  LABEL_PREFIX: 'AI',

  // word boundary 防止從 base64 或亂碼中誤匹配假案號
  CASE_NUMBER_REGEX: /(?<![A-Za-z0-9])[A-Z0-9]{4}\d{5}[PMDTABCW][A-Z]{2}\d*(?![A-Za-z0-9])/g,

  OWN_DOMAINS: ['ipwinner.com', 'ipwinner.com.tw'],

  // 公共 email 服務 — 不能用 domain 代表一個客戶，必須用完整 email
  PUBLIC_DOMAINS: [
    'gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com',
    'live.com', 'msn.com', 'yahoo.com', 'yahoo.com.tw',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com', 'mail.com', 'protonmail.com', 'proton.me',
    'qq.com', '163.com', '126.com', 'sina.com',
    'pchome.com.tw', 'seed.net.tw', 'hinet.net',
  ],

  GOV_DOMAINS: [
    'tipo.gov.tw', 'gov.tw', 'uspto.gov', 'epo.org',
    'wipo.int', 'jpo.go.jp', 'kipo.go.kr', 'cnipa.gov.cn',
    'ipaustralia.gov.au',
  ],

  SEND_RECEIVE_CODES: ['FC', 'TC', 'FA', 'TA', 'FG', 'TG', 'FX', 'TX', '垃圾'],
  CASE_CATEGORIES: ['專利', '商標', '未分類'],

  // 評估系統
  GEMINI_CONSOLIDATION_MODEL: 'gemini-3-flash-preview',
  EVAL_BATCH_SIZE: 10,
  GOLDEN_SET_MAX: 200,
  REGRESSION_THRESHOLD_PP: 5,
  CODE_REGRESSION_THRESHOLD_PP: 3,
  MIN_PASS_RATE: 85,
};

function getApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('請先在「專案設定 → Script 屬性」設定 GEMINI_API_KEY');
  return key;
}


// ===================== 自動建立 Spreadsheet & Drive =====================

/**
 * 取得或建立資料夾（V1 同款邏輯）
 * parent = null 時從 Drive 根目錄搜尋
 */
function _getOrCreateFolder(parent, name) {
  if (parent) {
    const iter = parent.getFoldersByName(name);
    return iter.hasNext() ? iter.next() : parent.createFolder(name);
  } else {
    const iter = DriveApp.getFoldersByName(name);
    return iter.hasNext() ? iter.next() : DriveApp.createFolder(name);
  }
}

/**
 * 取得專案根資料夾（自動建立）
 */
function _getProjectFolder() {
  return _getOrCreateFolder(null, CONFIG.PROJECT_FOLDER_NAME);
}

/**
 * 取得 Drive 根資料夾 ID（自動建立子資料夾結構）
 */
function _getDriveRootFolder() {
  const projectFolder = _getProjectFolder();
  // 確保三個子資料夾存在
  _getOrCreateFolder(projectFolder, '專利');
  _getOrCreateFolder(projectFolder, '商標');
  const unclassified = _getOrCreateFolder(projectFolder, '未分類');
  _getOrCreateFolder(unclassified, '垃圾');
  return projectFolder;
}

/**
 * 核心：取得設定試算表（自動搜尋 or 建立）
 *
 * 邏輯：
 *   1. 先查 Script Properties 有無 SHEET_ID → 嘗試直接開
 *   2. 沒有 → 在專案資料夾搜尋同名 Sheet
 *   3. 都找不到 → SpreadsheetApp.create() 建新的
 */
function _getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();

  // 嘗試 1：用已存的 ID 開啟
  const savedId = props.getProperty('SHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {
      Logger.log('SHEET_ID 無效，重新搜尋...');
    }
  }

  // 嘗試 2：在專案資料夾搜尋同名 Sheet
  const projectFolder = _getProjectFolder();
  const files = projectFolder.getFilesByName(CONFIG.SPREADSHEET_NAME);
  if (files.hasNext()) {
    const ss = SpreadsheetApp.open(files.next());
    props.setProperty('SHEET_ID', ss.getId());
    Logger.log('找到現有試算表: ' + ss.getUrl());
    return ss;
  }

  // 嘗試 3：建立新的
  return _createSpreadsheet(projectFolder);
}

/**
 * 建立新的試算表，移入專案資料夾
 */
function _createSpreadsheet(projectFolder) {
  const ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  const file = DriveApp.getFileById(ss.getId());

  // 移到專案資料夾（從根目錄移走）
  projectFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  // 儲存 ID
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  Logger.log('已建立新試算表: ' + ss.getUrl());
  return ss;
}


// ===================== 選單 =====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 Email Processor V3')
    .addItem('🔧 首次安裝設定', 'setupAll')
    .addSeparator()
    .addSubMenu(ui.createMenu('🧪 試跑')
      .addItem('試跑 50 封（分類＋下載＋掛標籤）', 'trialRun')
      .addItem('試跑 10 封（快速驗證）', 'trialRunSmall')
      .addItem('試跑單封信（輸入搜尋條件）', 'testSingleEmail'))
    .addItem('▶️ 正式處理 (Batch)', 'processEmails')
    .addSeparator()
    .addSubMenu(ui.createMenu('🔄 回授與學習')
      .addItem('執行回授偵測', 'runFeedback')
      .addItem('查看學習紀錄', 'showLearningLog')
      .addItem('匯出 LLM Prompt 文件', 'exportPromptDoc')
      .addItem('整理學習紀錄（合併進 Prompt）', 'consolidateLearning'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🧪 評估測試')
      .addItem('執行評估測試', 'runEvaluation')
      .addItem('查看評估歷史', 'showEvalHistory')
      .addItem('從既有紀錄匯入黃金測試集', 'seedGoldenSetFromExisting'))
    .addSeparator()
    .addItem('📊 處理統計', 'showStats')
    .addItem('🔄 重新處理失敗信件', 'retryFailedManual')
    .addSubMenu(ui.createMenu('⏱️ 排程')
      .addItem('安裝每日排程（早上 7-8 點）', 'installTrigger')
      .addItem('移除排程', 'removeTrigger'))
    .addSubMenu(ui.createMenu('🔧 工具')
      .addItem('設定標籤顏色', '_setLabelColors')
      .addItem('重建所有 AI 標籤', 'resetAllAILabels')
      .addItem('更新 Sender 名單下拉選項', '_migrateSenderDropdown'))
    .addItem('⚙️ 重設 API Key', 'setupApiKey_ui')
    .addToUi();
}


// ===================== 首次安裝 =====================

/**
 * 首次安裝 — 從 Apps Script 編輯器直接執行即可
 *
 * 自動建立：
 *   ✅ Drive「Email自動整理v2」資料夾 + 子資料夾
 *   ✅ Google Sheet（4 張 Tab）移入資料夾
 *   ✅ Gmail AI/ 系列標籤
 *   ✅ 為 Google Sheet 安裝 onOpen 選單觸發器
 *
 * 事前準備：
 *   在「專案設定 → Script 屬性」設好 GEMINI_API_KEY
 */
function setupAll() {
  // 1. 建立 Drive 資料夾結構
  const projectFolder = _getDriveRootFolder();
  Logger.log('📁 Drive 資料夾: ' + projectFolder.getUrl());

  // 2. 取得或建立 Spreadsheet（自動移入資料夾）
  const ss = _getSpreadsheet();

  // 3. 建立四張 Sheet Tab
  _setupSheets(ss);

  // 3.5 既有 LOG Sheet 欄位 migration：自動補上缺少的 header
  const logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (logSheet) {
    const headerRow = logSheet.getRange(1, 1, 1, logSheet.getLastColumn()).getValues()[0];
    if (headerRow.length < 24 || String(headerRow[23]).trim() !== '修正案號') {
      logSheet.getRange(1, 24).setValue('修正案號').setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
      Logger.log('📋 LOG Sheet 補上「修正案號」欄位 (col 24)');
    }
  }

  // 4. 建立 Gmail 標籤
  _ensureLabels();

  // 5. 安裝 onOpen 觸發器（讓 Sheet 打開時出現選單）
  _installOnOpenTrigger(ss);

  // 6. 安裝每週學習整理排程（每週一 9 點）
  installConsolidationTrigger();

  // 7. 檢查 API Key
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  Logger.log('✅ 安裝完成！');
  Logger.log('📊 試算表: ' + ss.getUrl());
  Logger.log('📁 Drive 資料夾: ' + projectFolder.getUrl());
  if (!apiKey) {
    Logger.log('⚠️ 尚未設定 GEMINI_API_KEY！請到「專案設定 → Script 屬性」新增');
  }
  Logger.log('');
  Logger.log('📋 下一步：');
  Logger.log('   1. 打開上方試算表連結');
  Logger.log('   2. 到「Sender名單」填入已知 sender');
  Logger.log('   3. 從選單「📧 Email Processor V3 → 🧪 試跑」開始測試');

  // 如果是從 Sheet 選單呼叫的，顯示 alert
  try {
    const ui = SpreadsheetApp.getUi();
    let msg = '✅ 安裝完成！\n\n' +
      '已建立：\n' +
      '• Drive「Email自動整理v2」資料夾\n' +
      '• Google Sheet（4 張 Tab）\n' +
      '• Gmail AI/ 標籤\n\n';
    if (!apiKey) {
      msg += '⚠️ 尚未設定 API Key！\n請到 Apps Script「專案設定 → Script 屬性」新增 GEMINI_API_KEY\n\n';
    }
    msg += '下一步：\n1. 到「Sender名單」填入已知 sender\n2. 從選單 🧪 試跑 → 試跑 50 封';
    ui.alert(msg);
  } catch (e) {
    // 從編輯器執行時沒有 UI，忽略（已有 Logger 輸出）
  }
}


/**
 * 為 Sheet 安裝 onOpen 觸發器
 * 讓 standalone script 也能在 Sheet 打開時顯示選單
 */
function _installOnOpenTrigger(ss) {
  // 先移除舊的 onOpen 觸發器
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'onOpen') {
      ScriptApp.deleteTrigger(t);
    }
  }

  // 安裝新的
  ScriptApp.newTrigger('onOpen')
    .forSpreadsheet(ss)
    .onOpen()
    .create();

  Logger.log('✅ onOpen 選單觸發器已安裝');
}


/**
 * 設定 API Key（從編輯器直接呼叫）
 * 用法：在編輯器中把 key 改成你的 API Key，然後執行
 */
function setupApiKey(key) {
  if (!key) {
    Logger.log('用法：setupApiKey("你的Gemini_API_Key")');
    Logger.log('或到 Apps Script「專案設定」→「Script 屬性」→ 新增 GEMINI_API_KEY');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key.trim());
  Logger.log('✅ API Key 已設定');
}


/**
 * 從 Sheet 選單重設 API Key（需要 UI）
 */
function setupApiKey_ui() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt('設定 API Key', '請輸入 Gemini 3.0 Flash API Key：', ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;
  const key = result.getResponseText().trim();
  if (!key) { ui.alert('API Key 不能為空'); return; }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
  ui.alert('✅ API Key 已設定');
}


function _setupSheets(ss) {
  // Sheet 1: Sender 名單
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.SENDERS);
    s.appendRow(['Email 或 Domain', '角色（C/A/G/S）', '名稱備註']);
    s.getRange('1:1').setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
    s.setColumnWidth(1, 280);
    s.setColumnWidth(2, 120);
    s.setColumnWidth(3, 280);

    // 角色欄下拉選單（B2:B500）
    const roleRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['C', 'A', 'G', 'S'], true)
      .setHelpText('C = 客戶, A = 代理人, G = 政府機關, S = 垃圾/廣告')
      .setAllowInvalid(false)
      .build();
    s.getRange('B2:B500').setDataValidation(roleRule);

    [
      ['@tipo.gov.tw', 'G', 'TIPO 台灣智慧局'],
      ['@tiponet.tipo.gov.tw', 'G', 'TIPO 網路申辦'],
      ['@uspto.gov', 'G', 'USPTO 美國專利局'],
      ['@epo.org', 'G', 'EPO 歐洲專利局'],
      ['@wipo.int', 'G', 'WIPO 世界智財組織'],
      ['@jpo.go.jp', 'G', 'JPO 日本特許廳'],
      ['@naipo.com', 'A', 'NAIP 北美智權（代理人）'],
      ['@cpaglobal.com', 'A', 'CPA Global 年費代繳（代理人）'],
    ].forEach(row => s.appendRow(row));
  }

  // Sheet 2: 處理紀錄
  // 欄位索引（0-based）：
  //  0: messageId  1: 日期  2: 原始標題  3: sender
  //  4: AI收發碼  5: AI推斷角色  6: 歸檔案號  7: 內文案號  8: AI語義名
  //  9: AI信心  10: AI案件類別  11: 來源確認狀態  12: 資料夾連結
  //  13: 最終收發碼  14: 修正後名稱  15: 修正原因
  //  16: 修正時間  17: 修正來源  18: 重試次數
  //  19: Input Tokens  20: Output Tokens  21: dates_found  22: 錯誤備註  23: 修正案號
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.LOG)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.LOG);
    s.appendRow([
      'messageId', '日期', '原始標題', 'sender',
      'AI收發碼', 'AI推斷角色', '歸檔案號', '內文案號', 'AI語義名',
      'AI信心', 'AI案件類別', '來源確認狀態', '資料夾連結',
      '最終收發碼', '修正後名稱', '修正原因',
      '修正時間', '修正來源', '重試次數',
      'Input Tokens', 'Output Tokens', 'dates_found', '錯誤備註', '修正案號',
    ]);
    s.getRange('1:1').setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
    s.setFrozenRows(1);
    s.hideColumns(1);  // 隱藏 messageId

    s.setColumnWidth(2, 130);   // 日期
    s.setColumnWidth(3, 300);   // 原始標題
    s.setColumnWidth(4, 200);   // sender
    s.setColumnWidth(5, 80);    // AI收發碼
    s.setColumnWidth(6, 80);    // AI推斷角色
    s.setColumnWidth(7, 200);   // 歸檔案號
    s.setColumnWidth(8, 200);   // 內文案號
    s.setColumnWidth(9, 250);   // AI語義名
    s.setColumnWidth(10, 60);   // AI信心
    s.setColumnWidth(11, 80);   // AI案件類別
    s.setColumnWidth(12, 100);  // 來源確認狀態
    s.setColumnWidth(13, 200);  // 資料夾連結
    s.setColumnWidth(14, 80);   // 最終收發碼
    s.setColumnWidth(15, 300);  // 修正後名稱
    s.setColumnWidth(16, 350);  // 修正原因
  }

  // Sheet 3: 分類規則
  _setupRulesSheet(ss);

  // Sheet 4: 設定
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.SETTINGS);
    s.appendRow(['參數', '值', '說明']);
    s.getRange('1:1').setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
    s.setColumnWidth(1, 200);
    s.setColumnWidth(2, 200);
    s.setColumnWidth(3, 350);
    [
      ['信心閾值', 0.8, '≥此值自動處理，<此值標記待確認'],
      ['角色推斷閾值', 0.6, '≥此值採用LLM推斷的sender角色'],
      ['附件重試上限', 3, '附件下載失敗的最大重試次數'],
      ['batch大小', 20, '正式處理每批封數'],
      ['body截取字數', 1500, '傳給LLM的內文長度'],
      ['lastProcessedTime', '', '（系統自動更新）'],
      ['累計處理數量', 0, '（系統自動更新）'],
      ['評估通知 Email', '', '迴歸測試退步時通知的 email（逗號分隔多人）'],
      ['MANUAL_MINUTES_PER_EMAIL', 5.5, '人工處理每封信的基準時間（分鐘），用於計算效益'],
    ].forEach(row => s.appendRow(row));
  }

  // Sheet 5: 黃金測試集
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.GOLDEN_SET)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.GOLDEN_SET);
    s.appendRow([
      'messageId', '加入日期', '原始標題', '寄件人',
      '正確收發碼', '正確語義名', '正確案件類別', '正確歸檔案號',
      '修正類型', '最近評估結果', 'active',
    ]);
    s.getRange('1:1').setFontWeight('bold').setBackground('#6aa84f').setFontColor('white');
    s.setFrozenRows(1);
    s.hideColumns(1);
    s.setColumnWidth(2, 120);
    s.setColumnWidth(3, 300);
    s.setColumnWidth(4, 200);
    s.setColumnWidth(5, 100);
    s.setColumnWidth(6, 250);
    s.setColumnWidth(7, 100);
    s.setColumnWidth(8, 200);
    s.setColumnWidth(9, 100);
    s.setColumnWidth(10, 100);
    s.setColumnWidth(11, 80);
  }

  // Sheet 6: 評估紀錄
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.EVAL_RUNS)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.EVAL_RUNS);
    s.appendRow([
      'runId', '日期', 'messageId',
      '預期收發碼', '實際收發碼', '收發碼正確',
      '預期語義名', '實際語義名', '語義名分數',
      '預期案件類別', '實際案件類別', '類別正確',
      '整體結果', '備註',
    ]);
    s.getRange('1:1').setFontWeight('bold').setBackground('#e69138').setFontColor('white');
    s.setFrozenRows(1);
    s.setColumnWidth(1, 180);
    s.setColumnWidth(2, 130);
    s.setColumnWidth(7, 250);
    s.setColumnWidth(8, 250);
    s.setColumnWidth(14, 300);
  }

  // Sheet 7: 修正統計
  if (!ss.getSheetByName(CONFIG.SHEET_NAMES.CORRECTION_STATS)) {
    const s = ss.insertSheet(CONFIG.SHEET_NAMES.CORRECTION_STATS);
    s.appendRow([
      '週起始日', '處理信件數', '總修正數',
      '收發碼修正', '語義名修正', '收發碼錯誤率%', '語義名錯誤率%',
    ]);
    s.getRange('1:1').setFontWeight('bold').setBackground('#a64d79').setFontColor('white');
    s.setFrozenRows(1);
    s.setColumnWidth(1, 120);
    s.setColumnWidth(2, 120);
  }

  // 刪除預設的「Sheet1」（如果還在的話）
  try {
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet) ss.deleteSheet(defaultSheet);
  } catch (e) { /* 如果只剩一張 sheet 刪不掉，沒關係 */ }

  // 再試一次（可能 Sheet1 是唯一一張被鎖定的）
  try {
    const defaultSheet = ss.getSheetByName('工作表1');
    if (defaultSheet) ss.deleteSheet(defaultSheet);
  } catch (e) { /* 忽略 */ }
}


// ===================== 分類規則 Tab 初始化 =====================

function _setupRulesSheet(ss) {
  let s = ss.getSheetByName(CONFIG.SHEET_NAMES.RULES);
  if (!s) {
    s = ss.insertSheet(CONFIG.SHEET_NAMES.RULES);
  } else {
    // 已存在 → 清除舊資料再重寫（保留 tab）
    s.clear();
  }

  // 欄位結構
  const headers = ['規則ID', '類別', '觸發條件', '動作', '說明/範例'];
  s.appendRow(headers);
  s.getRange('1:1').setFontWeight('bold').setBackground('#4a86c8').setFontColor('white');
  s.setColumnWidth(1, 80);
  s.setColumnWidth(2, 100);
  s.setColumnWidth(3, 350);
  s.setColumnWidth(4, 300);
  s.setColumnWidth(5, 400);

  // ── 規則資料 ──
  const rules = [
    // 案號格式
    ['C01', '案號格式', '案號結構：[4碼客戶號][2碼年份][3碼序號][1碼類型][2碼國碼][選填分案號]',
     '用正規表達式 /[A-Z0-9]{4}\\d{5}[PMDTABCW][A-Z]{2}\\d*/ 提取',
     '例：BRIT25710PUS1 → BRIT=客戶碼, 25=年份, 710=序號, P=專利, US=國碼, 1=分案號'],

    ['C02', '案號格式', '類型碼位於案號第10碼（index 9），固定位置取值',
     '用 charAt(9) 取類型碼，不用 regex search',
     'Bug教訓：BRIT 的 T 會被 regex 先匹配到，誤判為商標'],

    ['C03', '案號格式', '案號前後必須有邊界（非英數字元）',
     '正規表達式加 lookbehind/lookahead 避免從 base64 編碼誤匹配',
     '例：/(?<![A-Za-z0-9])...(?>![A-Za-z0-9])/'],

    // 分類（專利/商標）
    ['R01', '分類', '案號第10碼為 P、M、D、A、C',
     '歸入「專利」資料夾 + 加上「專利」Gmail label',
     'P=Patent, M=Model, D=Design, A=Application, C=Continuation'],

    ['R02', '分類', '案號第10碼為 T、B、W',
     '歸入「商標」資料夾 + 加上「商標」Gmail label',
     'T=Trademark, B=Brand, W=WIPO商標'],

    ['R03', '分類', '同封信歸檔案號含專利+商標類型碼（混合）',
     '歸入「未分類」資料夾',
     '例：同封信有 PMDAC 和 TBW 的案號 → 未分類'],

    ['R04', '分類', '主旨無案號（不論內文有無）',
     '歸入「未分類」資料夾，不加專利/商標 label',
     '因為無法從主旨判斷是專利還是商標'],

    // 收發碼
    ['S01', '收發碼', '寄件人 domain 為自家（ipwinner.com）→ T（寄出）；否則 → F（收到）',
     '設定方向碼 F 或 T',
     'OWN_DOMAINS 可在設定中自訂'],

    ['S02', '收發碼', '收到的信（F方向）：看寄件人 email 在 Sender 名單的角色',
     '決定角色碼 C=客戶 / A=代理人 / G=政府 / X=未知 → 組成 FC/FA/FG/FX',
     '例：bskb.com 在名單標為 Agent → FA'],

    ['S03', '收發碼', '寄出的信（T方向）：看第一個外部收件人在 Sender 名單的角色',
     '決定角色碼 → 組成 TC/TA/TG/TX',
     'Bug教訓：T方向看寄件人（自己）永遠是 X → 全變 TX'],

    ['S04', '收發碼', '寄件人 domain 含政府機構 domain（tipo.gov.tw, uspto.gov 等）',
     '角色 = G（政府）',
     'GOV_DOMAINS 可在設定中擴充'],

    ['S05', '收發碼', 'Sender 名單設計：私人 domain → 用 @domain；公共 email → 用完整 email',
     '避免 @gmail.com 代表所有 Gmail 用戶',
     '例：bskb.com → @bskb.com | john@gmail.com → john@gmail.com'],

    // 歸檔邏輯
    ['F01', '歸檔', '主旨有案號 → 由 LLM 判斷 filing_case_numbers（實際歸檔案號）',
     '依歸檔案號建立資料夾存 EML 和附件',
     'LLM 區分「主要處理的案號」和「順便引用的案號」，只歸主案'],

    ['F02', '歸檔', '主旨無案號但內文有案號',
     '歸入 未分類/{客戶碼前4碼}/ + 標記「無案號」',
     '例：主旨無案號但內文有 BRIT... → 未分類/BRIT/'],

    ['F03', '歸檔', '完全無案號（主旨和內文都沒有）',
     '歸入 未分類/無案號/ + 標記「無案號」',
     ''],

    ['F04', '歸檔', '主旨有 2 個以上不同案號',
     '每個歸檔案號各建一個資料夾存 EML + 標記「多案號」',
     '例：主旨有 BRIT25710PUS1 和 BRIT25711PUS2 → 各自資料夾都存一份 EML'],

    ['F05', '歸檔', '主旨有 1 個案號 +「等」字（如 BRIT25710PUS1等3案）',
     '觸發多案號：去內文找其他案號，由 LLM 判斷歸檔案號，各建資料夾存 EML + 標記「多案號」',
     '「～」「~」「、」不需額外判斷，因為這些情況主旨自然有 2+ 個案號（已被 F04 處理）'],

    // 檔名規則
    ['N01', '檔名', 'EML 檔名格式：{日期}-{收發碼}-{案號標記}-{AI語義名}.eml',
     '日期=yyyyMMdd, 收發碼=FC/TA等, 案號標記=案號或客戶碼或「等N案」',
     '例：20260313-FA-BRIT25710PUS1-異議答辯期限0317.eml'],

    ['N02', '檔名', '附件檔名格式：{EML基礎名}-附件N.{副檔名}',
     'N 從 1 開始，副檔名保留原始附件的副檔名',
     '例：20260313-FA-BRIT25710PUS1-異議答辯期限0317-附件1.pdf'],

    ['N03', '檔名', 'AI 語義名由 LLM 生成，25 字以內，含最關鍵的期限日期',
     '期限選擇規則：TA→我方要求代理人的期限; TC→我方要求客戶的期限; FA→代理人要求我方的期限',
     '用「行動期限」而非「背景日期」（如官方通知日期）'],

    ['N04', '檔名', '多案號的 EML 檔名案號標記帶「等N案」',
     '例：2案 → BRIT25710PUS1等2案',
     '每個資料夾的 EML 都帶「等N案」，方便辨識'],

    // 附件規則
    ['A01', '附件', 'TA/TC/TG（寄出的信）只存 EML，不存附件',
     '因為附件是我方自己寄出的，本地已有原始檔',
     '收到的信（FA/FC/FG/FX）才存附件'],

    ['A02', '附件', '< 5KB 的圖片 → 跳過（通常是簽名檔圖片）',
     '檔名含 image00/logo/banner/signature 的也跳過',
     '另用 includeInlineImages:false 排除基本 inline 圖'],

    // 重跑保護
    ['D01', '重跑保護', '同檔名 + 同大小（±100 bytes）的檔案',
     '跳過不重建（EML 和附件共用此邏輯）',
     '安全重跑：不需手動刪檔就能重跑處理'],

    ['D02', '重跑保護', '訊息去重用 Message ID（記錄在處理紀錄 Sheet）',
     '搜尋 Gmail 時不加 -label 排除條件',
     'Bug教訓：label 加在 thread 上，用 -label 排除會漏掉同 thread 新回覆'],

    // LLM 回饋
    ['L01', 'LLM回饋', 'Sender 角色回授（方法A）：Gmail 移除「自動辨識來源」標籤',
     '執行回授偵測 → 偵測 Gmail label → 寫入 Sender 名單',
     'T 方向的回饋學習用收件人（非寄件人）作為學習對象'],

    ['L02', 'LLM回饋', 'Sender 角色回授（方法B）：在 Sheet「最終收發碼」欄直接填寫正確收發碼',
     '執行回授偵測 → 比對 AI 碼 vs 最終碼 → 寫入 Sender 名單',
     '兩種方法擇一即可，修正來源分別記錄為 tag_change / sheet_code'],

    ['L03', 'LLM回饋', '檔名回授：在 Sheet「修正後名稱」欄填寫正確語義名',
     '執行回授偵測 → 自動改名 Drive 裡的 EML 和附件 + 作為 LLM 未來 few-shot 範例',
     '例：「委託-提出商標異議-期限3/23」→「委託-提出商標異議-期限3/17」'],

    ['L04', 'LLM回饋', '在「修正原因」欄填寫原因（建議填寫）',
     '修正原因會傳給 LLM 作為 few-shot 範例的一部分，幫助 LLM 理解為什麼修改',
     '例：「應採用代理人要求的行動期限，非官方通知期限」'],

    ['L05', 'LLM回饋', '多種回授可同時進行，修正來源用「+」串接',
     '例：tag_change+name_change 代表同時修正了 sender 角色和語義名',
     '各項回授獨立判斷是否已處理，不會互相覆蓋'],

    ['L06', 'LLM回饋', '修正紀錄用於 LLM few-shot learning（最近 20 筆）',
     '每次處理新信件時，把修正紀錄（含原因）注入 system prompt',
     'LLM 看到修正範例 + 原因，能逐漸學到命名偏好和判斷規則'],

    ['L07', 'LLM語義名', '語義名描述文字中不可使用英文縮寫「OA」',
     '改用中文「審查意見」或「答辯」，「OA」只出現在括號事項碼如 -(OA1)',
     '✓ 確認收到-法國商標審查意見-(OA1) ✗ 確認收到-法國商標OA-(OA1)'],

    ['L08', 'LLM期限選擇', '期限由程式碼根據收發碼自動選擇（結構化期限提取）',
     'LLM 列出信中所有日期並分類為 4 種 type，程式碼用 _selectDeadline() 決定',
     'type: official_deadline / our_request / counterpart_eta / background'],

    ['L09', 'LLM期限選擇', 'TA 信件：永遠選我方要求代理人的期限（our_request），不選官方期限',
     '格式：期限M/DD | 無 our_request 時改用「通知官方期限M/DD」',
     '例：信中有 Opposition Deadline 3/23 和 for review by 3/17 → 期限3/17'],

    ['L10', 'LLM期限選擇', 'TC 信件：我方期限未過期用「建議M/DD前回覆」，已過期 fallback 官方期限',
     '已過期格式：通知官方期限M/DD | 前綴可能改為「提醒回覆指示-」',
     '例：回覆期限 2/23 已過 + 官方期限 3/23 → 通知官方期限3/23'],
  ];

  // 類別標題與顏色設定
  const categoryConfig = {
    '案號格式': { title: '案號結構', bg: '#E8F0FE', titleBg: '#C5DAF0' },
    '分類':     { title: '專利/商標分類', bg: '#FCE8E6', titleBg: '#F5C6C2' },
    '收發碼':   { title: '收發碼判定', bg: '#FEF7E0', titleBg: '#F5E6A8' },
    '歸檔':     { title: '資料夾歸檔', bg: '#E6F4EA', titleBg: '#B7DFC4' },
    '檔名':     { title: '檔名規則', bg: '#F3E8FD', titleBg: '#D8C0F0' },
    '附件':     { title: '附件處理', bg: '#E8F7FE', titleBg: '#B8DFF5' },
    '重跑保護': { title: '重跑保護', bg: '#F1F3F4', titleBg: '#D2D6D9' },
    'LLM回饋': { title: 'LLM 回饋學習', bg: '#FFF8E1', titleBg: '#FFE082' },
    'LLM語義名': { title: 'LLM 語義名規則', bg: '#E8F5E9', titleBg: '#A5D6A7' },
    'LLM期限選擇': { title: 'LLM 期限選擇（結構化）', bg: '#FFF3E0', titleBg: '#FFCC80' },
  };

  // 將規則依類別分組，保持原順序
  const groups = [];
  let currentCat = null;
  let currentGroup = null;
  for (const rule of rules) {
    if (rule[1] !== currentCat) {
      currentCat = rule[1];
      currentGroup = { category: currentCat, rules: [] };
      groups.push(currentGroup);
    }
    currentGroup.rules.push(rule);
  }

  // 寫入規則（含類別標題行）
  let row = 2; // 從 header 下一行開始
  for (const group of groups) {
    const cfg = categoryConfig[group.category] || { title: group.category, bg: '#FFFFFF', titleBg: '#E0E0E0' };

    // 寫入類別標題行
    s.getRange(row, 1).setValue(cfg.title);
    const titleRange = s.getRange(row, 1, 1, 5);
    titleRange.merge();
    titleRange.setFontWeight('bold');
    titleRange.setFontSize(11);
    titleRange.setBackground(cfg.titleBg);
    titleRange.setVerticalAlignment('middle');
    row++;

    // 寫入該類別的規則
    if (group.rules.length > 0) {
      s.getRange(row, 1, group.rules.length, 5).setValues(group.rules);
      // 規則行上色
      for (let i = 0; i < group.rules.length; i++) {
        s.getRange(row + i, 1, 1, 5).setBackground(cfg.bg);
      }
      // 規則ID 粗體
      s.getRange(row, 1, group.rules.length, 1).setFontWeight('bold');
      row += group.rules.length;
    }
  }

  // 格式美化
  s.setFrozenRows(1);
  s.autoResizeColumn(1);

  Logger.log('✅ 分類規則 tab：已寫入 ' + rules.length + ' 條規則（含 ' + groups.length + ' 個類別標題）');
}


// ===================== Gmail 標籤 =====================

/**
 * 一次性工具：刪除所有 AI/ 開頭的標籤，再重建正確的巢狀結構。
 * 在 Apps Script 編輯器裡手動執行一次即可，之後可刪除此函數。
 */
function resetAllAILabels() {
  // Step 1: 刪除所有 AI/ 子標籤
  const allGmailLabels = GmailApp.getUserLabels();
  const prefix = CONFIG.LABEL_PREFIX + '/';
  let deleted = 0;

  allGmailLabels.forEach(label => {
    const name = label.getName();
    if (name === CONFIG.LABEL_PREFIX || name.startsWith(prefix)) {
      label.deleteLabel();
      deleted++;
      Logger.log('已刪除: ' + name);
    }
  });
  Logger.log('共刪除 ' + deleted + ' 個標籤');

  // Step 2: 重建（父標籤 + 所有子標籤）
  _ensureLabels();
  Logger.log('已重建所有 AI 標籤（巢狀結構）');
}

function _ensureLabels() {
  const LABEL_GROUPS = {
    '收發碼': CONFIG.SEND_RECEIVE_CODES,
    '案件類型': ['專利', '商標'],
    '狀態': ['待確認', '自動辨識來源', '未知來源', '已跳過', '多案號', '無案號'],
    '錯誤': ['處理失敗', '附件下載錯誤'],
  };

  // 先確保最上層父標籤存在
  if (!GmailApp.getUserLabelByName(CONFIG.LABEL_PREFIX)) {
    GmailApp.createLabel(CONFIG.LABEL_PREFIX);
  }

  // 建立三層結構：AI/ → AI/收發碼/ → AI/收發碼/FC
  for (const group in LABEL_GROUPS) {
    const groupPath = CONFIG.LABEL_PREFIX + '/' + group;
    if (!GmailApp.getUserLabelByName(groupPath)) {
      GmailApp.createLabel(groupPath);
    }
    LABEL_GROUPS[group].forEach(name => {
      const fullName = groupPath + '/' + name;
      if (!GmailApp.getUserLabelByName(fullName)) {
        GmailApp.createLabel(fullName);
      }
    });
  }
}

/**
 * 一次性工具：設定 Gmail 標籤顏色
 * GmailApp 不支援設定顏色，必須透過 Gmail REST API
 * 紅色：處理失敗、附件下載錯誤（一定要處理）
 * 黃色：待確認、自動辨識來源、未知來源（需要關注）
 */
function _setLabelColors() {
  const token = ScriptApp.getOAuthToken();
  const baseUrl = 'https://www.googleapis.com/gmail/v1/users/me/labels';

  // 先取得所有標籤的 ID 對照表
  const resp = UrlFetchApp.fetch(baseUrl, {
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() !== 200) {
    const errMsg = 'Gmail REST API 呼叫失敗 (HTTP ' + resp.getResponseCode() + ')。請到 GCP Console 啟用 Gmail API。';
    Logger.log('❌ ' + errMsg);
    try { SpreadsheetApp.getUi().alert('⚠️ 標籤顏色', errMsg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) {}
    return;
  }
  const allLabels = JSON.parse(resp.getContentText()).labels || [];
  const labelMap = {};
  allLabels.forEach(l => { labelMap[l.name] = l.id; });

  // 定義要設色的標籤（Gmail API 顏色值）
  // https://developers.google.com/gmail/api/reference/rest/v1/users.labels
  const colorConfig = [
    // 紅色標籤
    { path: 'AI/錯誤/處理失敗', bg: '#cc3a21', text: '#ffffff' },
    { path: 'AI/錯誤/附件下載錯誤', bg: '#cc3a21', text: '#ffffff' },
    // 灰色標籤
    { path: 'AI/收發碼/垃圾', bg: '#cccccc', text: '#666666' },
    // 黃色標籤
    { path: 'AI/狀態/待確認', bg: '#fad165', text: '#000000' },
    { path: 'AI/狀態/自動辨識來源', bg: '#fad165', text: '#000000' },
    { path: 'AI/狀態/未知來源', bg: '#fad165', text: '#000000' },
  ];

  let updated = 0;
  colorConfig.forEach(cfg => {
    const labelId = labelMap[cfg.path];
    if (!labelId) {
      Logger.log('⚠️ 標籤不存在: ' + cfg.path);
      return;
    }
    const payload = {
      color: {
        backgroundColor: cfg.bg,
        textColor: cfg.text,
      },
    };
    const patchResp = UrlFetchApp.fetch(baseUrl + '/' + labelId, {
      method: 'patch',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    if (patchResp.getResponseCode() === 200) {
      Logger.log('✅ 顏色已設定: ' + cfg.path);
      updated++;
    } else {
      Logger.log('❌ 設定失敗: ' + cfg.path + ' → ' + patchResp.getContentText());
    }
  });

  Logger.log('標籤顏色設定完成: ' + updated + '/' + colorConfig.length);
  try {
    SpreadsheetApp.getUi().alert('🎨 標籤顏色', '已設定 ' + updated + '/' + colorConfig.length + ' 個標籤顏色\n\n🔴 紅色: 處理失敗、附件下載錯誤\n🟡 黃色: 待確認、自動辨識來源、未知來源', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* no UI */ }
}

/**
 * 取得 Gmail 標籤物件
 * @param {string} name 含 group 的路徑，如 '收發碼/FC'、'錯誤/處理失敗'
 * @return {GmailLabel|null}
 */
function _getLabel(name) {
  return GmailApp.getUserLabelByName(CONFIG.LABEL_PREFIX + '/' + name);
}


// ===================== 規則引擎 =====================

function _extractEmail(str) {
  if (!str) return '';
  const m = str.match(/<([^>]+)>/);
  return (m ? m[1] : str).toLowerCase().trim();
}

function _extractDomain(email) {
  const p = email.split('@');
  return p.length > 1 ? p[1] : '';
}

function _isGovDomain(domain) {
  return CONFIG.GOV_DOMAINS.some(g => domain === g || domain.endsWith('.' + g));
}

function _cleanSubject(raw) {
  let s = raw || '';
  const original = s;
  let changed = true;
  while (changed) {
    changed = false;
    const before = s;
    s = s.replace(/^(RE|Re|re|FW|Fw|fw|FWD|Fwd|fwd|回覆|轉寄|提醒)\s*[:：_]?\s*/i, '');
    if (s !== before) changed = true;
  }
  // 清除中文方括號標記（【請回覆】【急】等）
  s = s.replace(/【[^】]{0,10}】\s*/g, '');
  return { cleaned: s.trim(), original: original.trim() };
}

function _getDirection(senderEmail) {
  const domain = _extractDomain(senderEmail);
  return CONFIG.OWN_DOMAINS.includes(domain) ? 'T' : 'F';
}

function _getSenderRole(senderEmail, senderMap) {
  const email = senderEmail.toLowerCase().trim();
  const domain = _extractDomain(email);

  if (senderMap.has(email)) return { role: senderMap.get(email).role, source: 'exact' };
  if (senderMap.has('@' + domain)) return { role: senderMap.get('@' + domain).role, source: 'domain' };

  // 子網域匹配（tiponet.tipo.gov.tw → @tipo.gov.tw）
  const parts = domain.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = '@' + parts.slice(i).join('.');
    if (senderMap.has(parent)) return { role: senderMap.get(parent).role, source: 'subdomain' };
  }

  if (_isGovDomain(domain)) return { role: 'G', source: 'gov' };
  return { role: 'X', source: 'unknown' };
}

function _getSendReceiveCode(direction, role) {
  if (role === 'S') return '垃圾';  // 垃圾不區分收發方向
  const map = {
    'F_C': 'FC', 'F_A': 'FA', 'F_G': 'FG', 'F_X': 'FX',
    'T_C': 'TC', 'T_A': 'TA', 'T_G': 'TG', 'T_X': 'TX',
  };
  return map[direction + '_' + role] || 'FX';
}

/**
 * 當 LLM 沒回傳語義名時的 fallback
 * 從標題提取核心語義，去掉案號、括號資訊等已在檔名其他欄位的冗餘內容
 */
function _fallbackSemanticName(subject) {
  let s = subject || '';
  // 去掉括號內的案號/名稱等冗餘資訊（這些已在檔名其他段）
  s = s.replace(/\([^)]*案號[^)]*\)/g, '');
  s = s.replace(/\([^)]*[A-Z0-9]{4}\d{5}[^)]*\)/g, '');
  s = s.replace(/（[^）]*案號[^）]*）/g, '');
  s = s.replace(/（[^）]*[A-Z0-9]{4}\d{5}[^）]*）/g, '');
  // 去掉 PRIVILEGED & CONFIDENTIAL 等常見尾巴
  s = s.replace(/\(?\s*PRIVILEGED\s*[&＆]\s*CONFIDENTIAL\s*\)?/gi, '');
  // 去掉多餘空格和標點
  s = s.replace(/\s+/g, ' ').replace(/[;；,，]+\s*$/g, '').trim();
  // 限制長度（最多 20 字）
  if (s.length > 20) s = s.substring(0, 20);
  return s || '未命名';
}

function _extractCaseInfo(subject, body, attNames) {
  // 分開提取：主旨案號 vs 內文/附件案號
  const subjectMatches = (subject || '').match(CONFIG.CASE_NUMBER_REGEX) || [];
  const subjectCaseNumbers = [...new Set(subjectMatches)];

  const bodyAttText = [body, ...(attNames || [])].join(' ');
  const bodyMatches = bodyAttText.match(CONFIG.CASE_NUMBER_REGEX) || [];
  const bodyCaseNumbers = [...new Set(bodyMatches)];

  // 全部案號（去重）
  const allCaseNumbers = [...new Set([...subjectCaseNumbers, ...bodyCaseNumbers])];

  // 分類邏輯：用案號第10碼（index 9）判定專利/商標
  //   P, M, D, A, C → 專利
  //   T, B, W → 商標
  //   只看主旨案號；主旨無案號 → 未分類
  let category = '未分類';
  if (subjectCaseNumbers.length > 0) {
    const PATENT_TYPES = 'PMDAC';
    const TRADEMARK_TYPES = 'TBW';
    const typeChars = subjectCaseNumbers.map(cn => {
      // 案號第10碼（index 9）= 類型碼
      return cn.length >= 10 ? cn.charAt(9) : '';
    });
    const hasPatent = typeChars.some(c => PATENT_TYPES.includes(c));
    const hasTrademark = typeChars.some(c => TRADEMARK_TYPES.includes(c));
    if (hasPatent && !hasTrademark) category = '專利';
    else if (hasTrademark && !hasPatent) category = '商標';
  }

  // 客戶碼：案號前4碼（用於主旨無案號時的資料夾名稱）
  let clientCode = null;
  if (allCaseNumbers.length > 0) {
    clientCode = allCaseNumbers[0].substring(0, 4);
  }

  // 案號狀態
  let caseStatus = null;
  if (allCaseNumbers.length === 0) {
    caseStatus = '無案號';
  } else if (subjectCaseNumbers.length > 1) {
    // 只看主旨是否多案號
    caseStatus = '多案號';
  } else if (subjectCaseNumbers.length === 0 && bodyCaseNumbers.length > 0) {
    // 主旨無案號但內文有 → 標記無案號（不算多案號）
    caseStatus = '無案號';
  }
  // 主旨有案號 + 「等」→ 算多案號（如 BRIT25710PUS1等3案）
  // 註：「～」「~」「、」不需要，因為這些情況主旨一定有 2+ 個案號，上面已處理
  if (!caseStatus && subjectCaseNumbers.length > 0 && /等/.test(subject || '')) {
    if ((subject || '').match(/(?<![A-Za-z0-9])[A-Z0-9]{4}\d{5}[PMDTABCW][A-Z]{2}\d*\s*等/)) {
      caseStatus = '多案號';
    }
  }

  return {
    caseNumbers: allCaseNumbers,         // 全部案號（Sheet 紀錄用）
    subjectCaseNumbers: subjectCaseNumbers, // 主旨案號（決定多資料夾用）
    clientCode: clientCode,              // 客戶碼（主旨無案號時的資料夾名）
    caseCategory: category,
    caseStatus,
  };
}

/**
 * 結構化期限提取 — 根據 LLM 分類的 dates_found 和收發碼，用確定性規則選出正確期限
 * 回傳 { suffix: '期限3/17' } 或 null（無期限）
 */
function _selectDeadline(datesFound, sendReceiveCode, emailDate) {
  if (!datesFound || datesFound.length === 0) return null;

  const actionDates = datesFound.filter(function(d) { return d.type !== 'background'; });
  if (actionDates.length === 0) return null;

  function fmtDate(dateStr) {
    var parts = dateStr.split('-');
    var dateYear = parseInt(parts[0], 10);
    var emailYear = parseInt(emailDate.split('-')[0], 10);
    var base = parseInt(parts[1], 10) + '/' + parts[2];
    return dateYear !== emailYear ? dateYear + '/' + base : base;
    // 同年: "3/17"  跨年: "2029/7/31"
  }

  function isExpired(dateStr) {
    return dateStr < emailDate;  // ISO 字串字典序 = 日期順序
  }

  var our = null, official = null, eta = null;
  for (var i = 0; i < actionDates.length; i++) {
    if (actionDates[i].type === 'our_request' && !our) our = actionDates[i];
    if (actionDates[i].type === 'official_deadline' && !official) official = actionDates[i];
    if (actionDates[i].type === 'counterpart_eta' && !eta) eta = actionDates[i];
  }

  switch (sendReceiveCode) {
    case 'TA': {
      if (our && !isExpired(our.date)) return { suffix: '期限' + fmtDate(our.date) };
      if (our && isExpired(our.date) && official) return { suffix: '通知官方期限' + fmtDate(official.date) };
      if (official) return { suffix: '通知官方期限' + fmtDate(official.date) };
      return null;
    }
    case 'TC': {
      if (our && !isExpired(our.date)) return { suffix: '建議' + fmtDate(our.date) + '前回覆' };
      if (our && isExpired(our.date) && official) return { suffix: '通知官方期限' + fmtDate(official.date) };
      if (official) return { suffix: '通知官方期限' + fmtDate(official.date) };
      if (our) return { suffix: '建議' + fmtDate(our.date) + '前回覆' };
      return null;
    }
    case 'FA': {
      if (eta) return { suffix: '預計' + fmtDate(eta.date) + '提供' };
      if (our) return { suffix: '建議' + fmtDate(our.date) + '前回覆' };
      if (official) return { suffix: '期限' + fmtDate(official.date) };
      return null;
    }
    case 'FC': {
      if (our) return { suffix: '期限' + fmtDate(our.date) };
      if (official) return { suffix: '期限' + fmtDate(official.date) };
      return null;
    }
    case 'FG': case 'TG': {
      if (official) return { suffix: '期限' + fmtDate(official.date) };
      return null;
    }
    default: {
      if (our) return { suffix: '期限' + fmtDate(our.date) };
      if (official) return { suffix: '期限' + fmtDate(official.date) };
      return null;
    }
  }
}


/**
 * 從 HTML 提取主文區域，排除引用和簽名檔內容
 * 避免回覆/轉寄信中舊信的日期汙染 LLM 判斷
 */
function _extractMainBody(message) {
  const html = message.getBody() || '';

  // 嘗試從 HTML 切割主文（排除引用和簽名檔）
  let mainHtml = html;
  const quoteMarkers = ['class="gmail_quote"', 'class="gmail_attr"',
    '<blockquote', '<!-- originalMessage -->'];
  for (const marker of quoteMarkers) {
    const pos = mainHtml.indexOf(marker);
    if (pos > 0) { mainHtml = mainHtml.substring(0, pos); break; }
  }
  const sigPos = mainHtml.indexOf('class="gmail_signature"');
  if (sigPos > 0) mainHtml = mainHtml.substring(0, sigPos);

  // Strip HTML tags → plain text
  const mainText = mainHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(div|p|tr|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // 如果主文太短（< 100 字），fallback 到完整 plain body（可能非 Gmail 格式）
  if (mainText.length < 100) {
    return (message.getPlainBody() || '').substring(0, CONFIG.BODY_SNIPPET_LENGTH);
  }

  return mainText.substring(0, CONFIG.BODY_SNIPPET_LENGTH);
}

function _preprocessMessage(message, senderMap) {
  const sender = message.getFrom();
  const senderEmail = _extractEmail(sender);
  const { cleaned, original } = _cleanSubject(message.getSubject() || '');
  const direction = _getDirection(senderEmail);

  const recipients = [
    ...(message.getTo() || '').split(','),
    ...(message.getCc() || '').split(','),
  ].map(r => _extractEmail(r)).filter(Boolean);

  // 角色判定邏輯：
  //   收到的信（F）→ 看「寄件人」是誰（客戶/代理人/政府）
  //   寄出的信（T）→ 看「收件人」是誰（我們寄給客戶/代理人/政府）
  let role, roleSource;
  if (direction === 'T') {
    // 寄出：找第一個非自己 domain 的收件人來判角色
    const externalRecipient = recipients.find(r => !CONFIG.OWN_DOMAINS.includes(_extractDomain(r)));
    if (externalRecipient) {
      ({ role, source: roleSource } = _getSenderRole(externalRecipient, senderMap));
    } else {
      role = 'X';
      roleSource = 'no_external_recipient';
    }
  } else {
    // 收到：看寄件人
    ({ role, source: roleSource } = _getSenderRole(senderEmail, senderMap));
  }
  const code = _getSendReceiveCode(direction, role);

  const attachments = _filterSignatureImages(_getSmartAttachments(message));
  const attachmentNames = attachments.map(a => a.getName());
  const body = _extractMainBody(message);
  const emailYear = message.getDate().getFullYear();
  const extractedDates = _extractDatesFromText(body, emailYear);
  const caseInfo = _extractCaseInfo(cleaned, body, attachmentNames);

  // 提取 HTML 中被強調的文字（bold/highlight/colored），供 LLM 判斷重點
  const highlights = _extractHighlights(message);

  // 取得同 thread 其他信件的標題，供 LLM 判斷上下文（如 ROA 序號）
  const threadSubjects = _getThreadSubjects(message);

  return {
    messageId: message.getId(),
    date: message.getDate(),
    sender: senderEmail,
    recipients: recipients,
    subject: cleaned,
    originalSubject: original,
    direction: direction,
    role: role,
    sendReceiveCode: code,
    hasAttachments: attachments.length > 0,
    attachmentNames: attachmentNames,
    bodySnippet: body,
    highlights: highlights,
    caseNumbers: caseInfo.caseNumbers,
    subjectCaseNumbers: caseInfo.subjectCaseNumbers,
    clientCode: caseInfo.clientCode,
    caseCategory: caseInfo.caseCategory,
    caseStatus: caseInfo.caseStatus,
    extractedDates: extractedDates,
    threadSubjects: threadSubjects,
    _message: message,
    _attachments: attachments,
  };
}

/**
 * 取得同 thread 中其他信件的標題和寄件人（按時間排序，最早在前）
 * 用於提供 LLM 上下文，避免回覆信遺失原始信件的事項碼（如 ROA2→ROA1）
 */
function _getThreadSubjects(message) {
  try {
    const thread = message.getThread();
    const messages = thread.getMessages();
    if (messages.length <= 1) return [];
    const currentId = message.getId();
    const currentDate = message.getDate().getTime();
    return messages
      .filter(function(m) {
        return m.getId() !== currentId && m.getDate().getTime() < currentDate;
      })
      .slice(0, 10)  // 最多取 10 封避免 token 過長
      .map(function(m) {
        return {
          date: Utilities.formatDate(m.getDate(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
          from: _extractEmail(m.getFrom()),
          subject: m.getSubject() || '',
        };
      });
  } catch (e) {
    Logger.log('⚠️ _getThreadSubjects 失敗: ' + e.message);
    return [];
  }
}


// ===================== 智慧附件過濾（V1 教訓） =====================

/**
 * 智慧取得附件：過濾 inline 簽名圖片
 *
 * 策略（V1 累積的經驗）：
 * 1. Gmail 信件（有 gmail_quote / gmail_signature 標記）：
 *    分析 HTML 結構，若主文區域有 cid: 引用 → 保留全部（可能含截圖）
 *    若主文區域無 cid: → 過濾所有 inline 圖片
 * 2. Outlook 等非 Gmail 信件（無標記）：
 *    無法判斷主文邊界，直接用 includeInlineImages:false 過濾
 *    正文截圖仍完整保留於 .eml 檔中
 */
function _getSmartAttachments(message) {
  const htmlBody = message.getBody() || '';
  const hasGmailMarkers =
    htmlBody.indexOf('gmail_quote') !== -1 || htmlBody.indexOf('gmail_signature') !== -1;

  if (hasGmailMarkers) {
    // Gmail 信件：用主文邊界偵測
    if (_hasBodyInlineImages(htmlBody)) {
      // 主文含 inline 圖片（可能是截圖），保留全部附件
      return message.getAttachments() || [];
    } else {
      // 主文沒有 inline 圖片，過濾簽名檔圖片
      return message.getAttachments({ includeInlineImages: false }) || [];
    }
  } else {
    // Outlook 等非 Gmail 信件：直接過濾 inline
    return message.getAttachments({ includeInlineImages: false }) || [];
  }
}

/**
 * 檢查 Gmail HTML body 的「主文區域」是否有 inline 圖片引用（cid:）
 * 主文區域 = gmail_quote 和 gmail_signature 標記之前的內容
 */
function _hasBodyInlineImages(htmlBody) {
  if (!htmlBody) return false;

  let mainContent = htmlBody;

  // 找到 gmail_quote 的位置（引用的舊信）
  const quotePos = htmlBody.indexOf('gmail_quote');
  if (quotePos > 0) mainContent = htmlBody.substring(0, quotePos);

  // 再排除 gmail_signature（自己的簽名檔）
  const sigPos = mainContent.indexOf('gmail_signature');
  if (sigPos > 0) mainContent = mainContent.substring(0, sigPos);

  // 檢查主文區域是否有 cid: 引用
  return mainContent.indexOf('cid:') !== -1;
}

/**
 * 二次過濾：移除可能是簽名檔的小圖片
 * 規則：只過濾圖片類型，且 < 5KB + 檔名符合簽名圖特徵
 */
function _filterSignatureImages(attachments) {
  if (!attachments || attachments.length === 0) return attachments;

  const SIG_THRESHOLD = 5 * 1024; // 5KB
  const SIG_NAME_PATTERN = /^(image\d*|logo|banner|signature|icon|cid-|unnamed)/i;
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

  const filtered = attachments.filter(function(att) {
    const contentType = (att.getContentType() || '').toLowerCase();
    if (!IMAGE_TYPES.some(t => contentType.indexOf(t) !== -1)) return true; // 非圖片一律保留
    const size = att.getSize ? att.getSize() : att.getBytes().length;
    if (size >= SIG_THRESHOLD) return true; // ≥ 5KB 一律保留
    const name = att.getName() || '';
    if (SIG_NAME_PATTERN.test(name)) {
      Logger.log('  🗑️ 過濾簽名圖片: ' + name + ' (' + size + ' bytes)');
      return false;
    }
    if (name.length < 15) {
      Logger.log('  🗑️ 過濾簽名圖片(短檔名): ' + name + ' (' + size + ' bytes)');
      return false;
    }
    // 超小圖片（< 3KB）無論檔名都過濾（幾乎不可能是有意義的附件）
    if (size < 3 * 1024) {
      Logger.log('  🗑️ 過濾超小圖片: ' + name + ' (' + size + ' bytes)');
      return false;
    }
    return true;
  });

  if (filtered.length < attachments.length) {
    Logger.log('  📎 附件過濾: ' + attachments.length + ' → ' + filtered.length);
  }
  return filtered;
}

/**
 * 用 regex 從文字中提取所有日期，統一轉為 ISO 格式
 * 「找日期」交給 regex（100% 可靠），「理解日期」交給 LLM
 * @param {string} text - 信件主文（已排除引用區域）
 * @param {number} emailYear - 從 email_date 取得，用於補全沒寫年份的日期
 * @returns {Array<{date: string, raw: string}>}
 */
function _extractDatesFromText(text, emailYear) {
  var results = [];
  var seen = {};

  function addDate(y, m, d, raw) {
    var mm = ('0' + m).slice(-2);
    var dd = ('0' + d).slice(-2);
    var iso = y + '-' + mm + '-' + dd;
    if (m < 1 || m > 12 || d < 1 || d > 31) return;
    if (!seen[iso]) {
      seen[iso] = true;
      results.push({ date: iso, raw: raw });
    }
  }

  var monthMap = {
    'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,
    'july':7,'august':8,'september':9,'october':10,'november':11,'december':12,
    'jan':1,'feb':2,'mar':3,'apr':4,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12
  };

  // P1: "17 March 2026", "17th March, 2026"
  var p1 = /(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})/gi;
  var m;
  while ((m = p1.exec(text)) !== null) {
    addDate(parseInt(m[3]), monthMap[m[2].toLowerCase()], parseInt(m[1]), m[0]);
  }

  // P2: "March 17, 2026", "Mar 17 2026"
  var p2 = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})/gi;
  while ((m = p2.exec(text)) !== null) {
    addDate(parseInt(m[3]), monthMap[m[1].toLowerCase()], parseInt(m[2]), m[0]);
  }

  // P3: ISO "2026-03-17"
  var p3 = /(\d{4})-(\d{2})-(\d{2})/g;
  while ((m = p3.exec(text)) !== null) {
    addDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[0]);
  }

  // P4: "2026/03/17" or "2026/3/17"
  var p4 = /(\d{4})\/(\d{1,2})\/(\d{1,2})/g;
  while ((m = p4.exec(text)) !== null) {
    addDate(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[0]);
  }

  // P5: Chinese "2026年3月17日" or "3月17日"
  var p5 = /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/g;
  while ((m = p5.exec(text)) !== null) {
    var yr = m[1] ? parseInt(m[1]) : emailYear;
    addDate(yr, parseInt(m[2]), parseInt(m[3]), m[0]);
  }

  // P6: "03/17/2026" or "17/03/2026" (MM/DD/YYYY 或 DD/MM/YYYY)
  // 智慧判斷：某一欄 > 12 → 那欄一定是日；兩欄都 ≤ 12 → 歧義，跳過
  var p6 = /(?<!\d)(\d{1,2})\/(\d{1,2})\/(\d{4})(?!\d)/g;
  while ((m = p6.exec(text)) !== null) {
    var a = parseInt(m[1]), b = parseInt(m[2]), y = parseInt(m[3]);
    if (a > 12 && b <= 12) {
      // a 是日, b 是月 → DD/MM/YYYY（歐洲格式）
      addDate(y, b, a, m[0]);
    } else if (b > 12 && a <= 12) {
      // b 是日, a 是月 → MM/DD/YYYY（美式格式）
      addDate(y, a, b, m[0]);
    }
    // 兩欄都 ≤ 12 → 歧義，跳過（P1/P2 的英文月份格式會抓到）
  }

  return results;
}


/**
 * 從 HTML body 提取被強調的文字（bold、highlight、彩色字）
 * 這些通常是寄件人想強調的重點（如截止日期、重要指示）
 * 回傳去重後的文字陣列，最多 10 項
 */
function _extractHighlights(message) {
  try {
    const html = message.getBody() || '';
    if (!html) return [];

    // 只看主文（排除引用和簽名檔）
    let mainHtml = html;
    const quotePos = html.indexOf('gmail_quote');
    if (quotePos > 0) mainHtml = html.substring(0, quotePos);
    const sigPos = mainHtml.indexOf('gmail_signature');
    if (sigPos > 0) mainHtml = mainHtml.substring(0, sigPos);

    const highlights = [];

    // 匹配 <b>、<strong> 標籤內的文字
    const boldRegex = /<(?:b|strong)(?:\s[^>]*)?>([^<]{3,200})<\/(?:b|strong)>/gi;
    let m;
    while ((m = boldRegex.exec(mainHtml)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
      if (text.length >= 3) highlights.push(text);
    }

    // 匹配有 color 或 background-color 的 font/span（排除黑色和白色）
    const colorRegex = /<(?:font|span)[^>]*(?:color\s*=\s*["'](?!(?:#000|#fff|black|white))([^"']+)["']|background[^:]*:[^;"]*(?!(?:white|transparent)))[^>]*>([^<]{3,200})<\/(?:font|span)>/gi;
    while ((m = colorRegex.exec(mainHtml)) !== null) {
      const text = m[2].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
      if (text.length >= 3) highlights.push(text);
    }

    // 去重，最多 10 項
    return [...new Set(highlights)].slice(0, 10);
  } catch (e) {
    return [];
  }
}


// ===================== Gemini LLM =====================

const SYSTEM_PROMPT = `你是 IP Winner 智財事務所的 email 分類助手。根據以下資訊判斷 email 類型並產生語義檔名。

## 輸入格式
你會收到一封 email 的結構化 JSON：
- subject: 信件標題（已去除 RE:/Fwd: 前綴）
- original_subject: 原始標題
- direction: "F"（收到）或 "T"（寄出）
- role: "C"（客戶）, "A"（代理人）, "G"（政府）, "X"（未知）
  ※ 收到的信（F）：role = 寄件人角色；寄出的信（T）：role = 收件人角色
- sender: 寄件人 email
- recipients: 收件人列表
- case_numbers: 案號列表
- has_attachments: 是否有附件
- attachment_names: 附件檔名列表
- body_snippet: 信件內文前 2000 字（已去除引用和簽名檔內容）
- highlighted_text: 信件中被加粗/上色/標記的重點文字（從 HTML 提取，通常是寄件人想強調的內容如期限、重要指示）
- email_date: 信件寄送日期（ISO格式），用來判斷信中提到的期限是否已過期
- extracted_dates: 程式碼從信件主文中用 regex 提取的所有日期（已排除引用區域），格式 [{"date":"2026-03-17","raw":"17 March 2026"}, ...]
- thread_context:（可選）同一 Gmail thread 中時間較早的信件標題和寄件人，按時間排序。用於判斷回覆信的上下文（如事項碼 OA/ROA 序號）
  ⚠ thread_context 僅供參考上下文（如判斷 ROA 序號、回覆關係）。filing_case_numbers 必須基於「這封信本身」的主旨和內文判斷，不應加入僅出現在 thread 其他信件的案號。

## 第一步：確認收發文碼
- F + C → FC | F + A → FA | F + G → FG | F + X → FX
- T + C → TC | T + A → TA | T + G → TG | T + X → TX

### 未知來源角色推斷（role = "X" 時必做）
**代理人（A）線索：** 送件報告、Filing Report、確認承辦、帳單/Invoice/Debit Note、正式商業英文提及 filing/prosecution/registration
**客戶（C）線索：** 簡短回覆（ok/確認/同意）、指示答辯/領證、提及「我們的產品」「我司」、一般企業 domain
**政府（G）線索：** 官方通知/核駁/電子收據、domain 含 gov

能推斷 → inferred_role 填 C/A/G，收發碼改具體碼。無法判斷 → inferred_role 填 null，保留 FX/TX。

## 第二步：產生語義檔名
前綴引導 + 自由摘要，必須從以下前綴選擇：

**FC：** 確認、已簽、提供、回覆、指示、答辯指示、領證指示、年費指示、提出
**TC：** 進度通知-、送核-、待簽-、確認、確認收文-、提醒回覆指示-、OA分析、商標監控、商標核准通知、專利領證通知、說明、建議
**FA：** 轉寄-、送件報告、{代理人}帳單、確認承辦、送核-、來信告知、回覆、是否、提供
**TA：** 委託、確認可送件、校稿意見、提供、詢問、告知、結案通知
**FG：** E-Filing Receipt、TIPO電子收據、TIPO電子帳單、線上變更...成功通知

⚠ 「告知」「確認收到」後面必須補充具體事項，不可只寫「告知-確認收到」。
要從信件內容判斷在確認收到什麼：委託指示、送件報告、答辯稿等。
✓「告知-確認收到委託指示-(T-新)」
✓「告知-確認收到送件報告-(ROA1)」
✗「告知-確認收到」← 過於模糊
✗「告知-確認收到來信」← 等同沒說

### 括號事項碼完整清單
⚠ 只要信件涉及具體案件流程（OA、ROA、異議、年費、領證、新案申請等），
括號事項碼就**必須**加上。不確定序號時用 1（如 -(OA1)、-(ROA1)）。
只有純行政事務（帳單、合約、一般通知）才不加事項碼。

**發明專利(P)：** -(P-新), -(P-翻), -(P-轉), -(P-分), -(P-改), -(P-暫), -(P-CA), -(P-CIP)
**新型專利(M)：** -(M-新), -(M-翻), -(M-轉), -(M-分), -(M-改)
**設計(D)：** -(D-新), -(D-翻), -(D-轉), -(D-分), -(D-改), -(D-CA), -(D-CIP), -(D-似)
**商標(T)：** -(T-新), -(T-分)
**OA/ROA：** -(OA1), -(OA2), -(ROA1), -(ROA2)
**領證/年費：** -(領證), -(領證+Y1-3), -(領證+Y1-5), -(Y4), -(延展)
**優先權：** -(申優n)（n 為字面符號，實際使用時手動填寫數字）
**其他：** -(變更申請人名稱), -(POA), -(補正), -(申請書), -(主動撤回), -(DEC+ASG)
**去重規則：** 如果前綴本身已包含事項碼資訊，括號中不再重複。
  例：前綴是「OA分析」→ 事項碼寫 -(OA1)，完整為「OA分析-(OA1)」✓
  錯誤範例：「OA分析-(OA1)」中再寫「OA分析-(OA1)-(OA1)」✗
  錯誤範例：前綴用「OA分析」但事項碼也寫入OA → 結果出現「OA分析-(OA分析)」或「提醒回覆指示-OA分析-(OA1)」這種重複，應精簡為「提醒回覆指示-(OA1)」或「提醒回覆指示-OA1分析」二選一

⚠ 描述文字中避免使用「OA」縮寫，改用中文「審查意見」或「答辯」。
「OA」只出現在括號事項碼中，如 -(OA1)、-(ROA1)。
✓「確認收到-法國商標審查意見-(OA1)」
✓「來信告知-答辯程序確認-(OA1)」
✗「確認收到-法國商標OA-(OA1)」← OA 重複
✗「來信告知-OA程序確認-(OA1)」← OA 重複

### OA vs ROA 判斷
- OA（審查意見）= 收到官方或代理人轉來的 Office Action 通知
- ROA（答辯/回覆審查意見）= 針對 OA 的回應行動（答辯、回覆、送件）
- 關鍵判斷：標題或內容含「Responding to Office Action」「答辯」「Response to OA」→ 一律用 ROA，不是 OA
- ROA 序號：看信件提及的是第幾次回覆（ROA1 = 首次答辯，ROA2 = 第二次），無法判斷時用 ROA1
- ⚠ thread_context 優先：如果 thread_context 中的原始信件標題已包含 OA/ROA 序號（如 OA2、ROA2），回覆信必須沿用相同序號，不可降回 ROA1

### V22 新增命名模板
以下模板補充現有規則未涵蓋的情境：

**確認收文類（TC）：**
- 確認收文-POA：確認收到客戶已簽 POA（vs 待簽-POA 是送給客戶簽）

**委託類（TA）：**
- 委託-(申優n)：委託代理人申請優先權證明

**轉寄類（FA）：**
- 轉寄-優先權證電子檔：代理人轉寄優先權證電子檔
- 轉寄-受理通知書：代理人轉寄國外受理通知書

**送核類（TC）：**
- 送核-暫時案初稿 / 送核-暫時案N校稿：暫時案(provisional)
- 送核-CA案初稿 / 送核-CA案N校稿：延續案(continuation)
- 送核-CIP案初稿 / 送核-CIP案N校稿：部分延續案(CIP)
- 送核-商品服務清單初稿 / 送核-商品服務清單N校稿：商標商品服務清單

**已簽類（FC）：**
- 已簽-DEC+ASG：客戶回傳已簽 Declaration + Assignment

**確認送件類（FC）：**
- 確認改後可送件-(XX)：確認修改後可送件（vs 確認可送件-(XX) 是首次確認）

**官方收據類（FG）：**
- E-Filing Receipt-(申優n)：申請優先權的電子收件通知
- TIPO電子收據-(申優n)：申請優先權的 TIPO 收據

**進度通知類（TC）：**
- 進度通知-專利暫時案送件完成
- 進度通知-專利CA案送件完成
- 進度通知-專利CIP案送件完成
- 進度通知-商標分案送件完成

### 商品服務清單命名子模式
商標案涉及商品服務清單時，命名格式：商品服務清單-(n, m類)-Dn校稿意見
其中類別（n, m類）可從附件 Excel 檔名判斷，如「商品服務清單-(9, 42類)-D0校稿意見」。

### Dn 版本號推斷規則
客戶回覆校稿意見時，Dn 版本號根據被回覆的原始信件主旨判斷：
- 原始信主旨含「初稿」→ Dn = D0
- 原始信主旨含「1校稿」→ Dn = D1
- 原始信主旨含「2校稿」→ Dn = D2
- 依此類推。可從 thread_context 中取得原始信件主旨。

### 代理人帳單代碼：bskb.com→BSKB帳單, naipo.com→NAIP帳單, cpaglobal.com→CPA帳單, atmac.com.au→ATMAC帳單

### 代理人名稱在語義名中的位置
帳單維持「{代碼}帳單」格式不變（BSKB帳單、CPA帳單等，已是慣例）。
其他類型（送件報告、確認承辦等）代理人代碼統一放在描述之後，用 - 連接：
✓「送件報告-BSKB」「確認承辦-Tilleke」
✗「BSKB送件報告」「Tilleke確認承辦」← 代理人名不放前面

### 客戶公司名稱（嚴格禁止）
⚠ eml_filename **絕對不可包含**任何客戶公司名稱。客戶身份已由案號代表，語義名中重複客戶名是冗餘資訊。
   禁止的客戶名包括但不限於：國昊、国昊、慧盈、Cohorizon 的客戶名等。
   ✗「轉寄-法國商標審查意見-國昊-(OA1)」← 含客戶名，錯誤
   ✓「轉寄-法國商標審查意見-(OA1)」← 不含客戶名，正確
   ✗「委託-商標新案-国昊-(T-新)」← 含客戶名，錯誤
   ✓「委託-商標新案-(T-新)」← 不含客戶名，正確
   代理人/事務所名稱（如 BSKB、Tilleke、Metida）可保留，因為代理人名是辨識來源的關鍵資訊。

### 截止日：由程式碼自動處理，LLM 不在 eml_filename 中加日期
⚠ eml_filename 欄位**不包含**任何日期後綴（如 -期限3/17、-建議3/15前回覆）。
日期選擇由程式碼根據 dates_found 和收發碼自動決定並附加。
LLM 只需在 dates_found 欄位列出信中所有日期並分類（見下方 JSON 輸出格式）。

### 引用內容中的日期
回覆信和轉寄信的 body 可能包含被引用的舊信內容（如 "On ... wrote:" 之後的文字）。
⚠ dates_found 只列本封信「新寫內容」中的日期，不列引用區域中的日期。
引用中的日期是舊信的資訊，不代表本封信的行動期限。
如果本封回覆信本身沒有提到新的日期，dates_found 填空陣列 []。

### dates_found 分類提示
- our_request：我方或對方設定的 deadline，有約束力（「by [date]」「X/XX 前回覆」「for review by」）
- counterpart_eta：對方自述的預計回覆時間（「will send by」「會在 X/XX 前回覆」「will get back by」）
- official_deadline：官方機關設定的期限（Opposition Deadline、OA response due、答辯期限）
- background：非行動性日期（申請日、公告日、活動日期、來信日）
- background 的額外範例：商標專用期間屆滿日、專利到期日、年費屆期日（renewal due date）。
  這些是「什麼時候會到期」的資訊，不是「什麼時候前要採取行動」的期限。
  只有需要在該日期前回覆、送件、繳費的才算 official_deadline。

### 多案號清單型信件
如果信件列出多個案號且各有不同期限或事項碼：
- dates_found 填空陣列 []（因為多案號各有不同期限，無法代表；此情況不受 extracted_dates 必須全列的規則約束）
- 事項碼：如果有多種不同事項碼（OA 和 OA1 混合），不加括號事項碼
- 例：「進度通知-專利審查意見案件清單」

### 廣告/推廣/電子報
明顯的行銷廣告、產品推廣、線上活動邀請、電子報、研討會邀請：
- 前綴改用「廣告-」
- 例：「廣告-Questel-AI專利撰寫直播」「廣告-LexisNexis-AI法律培訓」

### FA/FC 前綴精確語義
- 「確認承辦」= 代理人明確接受案件委託，承諾執行
- 「確認收到」= 僅確認收到信件/指示，尚未承諾或轉交中（如「已轉寄給 legal team」「will forward to attorney」）
- 對方自述預計回覆時間用「預計M/DD回覆」或「預計M/DD前提供」，而非「期限M/DD」

### 高頻模板參考
%%TEMPLATES%%

### 近期人工修正紀錄
%%CORRECTIONS%%

### correction_applied 欄位
若你在判斷時參考了上述「近期人工修正紀錄」中的某條修正，在 JSON 輸出的 correction_applied 欄位填入該紀錄的信件主旨關鍵字（10字以內）；若未參考任何修正紀錄，填 null。

## 第三步：案件類別（由程式碼根據案號第10碼判定，LLM 不需處理）

## 第四步：判斷歸檔案號
分析信件內容，判斷這封信「實際應該歸檔到哪些案號」：
- 信件主要處理/討論的案號 → 放入 filing_case_numbers
- 只是順便引用/參考的案號 → 不放入
- 如果主旨有案號但內文討論的案號更多 → 以實際內容為準
- 範例：異議申請信主案是 KOIS23004BGB5，內文引用先前商標 KOIS23004TGB1 作為依據 → 只歸 ["KOIS23004BGB5"]
- 範例：PCT 與 US 案對應表列出 19 個案號都是信件主題 → 歸全部 19 個

## 輸出 JSON（只回 JSON，不加其他文字）
{
  "send_receive_code": "FA",
  "eml_filename": "送件報告-(ROA1)",
  "dates_found": [
    {"date": "2026-03-23", "type": "official_deadline", "label": "OA response due"},
    {"date": "2026-03-17", "type": "our_request", "label": "for review by"},
    {"date": "2026-01-04", "type": "background", "label": "Filing Date"}
  ],
  "case_category": "專利",
  "case_status": null,
  "filing_case_numbers": ["XXXX00000PXX1"],
  "inferred_role": null,
  "confidence": 0.92,
  "reasoning": "簡短理由",
  "correction_applied": null
}

### dates_found 欄位說明
根據 extracted_dates（程式碼提取的日期清單）和信件內容，為每個日期標註 type。
⚠ extracted_dates 中的每個日期都必須出現在 dates_found 中（除非你確定該日期不在主文中，而是 regex 誤匹配的）。
如果 extracted_dates 中有日期但你不確定其類型，標為 background。

每個日期標註 type：
- **official_deadline** — 官方機關設定的期限（Opposition Deadline、OA response due、答辯期限）
- **our_request** — 我方設定的要求期限（"by [date]"、"X/XX 前回覆"、"for review by"、"please prepare draft by"）
- **counterpart_eta** — 對方自述的預計時間（"will send by"、"會在 X/XX 前回覆"）
- **background** — 非行動性日期（申請日、公告日、來信日、活動日期）

⚠ eml_filename 中**不要加日期**，日期選擇由程式碼根據 dates_found 和收發碼自動處理。
⚠ 日期格式一律用 ISO 格式 yyyy-MM-dd（如 2026-03-17）。
⚠ 如果信件沒有任何日期，dates_found 填空陣列 []。

注意：語義名稱用繁體中文、25字以內、不照抄英文標題。
注意：reasoning 請控制在 30 字以內，只寫關鍵判斷依據。
注意：filing_case_numbers 只列實際要歸檔的案號，不含參考引用的案號。`;


function _buildPrompt(corrections, templates) {
  let sysPrompt = SYSTEM_PROMPT;

  if (templates && templates.length > 0) {
    sysPrompt = sysPrompt.replace('%%TEMPLATES%%',
      templates.map(t => '- ' + t[2] + ': ' + t[3]).join('\n'));
  } else {
    sysPrompt = sysPrompt.replace('%%TEMPLATES%%', '（尚無模板資料）');
  }

  if (corrections && corrections.length > 0) {
    sysPrompt = sysPrompt.replace('%%CORRECTIONS%%',
      corrections.map(c => {
        let line = '- 「' + c.subject + '」';
        if (c.aiCode !== c.finalCode) line += ' ' + c.aiCode + '→' + c.finalCode;
        if (c.aiName !== c.finalName) line += ' 「' + c.aiName + '」→「' + c.finalName + '」';
        if (c.reason) line += ' （原因：' + c.reason + '）';
        return line;
      }).join('\n'));
  } else {
    sysPrompt = sysPrompt.replace('%%CORRECTIONS%%', '（尚無修正紀錄）');
  }

  return sysPrompt;
}


/**
 * 單封呼叫 Gemini（備用）
 */
function _callGemini(preprocessed, corrections, templates) {
  const results = _callGeminiBatch([preprocessed], corrections, templates);
  return results[0];
}

/**
 * 批次並行呼叫 Gemini — 用 UrlFetchApp.fetchAll() 一次送多封
 * 大幅加速：10 封從 ~100 秒 → ~15 秒
 */
function _callGeminiBatch(preprocessedList, corrections, templates) {
  const apiKey = getApiKey();
  const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_MODEL + ':generateContent?key=' + apiKey;
  const sysPrompt = _buildPrompt(corrections, templates);

  // 組裝所有請求
  const requests = preprocessedList.map(preprocessed => {
    const inputObj = {
      subject: preprocessed.subject,
      original_subject: preprocessed.originalSubject,
      direction: preprocessed.direction,
      role: preprocessed.role,
      sender: preprocessed.sender,
      recipients: preprocessed.recipients.slice(0, 5),
      case_numbers: preprocessed.caseNumbers,
      has_attachments: preprocessed.hasAttachments,
      attachment_names: preprocessed.attachmentNames.slice(0, 10),
      body_snippet: preprocessed.bodySnippet,
      highlighted_text: preprocessed.highlights || [],
      email_date: Utilities.formatDate(preprocessed.date, 'Asia/Taipei', 'yyyy-MM-dd'),
      extracted_dates: preprocessed.extractedDates || [],
    };
    // 只在有 thread 上下文時才加入（減少 token）
    if (preprocessed.threadSubjects && preprocessed.threadSubjects.length > 0) {
      inputObj.thread_context = preprocessed.threadSubjects;
    }
    const userPrompt = JSON.stringify(inputObj);

    return {
      url: endpoint,
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: sysPrompt }] },
        generationConfig: {
          temperature: CONFIG.GEMINI_TEMPERATURE,
          maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS,
          responseMimeType: 'application/json',
        },
      }),
      muteHttpExceptions: true,
    };
  });

  // 一次送出所有請求（並行）
  const responses = UrlFetchApp.fetchAll(requests);

  const FAIL_RESULT = {
    sendReceiveCode: null, emlFilename: null, datesFound: [], caseCategory: '未分類',
    caseStatus: null, inferredRole: null, confidence: 0, reasoning: '解析失敗',
    tokenInfo: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };

  // 結構化期限提取：解析成功後，用 _selectDeadline 附加日期到 filename
  function _applyDeadline(parsed, idx) {
    if (!parsed) return parsed;
    var emailDate = Utilities.formatDate(preprocessedList[idx].date, 'Asia/Taipei', 'yyyy-MM-dd');
    var deadline = _selectDeadline(parsed.datesFound, parsed.sendReceiveCode, emailDate);
    if (deadline) {
      // 移除 LLM 可能自己加的日期（防止重複）
      var name = parsed.emlFilename.replace(/-(?:期限|建議|通知官方期限|預計)\d+[/_]\d+.*$/, '');
      parsed.emlFilename = name + '-' + deadline.suffix;
    }
    return parsed;
  }

  // 解析所有回應
  return responses.map((resp, idx) => {
    if (resp.getResponseCode() !== 200) {
      Logger.log('Gemini API 錯誤 (#' + idx + '): ' + resp.getResponseCode());
      return Object.assign({}, FAIL_RESULT, { reasoning: 'API錯誤:' + resp.getResponseCode() });
    }

    const result = _parseGeminiResponse(resp.getContentText());
    if (result.parsed && result.parsed.confidence >= 0) {
      // 完整解析：confidence 是 LLM 明確回傳的值（≥0）
      return _applyDeadline(result.parsed, idx);
    }
    if (result.parsed && result.parsed.confidence === -1) {
      // 部分解析：有檔名但 confidence 遺失（可能是 JSON 截斷修復造成）
      Logger.log('⚠️ #' + idx + ' LLM 回應缺少 confidence 欄位，觸發重試');
      // 繼續往下走重試邏輯
    }

    // 解析失敗 → 單封重試（不重送整批）
    Logger.log('LLM 回應解析失敗 (#' + idx + ')，原始回應: ' + (result.rawText || '').substring(0, 300));

    for (let retry = 1; retry <= CONFIG.MAX_RETRY; retry++) {
      Logger.log('🔄 重試 #' + retry + ' (封 #' + idx + ')');
      try {
        const retryResp = UrlFetchApp.fetch(requests[idx].url, {
          method: requests[idx].method,
          contentType: requests[idx].contentType,
          payload: requests[idx].payload,
          muteHttpExceptions: true,
        });
        if (retryResp.getResponseCode() !== 200) continue;

        const retryResult = _parseGeminiResponse(retryResp.getContentText());
        if (retryResult.parsed && retryResult.parsed.confidence >= 0) {
          Logger.log('✅ 重試 #' + retry + ' 成功 (封 #' + idx + ')');
          return _applyDeadline(retryResult.parsed, idx);
        }
      } catch (retryErr) {
        Logger.log('🔄 重試 #' + retry + ' 失敗: ' + retryErr.message);
      }
    }

    Logger.log('❌ 封 #' + idx + ' 重試 ' + CONFIG.MAX_RETRY + ' 次後仍失敗');
    if (result.parsed && result.parsed.emlFilename) {
      // 有部分結果（檔名存在但 confidence 遺失）→ 用部分結果，confidence 設 0
      Logger.log('⚠️ #' + idx + ' 使用部分解析結果（confidence 遺失，設為 0）');
      result.parsed.confidence = 0;
      return _applyDeadline(result.parsed, idx);
    }
    return Object.assign({}, FAIL_RESULT, { tokenInfo: result.tokenInfo });
  });
}


/**
 * Thread 內事項碼對齊 — 同一 thread 的信件應使用相同的 OA/ROA 序號
 * 在 _callGeminiBatch() 返回後、逐封處理前呼叫
 * 邏輯：同 thread 內若有不同序號，取最高序號統一替換
 */
function _alignThreadEventCodes(preprocessedList, llmResults) {
  // 1. 按 thread ID 分組
  var threadGroups = {};  // threadId → [idx, ...]
  preprocessedList.forEach(function(p, idx) {
    try {
      var threadId = p._message.getThread().getId();
      if (!threadGroups[threadId]) threadGroups[threadId] = [];
      threadGroups[threadId].push(idx);
    } catch (e) {}
  });

  // 2. 對每個有多封信的 thread 進行對齊
  var eventCodePattern = /\((OA|ROA)(\d+)\)/;
  for (var threadId in threadGroups) {
    var indices = threadGroups[threadId];
    if (indices.length <= 1) continue;  // 單封不需處理

    // 提取每封信的事項碼
    var codes = indices.map(function(idx) {
      var name = (llmResults[idx] && llmResults[idx].emlFilename) || '';
      var m = name.match(eventCodePattern);
      return m ? { type: m[1], num: parseInt(m[2], 10), full: m[0] } : null;
    });

    // 找出最高序號（分 OA 和 ROA 系列）
    var maxByType = {};
    codes.forEach(function(c) {
      if (!c) return;
      if (!maxByType[c.type] || c.num > maxByType[c.type].num) {
        maxByType[c.type] = c;
      }
    });

    // 替換不一致的序號
    indices.forEach(function(idx, j) {
      var c = codes[j];
      if (!c) return;
      var max = maxByType[c.type];
      if (max && c.num !== max.num) {
        var oldCode = c.full;           // e.g. "(ROA1)"
        var newCode = '(' + c.type + max.num + ')';  // e.g. "(ROA2)"
        llmResults[idx].emlFilename = llmResults[idx].emlFilename.replace(oldCode, newCode);
        Logger.log('🔄 Thread 事項碼對齊: #' + idx + ' ' + oldCode + ' → ' + newCode);
      }
    });
  }
}


/**
 * 修復截斷的 JSON — 常見情況是 reasoning 太長被截斷
 * 策略：逐步嘗試修復尾端
 */
function _repairJson(text) {
  // 先嘗試完整的 { ... }
  const match = text.match(/\{[\s\S]*/);
  if (!match) return null;

  let json = match[0];

  // 嘗試 1：原文已經完整
  try { return JSON.parse(json); } catch (e) { /* 繼續 */ }

  // 嘗試 2：字串被截斷 — 關掉未結束的字串，補上 }
  // 例如 ..."reasoning": "寄件者為 Questel，內容為...（被截斷）
  const repairs = [
    json + '"}',           // 缺 " 和 }
    json + '"}\n}',        // 缺 " 和兩個 }
    json + '}',            // 缺 }
  ];

  // 嘗試 3：把截斷的 reasoning 之後的部分砍掉，重建
  // 找到 reasoning 之前已經解析成功的欄位
  const reasoningIdx = json.indexOf('"reasoning"');
  if (reasoningIdx > 0) {
    // 把 reasoning 砍掉，直接給個預設值
    const before = json.substring(0, reasoningIdx);
    repairs.push(before + '"reasoning": "（截斷）"}');
  }

  // 嘗試 4：陣列截斷修復 — filing_case_numbers 等陣列被截斷
  // 偵測未閉合的 [，截斷到最後一個完整元素，補上 ]
  const openBrackets = (json.match(/\[/g) || []).length;
  const closeBrackets = (json.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    // 找到最後一個完整的陣列元素（以 " 或數字結尾，後面接逗號或空白）
    let truncated = json;
    // 截掉最後一個不完整的元素（從最後的逗號或 [ 之後）
    const lastComma = truncated.lastIndexOf(',');
    const lastOpen = truncated.lastIndexOf('[');
    const cutPoint = Math.max(lastComma, lastOpen);
    if (cutPoint > 0) {
      const beforeCut = truncated.substring(0, cutPoint);
      // 如果 cutPoint 是 [，表示陣列內沒有完整元素，給空陣列
      const suffix = cutPoint === lastOpen ? '[]' : ']';
      // 補上所有缺少的閉合符號
      let fixed = beforeCut + suffix;
      // 計算剩餘未閉合的括號
      const remainOpen = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
      for (let b = 0; b < remainOpen; b++) fixed += '}';
      repairs.push(fixed);
    }
  }

  // 嘗試 5：通用未閉合括號修復 — 計算未匹配的 { 和 [，逐層補上
  {
    let fixed = json;
    // 先嘗試關閉可能截斷的字串
    const quoteCount = (fixed.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';
    // 補上未閉合的 ] 和 }
    const unclosedBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    for (let b = 0; b < unclosedBrackets; b++) fixed += ']';
    const unclosedBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (let b = 0; b < unclosedBraces; b++) fixed += '}';
    repairs.push(fixed);
  }

  for (const attempt of repairs) {
    try { return JSON.parse(attempt); } catch (e) { /* 繼續 */ }
  }

  return null;
}

/**
 * 解析單一 Gemini 回應文字 → LLM result 物件
 * 成功回傳 parsed object，失敗回傳 null
 */
function _parseGeminiResponse(respText) {
  try {
    const respJson = JSON.parse(respText);
    const usage = respJson.usageMetadata || {};
    const tokenInfo = {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
    };

    let text = respJson.candidates[0].content.parts[0].text;

    let r;
    try {
      r = JSON.parse(text);
    } catch (parseErr) {
      r = _repairJson(text);
      if (!r) return { parsed: null, tokenInfo, rawText: text };
    }

    // Fix 3: 若 LLM 參考了修正紀錄，log 出來供觀測
    if (r.correction_applied) {
      Logger.log('📎 參考修正紀錄: ' + r.correction_applied);
    }

    return {
      parsed: {
        sendReceiveCode: r.send_receive_code || 'FX',
        emlFilename: r.eml_filename || '',
        datesFound: Array.isArray(r.dates_found) ? r.dates_found : [],
        caseCategory: r.case_category || '未分類',
        caseStatus: r.case_status || null,
        filingCaseNumbers: Array.isArray(r.filing_case_numbers) ? r.filing_case_numbers : [],
        inferredRole: r.inferred_role || null,
        confidence: (r.confidence !== undefined && r.confidence !== null)
          ? parseFloat(r.confidence)
          : -1,    // -1 表示欄位遺失（區別於 LLM 明確回傳 0）
        reasoning: r.reasoning || '',
        correctionApplied: r.correction_applied || null,
        tokenInfo: tokenInfo,
      },
      tokenInfo,
      rawText: text,
    };
  } catch (e) {
    return { parsed: null, tokenInfo: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }, rawText: respText };
  }
}


// ===================== Sheet 讀寫 =====================

function _loadSenderMap() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS);
  if (!sheet) return new Map();
  const data = sheet.getDataRange().getValues();
  const map = new Map();
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim().toLowerCase();
    const role = String(data[i][1]).trim().toUpperCase();
    if (key && role) map.set(key, { role });
  }
  return map;
}

function _getProcessedIds() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return new Set();
  const data = sheet.getDataRange().getValues();
  const ids = new Set();
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]).trim();
    const aiName = String(data[i][8] || '');  // col 8: AI語義名
    // [失敗:N] → 排除（可重試，不算已處理）
    // [放棄] → 包含（已放棄，不重試）
    // 其他 → 包含（成功）
    if (id && !aiName.match(/^\[失敗:\d+\]/)) ids.add(id);
  }
  return ids;
}

function _getRecentCorrections(limit) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const corrections = [];
  for (let i = data.length - 1; i >= 1 && corrections.length < limit; i--) {
    const finalCode = String(data[i][13] || '').trim();       // col 13: 最終收發碼
    const correctedName = String(data[i][14] || '').trim();   // col 14: 修正後名稱
    const correctionReason = String(data[i][15] || '').trim(); // col 15: 修正原因
    const correctionSource = String(data[i][17] || '').trim(); // col 17: 修正來源
    // 跳過已整理為規則的修正紀錄（已透過 %%TEMPLATES%% 生效）
    if (correctionSource.includes('consolidated')) continue;
    if (finalCode || correctedName) {
      corrections.push({
        subject: data[i][2],
        aiCode: data[i][4],
        aiName: data[i][8],    // col 8: AI語義名
        finalCode: finalCode || data[i][4],
        finalName: correctedName || data[i][8],
        reason: correctionReason,
      });
    }
  }
  return corrections;
}

function _loadTemplates() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.RULES);
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1);
}

function _appendLogRecords(records) {
  if (!records || records.length === 0) return;
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);

  // 讀取現有資料，建立 messageId → [失敗行] 的索引（用於 upsert）
  const existingData = sheet.getDataRange().getValues();
  const failedRowMap = {};  // messageId → { rowIdx (1-based), retryCount }
  for (let i = 1; i < existingData.length; i++) {
    const id = String(existingData[i][0]).trim();
    const aiName = String(existingData[i][8] || '');
    const failMatch = aiName.match(/^\[失敗:(\d+)\]/);
    if (id && failMatch) {
      failedRowMap[id] = { rowIdx: i + 1, retryCount: parseInt(failMatch[1], 10) };
    }
  }

  const toAppend = [];
  for (let j = 0; j < records.length; j++) {
    var r = records[j];
    var row = [
      r.messageId, r.date, r.originalSubject, r.sender,
      r.aiCode, r.inferredRole,
      r.filingCaseNumbers || '',   // col 6: 歸檔案號（實際存檔用的）
      r.allCaseNumbers || '',      // col 7: 內文案號（全部偵測到的）
      r.aiSemanticName,
      r.confidence, r.caseCategory, r.sourceStatus,
      r.folderUrls || '',          // col 12: 資料夾連結
      '', '', '', '', '', 0,
      r.inputTokens || 0, r.outputTokens || 0,
      r.datesFound || '',          // col 21: dates_found (JSON string)
      r.errorNote || '',           // col 22: 錯誤備註
      '',                          // col 23: 修正案號
    ];

    var existing = failedRowMap[r.messageId];
    if (existing) {
      // Upsert: 同 messageId 有 [失敗:N] 行 → 更新該行，重試次數 +1
      row[18] = existing.retryCount + 1;  // col 18: 重試次數
      sheet.getRange(existing.rowIdx, 1, 1, row.length).setValues([row]);
      Logger.log('  📝 Upsert: messageId ' + r.messageId.substring(0, 12) + '... 更新第 ' + existing.rowIdx + ' 行（重試 ' + row[18] + '）');
    } else {
      toAppend.push(row);
    }
  }

  // 批次 append 新行
  if (toAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, toAppend[0].length).setValues(toAppend);
  }
}

function _setSetting(key, value) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function _addSender(emailOrDomain, role, note) {
  const ss = _getSpreadsheet();
  const senderSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS);
  const key = emailOrDomain.toLowerCase();
  if (!key || key === '@' || key.length < 3) {
    Logger.log('  ⚠️ Sender 跳過（不合法）: "' + emailOrDomain + '"');
    return;
  }
  const newRole = role.toUpperCase();

  // 檢查是否已存在（比對第 1 欄的 email/domain）
  const data = senderSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {  // 跳過 header
    if (String(data[i][0]).toLowerCase() === key) {
      // 已存在 → 更新角色（如果不同）和備註（如果新備註更完整）
      var changed = false;
      if (String(data[i][1]).toUpperCase() !== newRole) {
        senderSheet.getRange(i + 1, 2).setValue(newRole);
        changed = true;
      }
      var existingNote = String(data[i][2] || '');
      if (note && note !== existingNote && note.length > existingNote.length) {
        senderSheet.getRange(i + 1, 3).setValue(note);
        changed = true;
      }
      if (changed) {
        Logger.log('  📝 Sender 更新: ' + key + ' → ' + newRole + ' / ' + (note || existingNote));
      }
      return;
    }
  }

  // 不存在 → 新增
  senderSheet.appendRow([key, newRole, note || '']);
  Logger.log('  📝 Sender 新增: ' + key + ' = ' + newRole);
}


// ===================== Drive 管理 =====================

/**
 * Drive 資料夾快取 — 避免重複查詢同一資料夾
 * 在批次迴圈前建立一次，傳入每封信的 _saveEmailToDrive()
 */
function _createFolderCache(rootFolder) {
  const categoryFolders = {};   // category → Folder
  const caseFolders = {};       // "category/caseName" → Folder
  const fileScans = {};         // folderId → { name → { size, id } }

  return {
    root: rootFolder,

    getFolder: function(category, caseName) {
      // 快取 category folder
      if (!categoryFolders[category]) {
        categoryFolders[category] = _getOrCreateFolder(rootFolder, category);
      }
      const catFolder = categoryFolders[category];

      // 快取 case folder
      const key = category + '/' + caseName;
      if (!caseFolders[key]) {
        caseFolders[key] = _getOrCreateFolder(catFolder, caseName);
      }
      return { catFolder, caseFolder: caseFolders[key] };
    },

    scanFiles: function(folder) {
      const folderId = folder.getId();
      if (!fileScans[folderId]) {
        fileScans[folderId] = _scanFolderFiles(folder);
      }
      return fileScans[folderId];
    },

    addFile: function(folder, filename, size, id) {
      const folderId = folder.getId();
      if (fileScans[folderId]) {
        fileScans[folderId][filename] = { size: size, id: id || '' };
      }
    },
  };
}

function _saveEmailToDrive(preprocessed, llmResult, cache) {
  const result = { emlFileId: null, errors: [], timing: {}, folderUrls: [] };

  try {
    const t0 = Date.now();
    const rootFolder = cache ? cache.root : _getDriveRootFolder();

    const date = Utilities.formatDate(preprocessed.date, 'Asia/Taipei', 'yyyyMMdd');
    const code = llmResult.sendReceiveCode || preprocessed.sendReceiveCode;

    // 歸檔案號邏輯（由 _determineFinalResult 決定）：
    //   LLM 判定有歸檔案號 → 用第一個案號建資料夾（多個建多資料夾）
    //   主旨無案號但內文有 → 用客戶碼（如 BRIT）→ 未分類/BRIT
    //   完全沒案號 → '無案號' → 未分類/無案號
    const filingCases = llmResult.filingCaseNumbers || [];
    let folderCaseNum;  // 主資料夾名稱
    let caseLabel;      // EML 檔名中的案號部分
    if (filingCases.length > 0) {
      folderCaseNum = filingCases[0];
      caseLabel = folderCaseNum;
      if (filingCases.length > 1) {
        caseLabel += '等' + filingCases.length + '案';
      }
    } else if (preprocessed.clientCode) {
      // 主旨無案號但內文有 → 用客戶碼作資料夾
      folderCaseNum = preprocessed.clientCode;
      caseLabel = preprocessed.clientCode;
    } else {
      folderCaseNum = '無案號';
      caseLabel = '無案號';
    }

    // 垃圾信 → 強制存到 未分類/垃圾/
    if (llmResult.spamFolder) {
      folderCaseNum = '垃圾';
    }

    const semantic = llmResult.emlFilename || _fallbackSemanticName(preprocessed.subject);
    const baseName = date + '-' + code + '-' + caseLabel + '-' + semantic;

    // 分類：由 _determineFinalResult 已根據歸檔案號判定
    let category = llmResult.caseCategory || '未分類';
    if (llmResult.spamFolder) {
      category = '未分類';
    }
    let catFolder, targetFolder;
    if (cache) {
      const folders = cache.getFolder(category, folderCaseNum);
      catFolder = folders.catFolder;
      targetFolder = folders.caseFolder;
    } else {
      catFolder = _getOrCreateFolder(rootFolder, category);
      targetFolder = _getOrCreateFolder(catFolder, folderCaseNum);
    }
    result.folderUrls.push(targetFolder.getUrl());

    const tFolder = Date.now();
    Logger.log('    📂 資料夾定位: ' + ((tFolder - t0) / 1000).toFixed(2) + 's');

    // 掃描資料夾現有檔案（一次讀取，供 EML 和附件共用）
    const existingFiles = cache ? cache.scanFiles(targetFolder) : _scanFolderFiles(targetFolder);
    const tScan = Date.now();
    Logger.log('    🔍 掃描現有檔案: ' + ((tScan - tFolder) / 1000).toFixed(2) + 's (' + Object.keys(existingFiles).length + ' 個)');

    // 取一次 EML 原始內容，後面主案號和多案號都重用（省掉重複 API 呼叫）
    let rawContent = null;
    try {
      const tRawStart = Date.now();
      rawContent = GmailApp.getMessageById(preprocessed.messageId).getRawContent();
      const tRawEnd = Date.now();
      const rawSizeKB = (rawContent.length / 1024).toFixed(1);
      Logger.log('    📥 getRawContent: ' + ((tRawEnd - tRawStart) / 1000).toFixed(2) + 's (' + rawSizeKB + ' KB)');

      // 重跑保護：同名 + 同大小 → 跳過不重建
      const existingId = _findExistingFile(existingFiles, baseName, '.eml', rawContent.length);
      if (existingId) {
        result.emlFileId = existingId;
        Logger.log('    ⏭️ EML 已存在，跳過: ' + baseName + '.eml');
      } else {
        const filename = _getUniqueFileName(existingFiles, baseName, '.eml');
        const blob = Utilities.newBlob(rawContent, 'message/rfc822', filename);
        const tCreateStart = Date.now();
        const created = targetFolder.createFile(blob);
        const tCreateEnd = Date.now();
        Logger.log('    💾 createFile(EML): ' + ((tCreateEnd - tCreateStart) / 1000).toFixed(2) + 's');
        result.emlFileId = created.getId();
        existingFiles[filename] = { size: rawContent.length, id: created.getId() };
        if (cache) cache.addFile(targetFolder, filename, rawContent.length, created.getId());
      }
    } catch (emlErr) {
      result.errors.push('EML 下載失敗: ' + emlErr.message);
    }

    // 附件（TA/TC/TG 寄出的信不存附件，只存 EML）
    // 附件命名規則：{baseName}-附件1.pdf, {baseName}-附件2.xlsx, ...
    const skipAttachments = ['TA', 'TC', 'TG'].includes(code) || llmResult.spamFolder;
    if (!skipAttachments && preprocessed._attachments.length > 0) {
      Logger.log('    📎 附件數量: ' + preprocessed._attachments.length);
      let attIdx = 0;
      for (const att of preprocessed._attachments) {
        try {
          attIdx++;
          const origName = att.getName();
          // 取原始副檔名
          const dotPos = origName.lastIndexOf('.');
          const ext = dotPos > 0 ? origName.substring(dotPos) : '';
          const attBaseName = baseName + '-附件' + attIdx;

          const attBlob = att.copyBlob();
          const attSize = attBlob.getBytes().length;

          // 重跑保護：同名 + 同大小附件跳過
          const existingAtt = _findExistingFile(existingFiles, attBaseName, ext, attSize);
          if (existingAtt) {
            Logger.log('    ⏭️ 附件已存在，跳過: ' + attBaseName + ext);
          } else {
            // 附件下載重試（最多 3 次，間隔 2 秒）
            const attFilename = _getUniqueFileName(existingFiles, attBaseName, ext);
            attBlob.setName(attFilename);
            let attSaved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const tAttStart = Date.now();
                targetFolder.createFile(attBlob);
                const tAttEnd = Date.now();
                Logger.log('    💾 createFile(附件): ' + ((tAttEnd - tAttStart) / 1000).toFixed(2) + 's → ' + attFilename.substring(0, 60));
                existingFiles[attFilename] = { size: attSize, id: '' };
                if (cache) cache.addFile(targetFolder, attFilename, attSize, '');
                attSaved = true;
                break;
              } catch (attErr) {
                Logger.log('    ⚠️ 附件存檔嘗試 ' + attempt + '/3 失敗: ' + attErr.message);
                if (attempt < 3) Utilities.sleep(2000);
              }
            }
            if (!attSaved) {
              result.errors.push('附件「' + origName + '」3 次嘗試均失敗');
            }
          }
        }
        catch (e) { result.errors.push('附件「' + att.getName() + '」失敗: ' + e.message); }
      }
    }

    // 多案號：LLM 判定的歸檔案號 > 1 個才建多資料夾
    if (filingCases.length > 1 && rawContent) {
      Logger.log('    📋 多案號處理（LLM歸檔）: ' + (filingCases.length - 1) + ' 個副案號');
      for (let i = 1; i < filingCases.length; i++) {
        try {
          const secCaseNum = filingCases[i];
          const tSecStart = Date.now();
          let secFolder;
          if (cache) {
            secFolder = cache.getFolder(category, secCaseNum).caseFolder;
          } else {
            secFolder = _getOrCreateFolder(catFolder, secCaseNum);
          }
          result.folderUrls.push(secFolder.getUrl());

          let secCaseLabel = secCaseNum;
          secCaseLabel += '等' + filingCases.length + '案';
          const secBaseName = date + '-' + code + '-' + secCaseLabel + '-' + semantic;

          const secExisting = cache ? cache.scanFiles(secFolder) : _scanFolderFiles(secFolder);
          const secExistingId = _findExistingFile(secExisting, secBaseName, '.eml', rawContent.length);

          if (secExistingId) {
            Logger.log('    ⏭️ 多案號 EML 已存在，跳過: ' + secCaseNum);
          } else {
            const secFilename = _getUniqueFileName(secExisting, secBaseName, '.eml');
            const secBlob = Utilities.newBlob(rawContent, 'message/rfc822', secFilename);
            secFolder.createFile(secBlob);
            const tSecEnd = Date.now();
            Logger.log('    💾 多案號 EML(' + secCaseNum + '): ' + ((tSecEnd - tSecStart) / 1000).toFixed(2) + 's');
          }
        } catch (e) { result.errors.push('多案號 EML(' + filingCases[i] + ') 失敗'); }
      }
    }

    const tTotal = Date.now();
    Logger.log('    ⏱️ Drive 總計: ' + ((tTotal - t0) / 1000).toFixed(2) + 's');
  } catch (e) {
    result.errors.push('儲存失敗: ' + e.message);
  }

  return result;
}

/**
 * 掃描資料夾內的檔案，回傳 { name → { size, id } } 對照表
 * 供去重和跳過已存在檔案使用
 */
function _scanFolderFiles(targetFolder) {
  const map = {};
  const files = targetFolder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    map[f.getName()] = { size: f.getSize(), id: f.getId() };
  }
  return map;
}

/**
 * 同檔名去重（V1 教訓）
 * 如果已有同名檔案 → 加 (1), (2), ...
 */
function _getUniqueFileName(existingFiles, baseName, ext) {
  let candidate = baseName + ext;
  if (!existingFiles[candidate]) return candidate;

  for (let n = 1; n <= 999; n++) {
    candidate = baseName + '(' + n + ')' + ext;
    if (!existingFiles[candidate]) return candidate;
  }

  return baseName + '(' + new Date().getTime() + ')' + ext;
}

/**
 * 檢查資料夾裡是否已有同名 + 同大小的檔案（代表重跑時的重複檔）
 * 有 → 回傳該檔案的 ID（跳過不重建）
 * 沒有 → 回傳 null
 */
function _findExistingFile(existingFiles, baseName, ext, blobSize) {
  const candidate = baseName + ext;
  const existing = existingFiles[candidate];
  if (existing && Math.abs(existing.size - blobSize) < 100) {
    // 同名且大小差距 < 100 bytes（EML 可能有微小時間差）→ 視為同一檔案
    return existing.id;
  }
  return null;
}

// ===================== 核心處理 =====================

/**
 * 在同 thread 中搜尋已修正的案號（往後 cascade 用）
 * 只看時間早於或等於當前信件的修正，取最新一筆
 * @param {GmailMessage} message - 當前信件
 * @param {Array[]} logData - LOG sheet 全部資料（含 header）
 * @return {{ correctedCaseNumbers: string[], sourceRow: number } | null}
 */
function _lookupThreadCorrectedCase(message, logData) {
  try {
    const threadMessages = message.getThread().getMessages();
    const currentDate = message.getDate();

    // 收集同 thread 中時間 <= 當前信件的 messageId
    const eligibleIds = new Set();
    for (const msg of threadMessages) {
      if (msg.getDate() <= currentDate) {
        eligibleIds.add(msg.getId());
      }
    }

    // 在 logData 中搜尋這些 messageId，找 col 23（修正案號）非空的
    let bestRow = -1;
    let bestDate = null;
    let bestCorrected = null;

    for (let i = 1; i < logData.length; i++) {
      const rowMsgId = String(logData[i][0]).trim();
      if (!eligibleIds.has(rowMsgId)) continue;

      const correctedVal = String(logData[i][23] || '').trim();
      if (!correctedVal) continue;

      // 取最新的修正（用 Sheet 裡的日期排序）
      const rowDate = logData[i][1] instanceof Date ? logData[i][1] : new Date(String(logData[i][1]));
      if (!bestDate || rowDate >= bestDate) {
        bestDate = rowDate;
        bestRow = i;
        bestCorrected = correctedVal;
      }
    }

    if (bestCorrected) {
      const correctedCaseNumbers = bestCorrected.split(/,\s*/).filter(cn => cn.length > 0);
      if (correctedCaseNumbers.length > 0) {
        return { correctedCaseNumbers: correctedCaseNumbers, sourceRow: bestRow };
      }
    }
  } catch (e) {
    Logger.log('⚠️ _lookupThreadCorrectedCase 失敗: ' + e.message);
  }
  return null;
}

function _determineFinalResult(preprocessed, llmResult, threadCorrection) {
  const hasSubjectCase = preprocessed.subjectCaseNumbers && preprocessed.subjectCaseNumbers.length > 0;

  // 歸檔案號邏輯：
  //   1. 主旨有案號 → 優先用 LLM 的 filingCaseNumbers，fallback 用主旨案號
  //   2. 主旨無案號 + threadCorrection 有值 → 用修正案號歸檔
  //   3. 主旨無案號 + 無 threadCorrection → 用客戶碼或無案號
  let filingCaseNumbers = [];
  if (hasSubjectCase) {
    const llmFiling = llmResult.filingCaseNumbers || [];
    if (preprocessed.subjectCaseNumbers.length === 1 && llmFiling.length > 1) {
      // 主旨單案號但 LLM 多案號 → 過濾只保留信件本身（subject+body）提到的案號
      const emailCaseSet = new Set(preprocessed.caseNumbers.map(cn => cn.toUpperCase()));
      const filtered = llmFiling.filter(cn => emailCaseSet.has(cn.toUpperCase()));
      filingCaseNumbers = filtered.length > 0 ? filtered : preprocessed.subjectCaseNumbers;
      if (filtered.length !== llmFiling.length) {
        Logger.log('⚠️ 主旨單案號，過濾 thread_context 案號: ' +
          llmFiling.join(', ') + ' → ' + filingCaseNumbers.join(', '));
      }
    } else {
      filingCaseNumbers = llmFiling.length > 0 ? llmFiling : preprocessed.subjectCaseNumbers;
    }
  } else if (threadCorrection && threadCorrection.correctedCaseNumbers && threadCorrection.correctedCaseNumbers.length > 0) {
    // 主旨無案號，但同 thread 有修正案號 → 套用修正
    filingCaseNumbers = threadCorrection.correctedCaseNumbers;
    Logger.log('📎 Thread 修正案號套用: ' + filingCaseNumbers.join(', '));
  }

  // 分類邏輯：用歸檔案號的第10碼判定（不用主旨案號，因為 LLM 可能修正）
  let finalCategory = '未分類';
  if (filingCaseNumbers.length > 0) {
    const PATENT_TYPES = 'PMDAC';
    const TRADEMARK_TYPES = 'TBW';
    const typeChars = filingCaseNumbers.map(cn => cn.length >= 10 ? cn.charAt(9) : '');
    const hasPatent = typeChars.some(c => PATENT_TYPES.includes(c));
    const hasTrademark = typeChars.some(c => TRADEMARK_TYPES.includes(c));
    if (hasPatent && !hasTrademark) finalCategory = '專利';
    else if (hasTrademark && !hasPatent) finalCategory = '商標';
  }

  // 多案號狀態：看歸檔案號數量
  let finalCaseStatus = preprocessed.caseStatus;
  if (filingCaseNumbers.length > 1) {
    finalCaseStatus = '多案號';
  }

  const result = {
    sendReceiveCode: llmResult.sendReceiveCode || preprocessed.sendReceiveCode,
    emlFilename: llmResult.emlFilename || '',
    caseCategory: finalCategory,
    caseStatus: finalCaseStatus,
    filingCaseNumbers: filingCaseNumbers,
    problemLabel: null,
    sourceStatus: 'na',
    skipDownload: false,
    spamFolder: false,
  };

  // 路徑 A：已知 Spam sender（role=S）→ 全自動垃圾，跳過 EML
  if (preprocessed.role === 'S') {
    result.sendReceiveCode = '垃圾';
    result.skipDownload = true;
    result.caseCategory = '未分類';
    result.caseStatus = null;
    result.sourceStatus = 'na';
    return result;
  }

  if (preprocessed.role === 'X') {
    // 路徑 B：未知 sender + 廣告 + 無案號 → 垃圾 + 自動辨識
    const isAdDetected = (llmResult.emlFilename || '').startsWith('廣告-');
    if (isAdDetected && filingCaseNumbers.length === 0) {
      result.sendReceiveCode = '垃圾';
      result.problemLabel = '自動辨識來源';
      result.sourceStatus = 'pending';
      result.spamFolder = true;
      result.caseCategory = '未分類';
      result.caseStatus = null;
      return result;
    }

    if (llmResult.inferredRole && llmResult.confidence >= CONFIG.CONFIDENCE_INFER) {
      result.problemLabel = '自動辨識來源';
      result.sourceStatus = 'pending';
    } else if (llmResult.inferredRole && llmResult.confidence < CONFIG.CONFIDENCE_INFER) {
      result.sendReceiveCode = preprocessed.sendReceiveCode;
      result.problemLabel = '未知來源';
    } else {
      result.problemLabel = llmResult.confidence < 0.3 ? '已跳過' : '未知來源';
    }
  }

  if (!result.problemLabel) {
    if (llmResult.confidence < CONFIG.CONFIDENCE_AUTO) {
      result.problemLabel = '待確認';
    }
  }

  return result;
}

function _applyLabels(message, result) {
  const thread = message.getThread();
  const tryAdd = (name) => { const l = _getLabel(name); if (l) thread.addLabel(l); };

  if (result.sendReceiveCode) tryAdd('收發碼/' + result.sendReceiveCode);
  if (result.caseCategory && result.caseCategory !== '未分類') tryAdd('案件類型/' + result.caseCategory);
  if (result.caseStatus) tryAdd('狀態/' + result.caseStatus);
  if (result.problemLabel) tryAdd('狀態/' + result.problemLabel);
  if (result.attachmentError) tryAdd('錯誤/附件下載錯誤');
}

function _processEmailBatch(query, limit, shouldDownload) {
  const stats = { processed: 0, auto: 0, needConfirm: 0, autoIdentify: 0, unknown: 0, errors: 0, totalInputTokens: 0, totalOutputTokens: 0 };

  // 執行狀態追蹤：開始
  var _execProps = PropertiesService.getScriptProperties();
  var _execStartTime = new Date().toISOString();
  _execProps.setProperty('_execution_status', JSON.stringify({
    action: 'trialRun',
    status: 'running',
    startTime: _execStartTime,
    progress: '0/' + limit,
    lastUpdate: _execStartTime
  }));

  const senderMap = _loadSenderMap();
  const processedIds = _getProcessedIds();
  const corrections = _getRecentCorrections(20);
  const templates = _loadTemplates();

  _ensureLabels();

  // 搜尋策略：不用 -label 排除（因為同 thread 新回覆會被連帶排除）
  // 改用 Message ID 在 Sheet 裡判斷是否已處理（V1 教訓）
  const baseQuery = query || '';
  const searchQuery = baseQuery ? baseQuery + ' -is:draft' : '-is:draft';
  const messages = [];
  let searchStart = 0;
  const searchBatch = 100;

  while (messages.length < limit) {
    const threads = GmailApp.search(searchQuery, searchStart, searchBatch);
    if (threads.length === 0) break;

    for (const thread of threads) {
      for (const msg of thread.getMessages()) {
        if (messages.length >= limit) break;
        if (!processedIds.has(msg.getId())) messages.push(msg);
      }
      if (messages.length >= limit) break;
    }

    searchStart += searchBatch;
    // 安全上限：最多搜尋 500 個 threads
    if (searchStart >= 500) break;
  }

  // 按信件日期排序（舊→新），確保處理順序一致
  messages.sort(function(a, b) { return a.getDate().getTime() - b.getDate().getTime(); });

  Logger.log('取得 ' + messages.length + ' 封待處理信件');

  // 建立 Drive 資料夾快取（整個批次共用）
  const startTime = Date.now();
  let folderCache = null;
  if (shouldDownload) {
    const rootFolder = _getDriveRootFolder();
    folderCache = _createFolderCache(rootFolder);
  }

  // 載入 LOG sheet 資料（供 thread 修正案號查詢用，整個批次共用）
  const logSheet = _getSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
  const logData = logSheet ? logSheet.getDataRange().getValues() : [];

  // 分批並行處理：每批 PARALLEL_BATCH 封同時呼叫 Gemini
  const PARALLEL_BATCH = 10;

  for (let batchStart = 0; batchStart < messages.length; batchStart += PARALLEL_BATCH) {
    // 逾時安全檢查：超過閾值就停止，避免 Apps Script 6 分鐘限制
    const elapsed = Date.now() - startTime;
    if (elapsed >= CONFIG.TIMEOUT_SAFETY_MS) {
      Logger.log('⏰ 已耗時 ' + (elapsed / 1000).toFixed(0) + 's，超過安全閾值，停止處理。已處理 ' + stats.processed + ' 封');
      break;
    }
    const batchMessages = messages.slice(batchStart, batchStart + PARALLEL_BATCH);
    Logger.log('並行處理第 ' + (batchStart + 1) + '-' + (batchStart + batchMessages.length) + ' 封...');

    // Step 1: 預處理（規則引擎，不花 API）
    const preprocessedList = [];
    for (let i = 0; i < batchMessages.length; i++) {
      try {
        preprocessedList.push(_preprocessMessage(batchMessages[i], senderMap));
      } catch (e) {
        stats.errors++;
        const msgId = batchMessages[i].getId();
        Logger.log('❌ #' + (batchStart + i + 1) + ' 預處理失敗 (' + msgId + '): ' + e.message);
        _appendLogRecords([{
          messageId: msgId, aiCode: '', date: Utilities.formatDate(batchMessages[i].getDate(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
          originalSubject: batchMessages[i].getSubject() || '', sender: '',
          inferredRole: '', filingCaseNumbers: '', allCaseNumbers: '',
          aiSemanticName: '[失敗:1] ' + e.message.substring(0, 50),
          confidence: 0, caseCategory: '', sourceStatus: 'na',
          inputTokens: 0, outputTokens: 0,
        }]);
      }
    }

    if (preprocessedList.length === 0) continue;

    // Step 2: 並行呼叫 Gemini（一次送出所有請求）
    const apiStart = Date.now();
    const llmResults = _callGeminiBatch(preprocessedList, corrections, templates);
    const apiMs = Date.now() - apiStart;
    Logger.log('⚡ Gemini API 並行呼叫完成：' + preprocessedList.length + ' 封，耗時 ' + (apiMs / 1000).toFixed(1) + ' 秒');

    // Step 2.5: 同 thread 事項碼對齊（確保 OA/ROA 序號一致）
    _alignThreadEventCodes(preprocessedList, llmResults);

    // Step 3: 逐封處理結果（掛標籤、存 Drive、寫 log）— 每封獨立，一封失敗不影響其他封
    let driveMs = 0;
    for (let i = 0; i < preprocessedList.length; i++) {
      const preprocessed = preprocessedList[i];
      const llmResult = llmResults[i];
      const messageId = preprocessed.messageId;
      const emailIdx = batchStart + i + 1;

      try {
        // API 失敗（confidence=0 且無語義名）→ 掛失敗標籤 + 寫 Sheet + 跳過 Drive/標籤
        if (!llmResult.emlFilename && llmResult.confidence === 0) {
          var errLabel = _getLabel('錯誤/處理失敗');
          if (errLabel) preprocessed._message.getThread().addLabel(errLabel);
          _appendLogRecords([{
            messageId: messageId, aiCode: preprocessed.sendReceiveCode || '',
            date: Utilities.formatDate(preprocessed.date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
            originalSubject: preprocessed.originalSubject,
            sender: preprocessed.sender,
            inferredRole: '', filingCaseNumbers: '', allCaseNumbers: preprocessed.caseNumbers.join(', '),
            aiSemanticName: '[失敗:1] LLM 未產生語義名', confidence: 0,
            caseCategory: '', sourceStatus: 'na',
            inputTokens: llmResult.tokenInfo ? llmResult.tokenInfo.inputTokens : 0,
            outputTokens: llmResult.tokenInfo ? llmResult.tokenInfo.outputTokens : 0,
          }]);
          stats.processed++;
          stats.errors++;
          Logger.log('❌ #' + emailIdx + ' API 失敗，標記 [失敗:1]');
          continue;
        }

        // 主旨無案號時查詢同 thread 是否有修正案號
        const threadCorrection = (!preprocessed.subjectCaseNumbers || preprocessed.subjectCaseNumbers.length === 0)
          ? _lookupThreadCorrectedCase(preprocessed._message, logData)
          : null;
        const finalResult = _determineFinalResult(preprocessed, llmResult, threadCorrection);

        // Log 每封信的分類結果
        const confPct = Math.round((llmResult.confidence || 0) * 100);
        const filingInfo = (finalResult.filingCaseNumbers || []).length > 0
          ? ' 歸檔:' + finalResult.filingCaseNumbers.length + '案'
          : '';
        Logger.log('📧 #' + emailIdx + ' [' + (finalResult.sendReceiveCode || '??') + '] '
          + (preprocessed.sender || '').substring(0, 30) + ' → '
          + (llmResult.emlFilename || '(無檔名)').substring(0, 60)
          + ' (信心: ' + confPct + '%' + filingInfo + ')');

        _applyLabels(preprocessed._message, finalResult);

        // 若之前失敗過（排程重跑成功），移除錯誤標籤
        var errLabel = _getLabel('錯誤/處理失敗');
        if (errLabel) preprocessed._message.getThread().removeLabel(errLabel);

        let folderUrlArr = [];
        let attachmentErrorNote = '';
        if (shouldDownload && !finalResult.skipDownload) {
          const driveStart = Date.now();
          const driveResult = _saveEmailToDrive(preprocessed, finalResult, folderCache);
          driveMs += Date.now() - driveStart;
          if (driveResult.errors.length > 0) {
            Logger.log('  ⚠️ #' + emailIdx + ' 下載問題: ' + driveResult.errors.join('; '));
            // 附件下載錯誤 → 掛紅色標籤 + 記錄備註
            finalResult.attachmentError = true;
            attachmentErrorNote = driveResult.errors.join('; ');
            _applyLabels(preprocessed._message, { attachmentError: true });
          }
          folderUrlArr = driveResult.folderUrls || [];
        }

        // 每封處理完立即寫入 Sheet（失敗不影響其他封）
        // 多案號：拆成多行，每行一個案號 + 一個資料夾連結（確保超連結可點擊）
        const filingArr = finalResult.filingCaseNumbers || [];
        const aiName = llmResult.emlFilename
          ? llmResult.emlFilename
          : '[失敗:1] LLM 未產生語義名';
        const baseRecord = {
          messageId, aiCode: finalResult.sendReceiveCode,
          date: Utilities.formatDate(preprocessed.date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
          originalSubject: preprocessed.originalSubject,
          sender: preprocessed.sender,
          inferredRole: llmResult.inferredRole || '',
          allCaseNumbers: preprocessed.caseNumbers.join(', '),
          aiSemanticName: aiName,
          confidence: llmResult.confidence,
          caseCategory: finalResult.caseCategory,
          sourceStatus: finalResult.sourceStatus,
          inputTokens: llmResult.tokenInfo ? llmResult.tokenInfo.inputTokens : 0,
          outputTokens: llmResult.tokenInfo ? llmResult.tokenInfo.outputTokens : 0,
          datesFound: llmResult.datesFound && llmResult.datesFound.length > 0 ? JSON.stringify(llmResult.datesFound) : '',
          errorNote: attachmentErrorNote,
        };

        if (filingArr.length <= 1) {
          // 單案號或無案號：寫 1 行
          _appendLogRecords([Object.assign({}, baseRecord, {
            filingCaseNumbers: filingArr.join(', '),
            folderUrls: folderUrlArr[0] || '',
          })]);
        } else {
          // 多案號：每個案號一行，各自對應資料夾連結
          // 案號帶「等N案」後綴，與 Drive 檔名一致（供 rename 比對用）
          const multiSuffix = '等' + filingArr.length + '案';
          const records = filingArr.map(function(caseNum, idx) {
            return Object.assign({}, baseRecord, {
              filingCaseNumbers: caseNum + multiSuffix,
              folderUrls: folderUrlArr[idx] || '',
            });
          });
          _appendLogRecords(records);
        }

        stats.processed++;
        stats.totalInputTokens += (llmResult.tokenInfo ? llmResult.tokenInfo.inputTokens : 0);
        stats.totalOutputTokens += (llmResult.tokenInfo ? llmResult.tokenInfo.outputTokens : 0);
        if (finalResult.problemLabel === '自動辨識來源') stats.autoIdentify++;
        else if (finalResult.problemLabel === '未知來源') stats.unknown++;
        else if (finalResult.problemLabel === '待確認') stats.needConfirm++;
        else stats.auto++;

      } catch (e) {
        stats.errors++;
        Logger.log('❌ #' + emailIdx + ' 處理失敗 (' + messageId + '): ' + e.message);
        // 失敗也立即寫入 Sheet，不影響其他封
        _appendLogRecords([{
          messageId, aiCode: '', date: Utilities.formatDate(preprocessed.date, 'Asia/Taipei', 'yyyy-MM-dd HH:mm'),
          originalSubject: preprocessed.originalSubject || '', sender: preprocessed.sender || '',
          inferredRole: '', filingCaseNumbers: '', allCaseNumbers: '',
          aiSemanticName: '[失敗:1] ' + e.message.substring(0, 50),
          confidence: 0, caseCategory: '', sourceStatus: 'na',
          inputTokens: 0, outputTokens: 0,
        }]);
      }
    }

    Logger.log('💾 Drive 存檔總耗時：' + (driveMs / 1000).toFixed(1) + ' 秒（' + preprocessedList.length + ' 封）');

    // 執行狀態追蹤：更新進度
    _execProps.setProperty('_execution_status', JSON.stringify({
      action: 'trialRun',
      status: 'running',
      startTime: _execStartTime,
      progress: stats.processed + '/' + messages.length,
      lastUpdate: new Date().toISOString()
    }));
  }

  _setSetting('lastProcessedTime', new Date().toISOString());
  _setSetting('累計處理數量', (_getProcessedIds().size));

  // 執行狀態追蹤：完成
  _execProps.setProperty('_execution_status', JSON.stringify({
    action: 'trialRun',
    status: 'completed',
    startTime: _execStartTime,
    endTime: new Date().toISOString(),
    progress: stats.processed + '/' + messages.length,
    stats: stats
  }));

  // 加入 summary icon 讓前端/plugin 可判斷整體狀態
  stats.summaryIcon = stats.errors > 0 ? '⚠️' : '✅';

  _testSaveLog(Logger.getLog().split('\n').filter(Boolean));
  return stats;
}


// ===================== 進入點：試跑 =====================

/** 試跑 50 封（完整 Phase 1：分類＋掛標籤＋下載 EML） */
function trialRun() {
  const ui = SpreadsheetApp.getUi();
  const q = ui.prompt('🧪 試跑 50 封',
    '請輸入 Gmail 搜尋條件：\n\n' +
    '範例：\n' +
    '  newer_than:7d          （最近 7 天）\n' +
    '  from:bskb.com          （來自 BSKB）\n' +
    '  subject:filing report  （標題含 filing report）\n\n' +
    '留空 = 所有未處理信件',
    ui.ButtonSet.OK_CANCEL);
  if (q.getSelectedButton() !== ui.Button.OK) return;

  try {
    const result = _processEmailBatch(q.getResponseText().trim(), 50, true);
    var icon = result.errors > 0 ? '⚠️' : '✅';
    ui.alert(icon + ' 試跑完成',
      '處理 ' + result.processed + ' 封（含下載 EML＋掛標籤）\n\n' +
      '✅ 自動處理: ' + result.auto + '\n' +
      '⚠️ 待確認: ' + result.needConfirm + '\n' +
      '⚠️ 辨識來源: ' + result.autoIdentify + '\n' +
      '🔴 未知來源: ' + result.unknown + '\n' +
      '🔴 失敗: ' + result.errors + '\n\n' +
      '→ 到「處理紀錄」Sheet 查看結果\n' +
      '→ 到 Gmail 搜尋 label:AI/狀態/自動辨識來源 確認 sender',
      ui.ButtonSet.OK);
  } catch (e) { ui.alert('❌ 失敗', e.message, ui.ButtonSet.OK); }
}

/** 試跑 10 封（快速驗證） */
function trialRunSmall() {
  const ui = SpreadsheetApp.getUi();
  const q = ui.prompt('🧪 快速試跑 10 封', '請輸入 Gmail 搜尋條件（留空 = 所有未處理）：', ui.ButtonSet.OK_CANCEL);
  if (q.getSelectedButton() !== ui.Button.OK) return;

  try {
    const result = _processEmailBatch(q.getResponseText().trim(), 10, true);
    var icon = result.errors > 0 ? '⚠️' : '✅';
    ui.alert(icon + ' 完成', '處理 ' + result.processed + ' 封\n' +
      '✅ 自動: ' + result.auto + ' | ⚠️ 待確認: ' + result.needConfirm +
      ' | ⚠️ 辨識來源: ' + result.autoIdentify +
      ' | 🔴 未知: ' + result.unknown + ' | 🔴 失敗: ' + result.errors, ui.ButtonSet.OK);
  } catch (e) { ui.alert('❌ 失敗', e.message, ui.ButtonSet.OK); }
}

/**
 * 從編輯器直接試跑（不需 UI）
 * 適合第一次測試時使用
 */
function trialRunFromEditor() {
  Logger.log('=== 從編輯器試跑 50 封 ===');
  try {
    const result = _processEmailBatch('newer_than:7d', 50, true);
    Logger.log('✅ 試跑完成！');
    Logger.log('處理: ' + result.processed + ' 封');
    Logger.log('自動: ' + result.auto + ' | 待確認: ' + result.needConfirm);
    Logger.log('辨識來源: ' + result.autoIdentify + ' | 未知: ' + result.unknown);
    Logger.log('失敗: ' + result.errors);
    Logger.log('→ 到 Google Sheet 的「處理紀錄」Tab 查看結果');
  } catch (e) {
    Logger.log('❌ 失敗: ' + e.message);
  }
}

/** 測試單封信：搜尋一封，顯示完整分類結果（不寫入 Sheet、不掛標籤、不下載） */
function testSingleEmail() {
  const ui = SpreadsheetApp.getUi();
  const q = ui.prompt('🔬 測試單封信',
    '請輸入搜尋條件（找到的第一封會被分析）：\n\n' +
    '範例：subject:"Filing Report" from:bskb.com',
    ui.ButtonSet.OK_CANCEL);
  if (q.getSelectedButton() !== ui.Button.OK) return;

  try {
    const threads = GmailApp.search(q.getResponseText().trim(), 0, 1);
    if (threads.length === 0) { ui.alert('找不到符合的信件'); return; }

    const message = threads[0].getMessages()[0];
    const senderMap = _loadSenderMap();
    const preprocessed = _preprocessMessage(message, senderMap);

    const corrections = _getRecentCorrections(20);
    const templates = _loadTemplates();
    const llmResult = _callGemini(preprocessed, corrections, templates);
    // 查詢同 thread 修正案號
    const uiLogSheet = _getSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
    const uiLogData = uiLogSheet ? uiLogSheet.getDataRange().getValues() : [];
    const uiThreadCorrection = (!preprocessed.subjectCaseNumbers || preprocessed.subjectCaseNumbers.length === 0)
      ? _lookupThreadCorrectedCase(message, uiLogData)
      : null;
    const finalResult = _determineFinalResult(preprocessed, llmResult, uiThreadCorrection);

    ui.alert('🔬 單封信分析結果',
      '標題: ' + preprocessed.originalSubject + '\n' +
      'Sender: ' + preprocessed.sender + '\n' +
      '方向: ' + preprocessed.direction + ' | Role: ' + preprocessed.role + '\n' +
      '規則碼: ' + preprocessed.sendReceiveCode + '\n\n' +
      '── LLM 結果 ──\n' +
      '收發碼: ' + llmResult.sendReceiveCode + '\n' +
      '語義名: ' + llmResult.emlFilename + '\n' +
      '案件類別: ' + llmResult.caseCategory + '\n' +
      '推斷角色: ' + (llmResult.inferredRole || '無') + '\n' +
      '信心: ' + llmResult.confidence + '\n' +
      '理由: ' + llmResult.reasoning + '\n\n' +
      '── 最終結果 ──\n' +
      '最終碼: ' + finalResult.sendReceiveCode + '\n' +
      '問題標籤: ' + (finalResult.problemLabel || '無') + '\n' +
      '案號: ' + preprocessed.caseNumbers.join(', ') + '\n' +
      '附件: ' + preprocessed.attachmentNames.join(', '),
      ui.ButtonSet.OK);
  } catch (e) { ui.alert('❌ 失敗', e.message, ui.ButtonSet.OK); }
}


// ===================== 正式處理 =====================

function processEmails() {
  const startTime = Date.now();
  Logger.log('=== 正式處理 ===');

  try {
    const result = _processEmailBatch('', CONFIG.BATCH_SIZE, true);
    Logger.log('完成: ' + JSON.stringify(result));

    if (result.processed > 0) {
      try {
        _updateBenefitsStats(result.processed, result.totalInputTokens || 0, result.totalOutputTokens || 0);
      } catch (e) {
        Logger.log('⚠️ 效益統計更新失敗: ' + e.message);
      }
    }

    if (Date.now() - startTime < CONFIG.TIMEOUT_SAFETY_MS) {
      runFeedback();
    }

    if (result.processed > 0) {
      // 有處理到信 → 可能還有更多 → 1 分鐘後繼續
      _scheduleOnce('_continueProcessing', 1 * 60 * 1000);
    } else {
      // 沒有新信了 → 檢查有沒有 [失敗:N] 需要重試
      _scheduleRetryIfNeeded();
    }
  } catch (e) {
    Logger.log('正式處理失敗: ' + e.message);
  }
}

/** 清除同名 trigger 後建立一次性 trigger */
function _scheduleOnce(funcName, delayMs) {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === funcName; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger(funcName).timeBased().after(delayMs).create();
  Logger.log('⏩ 已排定 ' + funcName + '：' + (delayMs / 1000) + ' 秒後');
}

/** 清除指定函式的 trigger */
function _cleanupTrigger(funcName) {
  ScriptApp.getProjectTriggers()
    .filter(function(t) { return t.getHandlerFunction() === funcName; })
    .forEach(function(t) { ScriptApp.deleteTrigger(t); });
}

/** 續行：清除自己的 trigger → 再跑一輪 processEmails */
function _continueProcessing() {
  _cleanupTrigger('_continueProcessing');
  processEmails();
}

/** 檢查 Sheet 中是否有 [失敗:N] (N<3) 記錄，有的話 3 分鐘後重試 */
function _scheduleRetryIfNeeded() {
  var sheet = _getSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var hasFailures = false;
  for (var i = 1; i < data.length; i++) {
    var aiName = String(data[i][8] || '');
    var match = aiName.match(/^\[失敗:(\d+)\]/);
    if (match && parseInt(match[1], 10) < 3) { hasFailures = true; break; }
  }
  if (hasFailures) {
    _scheduleOnce('_retryFailedEmails', 3 * 60 * 1000);
  }
}

/**
 * 針對性重試：掃 Sheet 找 [失敗:N] (N<3) → 逐封重試 → 更新同一列（不 append）
 * N+1 >= 3 → 寫 [放棄] + 掛紅色 處理失敗 標籤
 */
function _retryFailedEmails() {
  _cleanupTrigger('_retryFailedEmails');
  Logger.log('=== 自動重試失敗信件 ===');

  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const senderMap = _loadSenderMap();
  const corrections = _getRecentCorrections(20);
  const templates = _loadTemplates();
  _ensureLabels();

  let retried = 0, succeeded = 0, abandoned = 0;
  const rootFolder = _getDriveRootFolder();
  const folderCache = _createFolderCache(rootFolder);

  for (let i = 1; i < data.length; i++) {
    const aiName = String(data[i][8] || '');
    const match = aiName.match(/^\[失敗:(\d+)\]/);
    if (!match) continue;

    const retryCount = parseInt(match[1], 10);
    if (retryCount >= 3) continue;  // 已達上限，跳過

    const messageId = String(data[i][0]).trim();
    if (!messageId) continue;

    retried++;
    Logger.log('🔄 重試 #' + i + ' (第 ' + (retryCount + 1) + ' 次): ' + messageId);

    try {
      const message = GmailApp.getMessageById(messageId);
      if (!message) {
        Logger.log('  ⚠️ 找不到信件，跳過');
        continue;
      }

      const preprocessed = _preprocessMessage(message, senderMap);
      const llmResult = _callGemini(preprocessed, corrections, templates);
      // 查詢同 thread 修正案號
      const retryThreadCorrection = (!preprocessed.subjectCaseNumbers || preprocessed.subjectCaseNumbers.length === 0)
        ? _lookupThreadCorrectedCase(message, data)
        : null;
      const finalResult = _determineFinalResult(preprocessed, llmResult, retryThreadCorrection);

      _applyLabels(message, finalResult);

      // Drive 存檔
      const driveResult = _saveEmailToDrive(preprocessed, finalResult, folderCache);
      let attachmentErrorNote = '';
      if (driveResult.errors.length > 0) {
        finalResult.attachmentError = true;
        attachmentErrorNote = driveResult.errors.join('; ');
        _applyLabels(message, { attachmentError: true });
      }

      const folderUrlArr = driveResult.folderUrls || [];
      const filingArr = finalResult.filingCaseNumbers || [];
      const newAiName = llmResult.emlFilename || '[失敗:' + (retryCount + 1) + '] LLM 未產生語義名';

      // 成功 → 更新同一列為正常資料
      const rowIdx = i + 1;  // 1-based
      sheet.getRange(rowIdx, 5).setValue(finalResult.sendReceiveCode);  // col 4 (0-based) = col 5 (1-based)
      sheet.getRange(rowIdx, 6).setValue(llmResult.inferredRole || '');
      sheet.getRange(rowIdx, 7).setValue(filingArr.join(', '));
      sheet.getRange(rowIdx, 8).setValue(preprocessed.caseNumbers.join(', '));
      sheet.getRange(rowIdx, 9).setValue(llmResult.emlFilename || newAiName);
      sheet.getRange(rowIdx, 10).setValue(llmResult.confidence);
      sheet.getRange(rowIdx, 11).setValue(finalResult.caseCategory);
      sheet.getRange(rowIdx, 12).setValue(finalResult.sourceStatus);
      sheet.getRange(rowIdx, 13).setValue(folderUrlArr[0] || '');
      sheet.getRange(rowIdx, 19).setValue(retryCount + 1);  // col 19: 重試次數（1-based）
      sheet.getRange(rowIdx, 22).setValue(attachmentErrorNote);

      if (llmResult.emlFilename) {
        // 重試成功 → 移除錯誤標籤
        const errLabel = _getLabel('錯誤/處理失敗');
        if (errLabel) message.getThread().removeLabel(errLabel);
        succeeded++;
        Logger.log('  ✅ 重試成功');
      }

    } catch (e) {
      Logger.log('  ❌ 重試失敗: ' + e.message);
      const nextCount = retryCount + 1;
      const rowIdx = i + 1;

      if (nextCount >= 3) {
        // 第 3 次失敗 → 放棄 + 掛紅標籤
        sheet.getRange(rowIdx, 9).setValue('[放棄] ' + e.message.substring(0, 50));
        abandoned++;
        try {
          const message = GmailApp.getMessageById(messageId);
          if (message) {
            const errLabel = _getLabel('錯誤/處理失敗');
            if (errLabel) message.getThread().addLabel(errLabel);
          }
        } catch (labelErr) {
          Logger.log('  ⚠️ 掛標籤失敗: ' + labelErr.message);
        }
      } else {
        // 還有重試機會 → 更新計數
        sheet.getRange(rowIdx, 9).setValue('[失敗:' + nextCount + '] ' + e.message.substring(0, 50));
      }
    }
  }

  Logger.log('重試完成: 嘗試 ' + retried + ' 封，成功 ' + succeeded + '，放棄 ' + abandoned);
}

/**
 * 手動重新處理失敗信件（選單觸發）
 * 把 [放棄] 重置為 [失敗:1]、移除 處理失敗 標籤，再給 3 次機會
 */
function retryFailedManual() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let resetCount = 0;

  for (let i = 1; i < data.length; i++) {
    const aiName = String(data[i][8] || '');
    if (!aiName.startsWith('[放棄]')) continue;

    const messageId = String(data[i][0]).trim();
    sheet.getRange(i + 1, 9).setValue('[失敗:1] 手動重試');
    resetCount++;

    // 移除紅色標籤
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        const errLabel = _getLabel('錯誤/處理失敗');
        if (errLabel) message.getThread().removeLabel(errLabel);
      }
    } catch (e) { /* ignore */ }
  }

  Logger.log('已重置 ' + resetCount + ' 封失敗信件');
  if (resetCount > 0) {
    _scheduleOnce('_retryFailedEmails', 10 * 1000);  // 10 秒後重試
  }

  try {
    SpreadsheetApp.getUi().alert('🔄 重試', '已重置 ' + resetCount + ' 封失敗信件，即將自動重試。', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* no UI */ }
}


// ===================== 回授偵測 =====================

/**
 * 決定回授學習的對象
 *
 * 規則：
 * 1. F 方向（收到的信）→ 學習寄件人
 * 2. T 方向（寄出的信）→ 學習收件人（寄件人是自己）
 * 3. OWN_DOMAINS → 永遠跳過（自己不可能是客戶/代理人）
 * 4. 公共 domain（gmail/hotmail 等）→ 用完整 email（因為同 domain 有不同人）
 * 5. 專屬 domain（公司信箱）→ 用 @domain（同公司的人角色一致）
 *
 * @return {string|null} 學習目標（email 或 @domain），null 表示不該學習
 */
function _getFeedbackLearnTarget(aiCode, sender, message) {
  let targetEmail;

  if (aiCode.startsWith('T')) {
    // 寄出的信 → 找收件人
    const toEmails = (message.getTo() || '').split(',').map(r => _extractEmail(r)).filter(Boolean);
    targetEmail = toEmails.find(e => !CONFIG.OWN_DOMAINS.includes(_extractDomain(e)));
    if (!targetEmail) return null;  // 沒有外部收件人
  } else {
    // 收到的信 → 用寄件人
    targetEmail = sender;
  }

  const domain = _extractDomain(targetEmail);

  // OWN_DOMAINS 永遠跳過
  if (CONFIG.OWN_DOMAINS.includes(domain)) return null;

  // 公共 domain → 用完整 email
  if (CONFIG.PUBLIC_DOMAINS.includes(domain)) return targetEmail;

  // 專屬 domain → 用 @domain
  if (!domain) return null;  // domain 為空 → 無法學習
  return '@' + domain;
}

/**
 * 收發碼變更後，將 Drive 檔名中的舊碼替換為新碼
 * @param {Array} row - Sheet 資料列
 * @param {Spreadsheet} ss - Spreadsheet 物件（用於取得時區）
 * @param {string} oldCode - 舊收發碼（如 FX）
 * @param {string} newCode - 新收發碼（如 FA）
 * @returns {number} 改名的檔案數
 */
function _renameDriveFilesForCodeChange(row, ss, oldCode, newCode) {
  const rowDate = row[1];
  const rowFilingCases = String(row[6] || '').trim();
  const rowCategory = String(row[10] || '').trim();
  const semanticName = String(row[8] || '').trim();

  // 組出日期字串（必須用 spreadsheet timezone，與檔案命名 Asia/Taipei 一致）
  let dateStr = '';
  const ssTz = ss.getSpreadsheetTimeZone();
  if (rowDate instanceof Date) {
    dateStr = Utilities.formatDate(rowDate, ssTz, 'yyyyMMdd');
  } else {
    // ISO 字串先轉 Date 再用 spreadsheet timezone 格式化，避免 UTC vs 本地日期不一致
    const parsed = new Date(String(rowDate));
    if (!isNaN(parsed.getTime())) {
      dateStr = Utilities.formatDate(parsed, ssTz, 'yyyyMMdd');
    }
  }

  if (!dateStr || !rowFilingCases) return 0;

  const filingArr = rowFilingCases.split(/,\s*/);
  const suffix = filingArr.length > 1 ? '等' + filingArr.length + '案' : '';

  const rootFolder = _getDriveRootFolder();
  const categoriesToSearch = rowCategory ? [rowCategory] : ['專利', '商標', '未分類'];
  let count = 0;

  for (const cat of categoriesToSearch) {
    try {
      const catFolder = _getOrCreateFolder(rootFolder, cat);
      for (const caseNum of filingArr) {
        try {
          const caseFolder = _getOrCreateFolder(catFolder, caseNum);
          const oldPrefix = dateStr + '-' + oldCode + '-' + caseNum + suffix;
          const newPrefix = dateStr + '-' + newCode + '-' + caseNum + suffix;
          const files = caseFolder.getFiles();
          while (files.hasNext()) {
            const file = files.next();
            const name = file.getName();
            if (name.indexOf(oldPrefix) === 0) {
              const newName = newPrefix + name.substring(oldPrefix.length);
              file.setName(newName);
              Logger.log('  📄 碼改名: ' + name + ' → ' + newName);
              count++;
            }
          }
        } catch (e) { /* case folder not found, skip */ }
      }
    } catch (e) { /* category folder not found, skip */ }
  }

  return count;
}

/**
 * 垃圾碼被修正為其他碼時：搬遷 EML + 補下載附件
 * @param {Array} rowData - Sheet 資料列
 * @param {string} newCode - 修正後的收發碼（如 FC）
 * @param {Spreadsheet} ss - Spreadsheet 物件
 * @param {number} rowIndex - 資料列的 0-based index（在 data 陣列中）
 */
function _relocateSpamFiles(rowData, newCode, ss, rowIndex) {
  const messageId = String(rowData[0]).trim();
  const rowDate = rowData[1];
  const semanticName = String(rowData[8] || '').trim();
  const rowFilingCases = String(rowData[6] || '').trim();

  // 組出日期字串（必須用 spreadsheet timezone，與檔案命名 Asia/Taipei 一致）
  let dateStr = '';
  const ssTz = ss.getSpreadsheetTimeZone();
  if (rowDate instanceof Date) {
    dateStr = Utilities.formatDate(rowDate, ssTz, 'yyyyMMdd');
  } else {
    // ISO 字串先轉 Date 再用 spreadsheet timezone 格式化，避免 UTC vs 本地日期不一致
    const parsed = new Date(String(rowDate));
    if (!isNaN(parsed.getTime())) {
      dateStr = Utilities.formatDate(parsed, ssTz, 'yyyyMMdd');
    }
  }

  if (!dateStr) {
    Logger.log('  ⚠️ 垃圾搬遷：無法解析日期');
    return;
  }

  const rootFolder = _getDriveRootFolder();
  const spamFolder = _getOrCreateFolder(_getOrCreateFolder(rootFolder, '未分類'), '垃圾');

  // 原始 baseName 前綴：{date}-垃圾-無案號-{semanticName}
  const oldPrefix = dateStr + '-垃圾-無案號-' + semanticName;

  // 目標資料夾
  const filingArr = rowFilingCases ? rowFilingCases.split(/,\s*/) : [];
  let targetCategory = '未分類';
  if (filingArr.length > 0 && filingArr[0] !== '無案號') {
    // 用案號判定分類
    const PATENT_TYPES = 'PMDAC';
    const TRADEMARK_TYPES = 'TBW';
    const typeChar = filingArr[0].length >= 10 ? filingArr[0].charAt(9) : '';
    if (PATENT_TYPES.includes(typeChar)) targetCategory = '專利';
    else if (TRADEMARK_TYPES.includes(typeChar)) targetCategory = '商標';
  }
  const folderCaseNum = filingArr.length > 0 ? filingArr[0] : '無案號';
  const caseLabel = filingArr.length > 1 ? folderCaseNum + '等' + filingArr.length + '案' : folderCaseNum;

  const catFolder = _getOrCreateFolder(rootFolder, targetCategory);
  const targetFolder = _getOrCreateFolder(catFolder, folderCaseNum);

  // 搜尋並搬遷 EML
  const files = spamFolder.getFiles();
  let movedCount = 0;
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.indexOf(oldPrefix) === 0) {
      // 改名：垃圾 → newCode, 無案號 → 實際案號
      const newName = name
        .replace(dateStr + '-垃圾-無案號-', dateStr + '-' + newCode + '-' + caseLabel + '-');
      file.setName(newName);
      file.moveTo(targetFolder);
      Logger.log('  📦 搬遷: ' + name + ' → ' + targetFolder.getName() + '/' + newName);
      movedCount++;
    }
  }

  // 補下載附件
  try {
    const message = GmailApp.getMessageById(messageId);
    if (message) {
      const attachments = _getSmartAttachments(message);
      if (attachments.length > 0) {
        const baseName = dateStr + '-' + newCode + '-' + caseLabel + '-' + semanticName;
        const existingFiles = _scanFolderFiles(targetFolder);
        let attIdx = 0;
        for (const att of attachments) {
          attIdx++;
          const origName = att.getName();
          const dotPos = origName.lastIndexOf('.');
          const ext = dotPos > 0 ? origName.substring(dotPos) : '';
          const attBaseName = baseName + '-附件' + attIdx;
          const attBlob = att.copyBlob();
          const attSize = attBlob.getBytes().length;
          const existingAtt = _findExistingFile(existingFiles, attBaseName, ext, attSize);
          if (!existingAtt) {
            const filename = _getUniqueFileName(existingFiles, attBaseName, ext);
            targetFolder.createFile(attBlob.setName(filename));
            existingFiles[filename] = { size: attSize };
            Logger.log('  📎 補下載附件: ' + filename);
          }
        }
      }
    }
  } catch (attErr) {
    Logger.log('  ⚠️ 補下載附件失敗: ' + attErr.message);
  }

  // 更新 Sheet 資料夾連結（col 13, 1-based）
  if (movedCount > 0) {
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    if (sheet) {
      sheet.getRange(rowIndex + 1, 13).setValue(targetFolder.getUrl());
    }
  }

  Logger.log('  📦 垃圾搬遷完成: ' + movedCount + ' 個檔案');
}

/**
 * 修正案號時：搬遷 EML + 附件 到正確的案號資料夾，更新 Sheet + Gmail 標籤
 * @param {Array} rowData - Sheet 資料列
 * @param {string[]} correctedCaseNumbers - 修正後的案號陣列
 * @param {Spreadsheet} ss - Spreadsheet 物件
 * @param {number} rowIndex - 資料列的 0-based index（在 data 陣列中）
 */
function _relocateCaseCorrectedFiles(rowData, correctedCaseNumbers, ss, rowIndex) {
  const messageId = String(rowData[0]).trim();
  const rowDate = rowData[1];
  const rowCode = String(rowData[4] || '').trim();           // AI收發碼
  const semanticName = String(rowData[8] || '').trim();       // AI語義名
  const origFiling = String(rowData[6] || '').trim();         // 原歸檔案號
  const origCategory = String(rowData[10] || '').trim();      // 原案件類別

  // 組出日期字串
  let dateStr = '';
  const ssTz = ss.getSpreadsheetTimeZone();
  if (rowDate instanceof Date) {
    dateStr = Utilities.formatDate(rowDate, ssTz, 'yyyyMMdd');
  } else {
    const parsed = new Date(String(rowDate));
    if (!isNaN(parsed.getTime())) {
      dateStr = Utilities.formatDate(parsed, ssTz, 'yyyyMMdd');
    }
  }

  if (!dateStr) {
    Logger.log('  ⚠️ 案號修正搬遷：無法解析日期');
    return;
  }

  const rootFolder = _getDriveRootFolder();

  // 判定原始資料夾位置
  let sourceFolder;
  const uncatFolder = _getOrCreateFolder(rootFolder, '未分類');
  if (origFiling && origFiling !== '無案號') {
    // clientCode 資料夾（如 TRON）在未分類下
    sourceFolder = _getOrCreateFolder(uncatFolder, origFiling);
  } else {
    sourceFolder = _getOrCreateFolder(uncatFolder, '無案號');
  }

  // 判定目標分類
  const PATENT_TYPES = 'PMDAC';
  const TRADEMARK_TYPES = 'TBW';
  const typeChar = correctedCaseNumbers[0].length >= 10 ? correctedCaseNumbers[0].charAt(9) : '';
  let targetCategory = '未分類';
  if (PATENT_TYPES.includes(typeChar)) targetCategory = '專利';
  else if (TRADEMARK_TYPES.includes(typeChar)) targetCategory = '商標';

  const folderCaseNum = correctedCaseNumbers[0];
  const caseLabel = correctedCaseNumbers.length > 1
    ? folderCaseNum + '等' + correctedCaseNumbers.length + '案'
    : folderCaseNum;

  const catFolder = _getOrCreateFolder(rootFolder, targetCategory);
  const targetFolder = _getOrCreateFolder(catFolder, folderCaseNum);

  // 組出原始檔名前綴
  const origCaseLabel = origFiling || '無案號';
  const oldPrefix = dateStr + '-' + rowCode + '-' + origCaseLabel + '-' + semanticName;
  const newPrefix = dateStr + '-' + rowCode + '-' + caseLabel + '-' + semanticName;

  // 搜尋並搬遷檔案
  const files = sourceFolder.getFiles();
  let movedCount = 0;
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.indexOf(oldPrefix) === 0) {
      const suffix = name.substring(oldPrefix.length);
      const newName = newPrefix + suffix;
      file.setName(newName);
      file.moveTo(targetFolder);
      Logger.log('  📦 案號修正搬遷: ' + name + ' → ' + targetFolder.getName() + '/' + newName);
      movedCount++;
    }
  }

  // 多案號時處理其他案號資料夾的副本
  if (correctedCaseNumbers.length > 1) {
    for (let c = 1; c < correctedCaseNumbers.length; c++) {
      const subFolder = _getOrCreateFolder(catFolder, correctedCaseNumbers[c]);
      // 副案號的 caseLabel 格式也是 caseNum等N案
      const subNewPrefix = dateStr + '-' + rowCode + '-' + correctedCaseNumbers[c] + '等' + correctedCaseNumbers.length + '案-' + semanticName;
      // 如果原始是無案號/clientCode，對應的副案號不存在，不需要搬遷，但記錄目標資料夾
    }
  }

  // 更新 Sheet
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (sheet) {
    sheet.getRange(rowIndex + 1, 7).setValue(correctedCaseNumbers.join(', '));  // col 6 (1-based=7): 歸檔案號
    sheet.getRange(rowIndex + 1, 11).setValue(targetCategory);                  // col 10 (1-based=11): AI案件類別
    sheet.getRange(rowIndex + 1, 13).setValue(targetFolder.getUrl());           // col 12 (1-based=13): 資料夾連結
  }

  // 更新 Gmail 標籤
  try {
    const message = GmailApp.getMessageById(messageId);
    if (message) {
      const thread = message.getThread();
      // 移除「無案號」標籤
      const noCaseLabel = GmailApp.getUserLabelByName(CONFIG.LABEL_PREFIX + '/狀態/無案號');
      if (noCaseLabel) thread.removeLabel(noCaseLabel);
      // 加上案件類型標籤
      if (targetCategory !== '未分類') {
        const catLabel = _getLabel('案件類型/' + targetCategory);
        if (catLabel) thread.addLabel(catLabel);
      }
    }
  } catch (labelErr) {
    Logger.log('  ⚠️ Gmail 標籤更新失敗: ' + labelErr.message);
  }

  Logger.log('  📦 案號修正搬遷完成: ' + movedCount + ' 個檔案, 案號=' + correctedCaseNumbers.join(', ') + ', 類別=' + targetCategory);
}

/**
 * 一次性工具：更新既有 Sender名單 Sheet 的 B 欄 data validation，加入 S
 */
function _migrateSenderDropdown() {
  const ss = _getSpreadsheet();
  const senderSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS);
  if (!senderSheet) {
    Logger.log('找不到 Sender名單 Sheet');
    return;
  }

  const roleRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['C', 'A', 'G', 'S'], true)
    .setHelpText('C = 客戶, A = 代理人, G = 政府機關, S = 垃圾/廣告')
    .setAllowInvalid(false)
    .build();
  senderSheet.getRange('B2:B500').setDataValidation(roleRule);

  senderSheet.getRange('B1').setValue('角色（C/A/G/S）');

  Logger.log('✅ Sender名單下拉選項已更新（C/A/G/S）');
  try {
    SpreadsheetApp.getUi().alert('✅ Sender名單', 'B 欄下拉選項已更新為 C/A/G/S', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 從 trigger 呼叫時沒有 UI */ }
}

/**
 * 查詢 domain 的公司名稱（從網站 <title> 提取）
 * @param {string} domain
 * @returns {string|null} 公司名稱，失敗或不適用時回傳 null
 */
function _lookupDomainName(domain) {
  if (!domain) return null;
  // 跳過公共和政府 domain
  if (CONFIG.PUBLIC_DOMAINS.includes(domain)) return null;
  if (_isGovDomain(domain)) return null;
  if (CONFIG.OWN_DOMAINS.includes(domain)) return null;

  const urls = [
    'https://' + domain,
    'http://' + domain,
    'https://www.' + domain,
  ];

  for (const url of urls) {
    try {
      const response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: false,
      });
      if (response.getResponseCode() !== 200) continue;
      const html = response.getContentText().substring(0, 10000); // 只讀前 10KB
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!titleMatch) continue;

      let title = titleMatch[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/\s*[|–—-]\s*(Home|首頁|Homepage|Welcome|Index|Top).*$/i, '')
        .replace(/^(Home|首頁|Homepage|Welcome|Index|Top)\s*[|–—-]\s*/i, '')
        .replace(/\s*[|–—-]\s*$/, '')
        .trim();
      // 如果 title 仍含分隔符且超過 30 字元，取最有意義的片段（通常是公司名）
      if (title.length > 30 && /[|–—]/.test(title)) {
        var parts = title.split(/\s*[|–—]\s*/);
        var genericPattern = /\b(Home\s*Page|Homepage|Welcome|Index|Top|Official|Site|Website)\b|首頁|官網|网站/i;
        // 優先選不含通用網頁用語的片段
        var meaningful = parts.filter(function(p) { return p.length >= 2 && !genericPattern.test(p); });
        var candidates = meaningful.length > 0 ? meaningful : parts.filter(function(p) { return p.length >= 2; });
        candidates.sort(function(a, b) { return a.length - b.length; });
        if (candidates.length > 0) title = candidates[0];
      }

      if (title.length > 80) title = title.substring(0, 80);
      if (title.length > 0) {
        Logger.log('  🔍 Domain 查詢: ' + domain + ' → ' + title);
        return title;
      }
    } catch (e) { /* try next URL */ }
  }

  Logger.log('  🔍 Domain 查詢失敗: ' + domain);
  return null;
}

function runFeedback() {
  Logger.log('=== 回授偵測 ===');

  // 執行狀態追蹤：開始
  var _execProps = PropertiesService.getScriptProperties();
  var _execStartTime = new Date().toISOString();
  _execProps.setProperty('_execution_status', JSON.stringify({
    action: 'runFeedback',
    status: 'running',
    startTime: _execStartTime,
    lastUpdate: _execStartTime
  }));

  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let confirmed = 0, corrected = 0, checked = 0;
  let renamed = 0, renameErrors = 0;

  // ── Part 1: Sender 角色回授（pending 狀態 + Gmail label 變化）──
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][11]).trim() !== 'pending') continue;  // col 11: 來源確認狀態
    checked++;

    try {
      const messageId = String(data[i][0]).trim();
      const message = GmailApp.getMessageById(messageId);
      if (!message) continue;

      const threadLabels = message.getThread().getLabels().map(l => l.getName());
      const hasAutoId = threadLabels.includes(CONFIG.LABEL_PREFIX + '/狀態/自動辨識來源');

      if (!hasAutoId) {
        const aiCode = String(data[i][4]).trim();
        const aiDirection = aiCode === '垃圾' ? null : aiCode.charAt(0); // 'F' or 'T'；垃圾無方向
        const inferredRole = String(data[i][5]).trim();
        const sender = String(data[i][3]).trim();

        let currentCode = null;
        for (const code of CONFIG.SEND_RECEIVE_CODES) {
          // 垃圾碼比對：不過濾方向；一般碼：只比對同方向
          if (aiDirection && code !== '垃圾' && code.charAt(0) !== aiDirection) continue;
          if (threadLabels.includes(CONFIG.LABEL_PREFIX + '/收發碼/' + code)) { currentCode = code; break; }
        }

        const learnTarget = _getFeedbackLearnTarget(aiCode, sender, message);
        const finalRole = currentCode === '垃圾' ? 'S' : (currentCode ? currentCode.charAt(1) : null);

        if (currentCode && currentCode !== aiCode) {
          sheet.getRange(i + 1, 12).setValue('corrected');   // col 12: 來源確認狀態 (1-based)
          sheet.getRange(i + 1, 14).setValue(currentCode);   // col 14: 最終收發碼
          sheet.getRange(i + 1, 17).setValue(new Date());    // col 17: 修正時間
          sheet.getRange(i + 1, 18).setValue('tag_change');   // col 18: 修正來源
          if (finalRole === 'S') {
            // Spam 用完整 email，避免封鎖整個 domain
            _addSender(sender, 'S', 'AI推斷' + inferredRole + '→人修正S');
          } else if (learnTarget && finalRole && finalRole !== 'X') {
            _addSender(learnTarget, finalRole, 'AI推斷' + inferredRole + '→人修正' + finalRole);
          }
          // 垃圾碼被修正為其他碼 → 搬遷檔案 + 補下載附件
          if (aiCode === '垃圾' && currentCode !== '垃圾') {
            try {
              _relocateSpamFiles(data[i], currentCode, ss, i);
            } catch (relocErr) {
              Logger.log('  ⚠️ 垃圾檔案搬遷失敗: ' + relocErr.message);
            }
          } else {
            // 一般收發碼變更 → Drive 檔案改名
            try {
              const renResult = _renameDriveFilesForCodeChange(data[i], ss, aiCode, currentCode);
              if (renResult > 0) Logger.log('  📄 收發碼改名: ' + renResult + ' 個檔案');
            } catch (renErr) {
              Logger.log('  ⚠️ 收發碼改名失敗: ' + renErr.message);
            }
          }
          // 加入黃金測試集
          _promoteToGoldenSet(messageId, String(data[i][2]), sender,
            currentCode, String(data[i][8] || ''), String(data[i][10] || ''),
            String(data[i][6] || ''), 'code');
          corrected++;
        } else {
          sheet.getRange(i + 1, 12).setValue('confirmed');
          sheet.getRange(i + 1, 17).setValue(new Date());
          sheet.getRange(i + 1, 18).setValue('tag_change');
          if (aiCode === '垃圾') {
            // 垃圾信確認 → 一律學習 sender 為 S（用完整 email，避免封鎖整個 domain）
            const domain = _extractDomain(sender);
            const companyName = _lookupDomainName(domain);
            const note = companyName ? 'AI推斷確認-' + companyName : 'AI推斷確認';
            _addSender(sender, 'S', note);
          } else if (learnTarget && inferredRole) {
            const roleToLearn = inferredRole;
            const domain = _extractDomain(sender);
            const companyName = _lookupDomainName(domain);
            const note = companyName ? 'AI推斷確認-' + companyName : 'AI推斷確認';
            _addSender(learnTarget, roleToLearn, note);
          }
          // 加入黃金測試集（confirmed = AI 判斷正確，也是好的測試案例）
          _promoteToGoldenSet(messageId, String(data[i][2]), sender,
            aiCode, String(data[i][8] || ''), String(data[i][10] || ''),
            String(data[i][6] || ''), 'confirmed');
          confirmed++;
        }
      }
    } catch (e) {
      Logger.log('回授(sender)失敗: ' + e.message);
    }
  }

  // ── Part 1.5: 補查「AI推斷確認」備註中缺少公司名的 Sender ──
  // 已加入 Sender名單的 sender 不會再觸發自動辨識流程，所以這裡主動補查
  try {
    const senderSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS);
    if (senderSheet) {
      const senderData = senderSheet.getDataRange().getValues();
      let noteUpdated = 0;
      for (let s = 1; s < senderData.length; s++) {
        const currentNote = String(senderData[s][2] || '').trim();
        // 處理三種情況：(1) 完全沒查過 (2) 公司名過長 (3) 含通用網頁用語（title cleanup 不完善）
        let needsLookup = false;
        if (currentNote === 'AI推斷確認') {
          needsLookup = true;
        } else if (currentNote.startsWith('AI推斷確認-')) {
          const companyPart = currentNote.substring('AI推斷確認-'.length);
          if (companyPart === '無法辨識公司') {
            // 已確認查不到，不重試
          } else if (companyPart.length > 30) {
            needsLookup = true;  // 公司名過長，可能是未清理的 <title>
          } else if (/\b(Home\s*Page|Homepage|Welcome|Index|Top|Official|Site|Website)\b|首頁|官網|网站/i.test(companyPart)) {
            needsLookup = true;  // 含通用網頁用語，title cleanup 邏輯已改進
          }
        }
        if (!needsLookup) continue;
        const emailOrDomain = String(senderData[s][0] || '').trim();
        const domain = emailOrDomain.startsWith('@') ? emailOrDomain.substring(1) : _extractDomain(emailOrDomain);
        if (!domain) continue;
        const companyName = _lookupDomainName(domain);
        const newNote = companyName ? 'AI推斷確認-' + companyName : 'AI推斷確認-無法辨識公司';
        senderSheet.getRange(s + 1, 3).setValue(newNote);
        Logger.log('  🔍 Sender 備註補查: ' + emailOrDomain + ' → ' + newNote);
        noteUpdated++;
      }
      if (noteUpdated > 0) {
        Logger.log('  📝 Sender 備註更新: ' + noteUpdated + ' 筆');
      }
    }
  } catch (e) {
    Logger.log('回授(sender備註補查)失敗: ' + e.message);
  }

  // ── Part 2: 語義名修正 → Drive 檔案改名 ──
  // 偵測條件：「修正後名稱」有值 + 「修正來源」不含 'name'（代表改名尚未執行）
  // 策略：用 Sheet 裡的日期/收發碼/案號/AI語義名 組出原始檔名，精準比對 Drive 裡的檔案
  // 需要重新讀取 sheet data，因為 Part 1 可能已經更新了修正來源欄
  const freshData = sheet.getDataRange().getValues();
  for (let i = 1; i < freshData.length; i++) {
    const correctedName = String(freshData[i][14] || '').trim();   // col 14: 修正後名稱
    const correctionSource = String(freshData[i][17] || '').trim(); // col 17: 修正來源
    const aiName = String(freshData[i][8] || '').trim();           // col 8: AI語義名

    // 跳過：沒填修正名稱、改名已執行過、跟 AI 名稱相同
    if (!correctedName || correctionSource.indexOf('name') !== -1 || correctedName === aiName) continue;

    try {
      // 從 Sheet 裡組出原始檔名，精準比對 Drive 裡的檔案
      const rowDate = freshData[i][1];                                // col 1: 日期
      const rowCode = String(freshData[i][4] || '').trim();           // col 4: AI收發碼
      const rowFilingCases = String(freshData[i][6] || '').trim();    // col 6: 歸檔案號
      const rowCategory = String(freshData[i][10] || '').trim();      // col 10: AI案件類別

      // 組出日期字串 yyyyMMdd
      // ⚠️ 必須用 Spreadsheet 的時區讀回日期，才能還原當初寫入的值
      //    原因：日期寫入時用 Asia/Taipei 格式化成 "2026-03-13 23:12"，
      //    但 Sheets 可能用不同時區（如 America/LA）自動轉成 Date 物件，
      //    再用 Asia/Taipei 格式化回來會飄移日期（如 3/13 → 3/14）
      let dateStr = '';
      const ssTz = ss.getSpreadsheetTimeZone();
      if (rowDate instanceof Date) {
        dateStr = Utilities.formatDate(rowDate, ssTz, 'yyyyMMdd');
      } else {
        // ISO 字串先轉 Date 再用 spreadsheet timezone 格式化，避免 UTC vs 本地日期不一致
        const parsed = new Date(String(rowDate));
        if (!isNaN(parsed.getTime())) {
          dateStr = Utilities.formatDate(parsed, ssTz, 'yyyyMMdd');
        }
      }

      // 用歸檔案號組出每個案號資料夾的 baseName
      // 多案號時，每個資料夾的 EML 開頭不同（主案號 vs 副案號）
      // 例：BRIT25710PUS1等2案-... 和 BRIT25711PUS2等2案-...
      const filingArr = rowFilingCases ? rowFilingCases.split(/,\s*/) : [];
      const oldBaseNames = [];
      if (dateStr && rowCode && filingArr.length > 0) {
        const suffix = filingArr.length > 1 ? '等' + filingArr.length + '案' : '';
        for (const caseNum of filingArr) {
          const caseLabel = caseNum + suffix;
          oldBaseNames.push(dateStr + '-' + rowCode + '-' + caseLabel + '-' + aiName);
        }
      }

      Logger.log('📝 改名回授: 「' + aiName + '」→「' + correctedName + '」' +
        (oldBaseNames.length > 0 ? ' (' + oldBaseNames.length + ' 個 baseName)' : ''));

      // 找到 Drive 裡的 EML 和附件並改名（多案號會傳多個 baseName）
      const renameCount = _renameDriveFiles(oldBaseNames, aiName, correctedName, rowCategory);

      // 修正來源：追加而非覆蓋（可能已有 tag_change）
      const newSource = correctionSource ? correctionSource + '+name_change' : 'name_change';
      const notFoundSource = correctionSource ? correctionSource + '+name_not_found' : 'name_not_found';

      if (renameCount > 0) {
        sheet.getRange(i + 1, 17).setValue(new Date());    // col 17: 修正時間 (1-based)
        sheet.getRange(i + 1, 18).setValue(newSource);      // col 18: 修正來源
        renamed += renameCount;
        Logger.log('  ✅ 改名成功: ' + renameCount + ' 個檔案');
      } else {
        sheet.getRange(i + 1, 17).setValue(new Date());
        sheet.getRange(i + 1, 18).setValue(notFoundSource);
        Logger.log('  ⚠️ 未找到符合的 Drive 檔案');
      }

      // 語義名修正 → 加入黃金測試集
      const msgId = String(freshData[i][0]).trim();
      _promoteToGoldenSet(msgId, String(freshData[i][2] || ''), String(freshData[i][3] || ''),
        String(freshData[i][4] || freshData[i][13] || ''), correctedName,
        String(freshData[i][10] || ''), String(freshData[i][6] || ''), 'name');
    } catch (e) {
      Logger.log('回授(改名)失敗: ' + e.message);
      renameErrors++;
    }
  }

  // ── Part 3: Sheet 直填最終收發碼 → 學習 Sender ──
  // 偵測條件：最終收發碼有值 + 修正來源不含 'sheet_code'（代表尚未處理）
  // 適用情況：人員直接在 Sheet 填正確的收發碼（不透過 Gmail label）
  let sheetCodeLearned = 0;
  let sheetCodeCorrected = 0;
  const freshData2 = sheet.getDataRange().getValues();
  for (let i = 1; i < freshData2.length; i++) {
    const finalCode = String(freshData2[i][13] || '').trim();       // col 13: 最終收發碼
    const correctionSource = String(freshData2[i][17] || '').trim(); // col 17: 修正來源
    const aiCode = String(freshData2[i][4] || '').trim();

    // 跳過：沒填、已處理過、跟 AI 碼一樣
    if (!finalCode || correctionSource.indexOf('sheet_code') !== -1 || finalCode === aiCode) continue;
    // 跳過：不是合法的收發碼
    if (!CONFIG.SEND_RECEIVE_CODES.includes(finalCode)) continue;

    try {
      const messageId = String(freshData2[i][0]).trim();
      const sender = String(freshData2[i][3]).trim();
      const message = GmailApp.getMessageById(messageId);
      if (!message) continue;

      const finalRole = finalCode === '垃圾' ? 'S' : finalCode.charAt(1);
      const learnTarget = _getFeedbackLearnTarget(aiCode, sender, message);

      if (finalRole === 'S') {
        // Spam 用完整 email，避免封鎖整個 domain
        _addSender(sender, 'S', 'Sheet直填' + aiCode + '→' + finalCode);
        sheetCodeLearned++;
      } else if (learnTarget && finalRole && finalRole !== 'X') {
        _addSender(learnTarget, finalRole, 'Sheet直填' + aiCode + '→' + finalCode);
        sheetCodeLearned++;
      }

      // 追加修正來源
      const newSource = correctionSource ? correctionSource + '+sheet_code' : 'sheet_code';
      sheet.getRange(i + 1, 17).setValue(new Date());    // col 17: 修正時間
      sheet.getRange(i + 1, 18).setValue(newSource);      // col 18: 修正來源
      sheetCodeCorrected++;

      // Sheet 收發碼修正 → 加入黃金測試集
      _promoteToGoldenSet(messageId, String(freshData2[i][2] || ''), sender,
        finalCode, String(freshData2[i][8] || ''), String(freshData2[i][10] || ''),
        String(freshData2[i][6] || ''), 'code');
    } catch (e) {
      Logger.log('回授(Sheet收發碼)失敗: ' + e.message);
    }
  }

  // ── Part 4: 案號修正 + Thread Cascade ──
  // 偵測條件：col 23（修正案號）有值 + col 17（修正來源）不含 'case_corrected'
  let caseCorrected = 0, caseCascaded = 0;
  const freshData3 = sheet.getDataRange().getValues();
  for (let i = 1; i < freshData3.length; i++) {
    const correctedCase = String(freshData3[i][23] || '').trim();       // col 23: 修正案號
    const correctionSource3 = String(freshData3[i][17] || '').trim();   // col 17: 修正來源

    // 跳過：沒填、已處理過
    if (!correctedCase || correctionSource3.indexOf('case_corrected') !== -1) continue;

    try {
      const correctedCaseNumbers = correctedCase.split(/,\s*/).filter(cn => cn.length > 0);
      if (correctedCaseNumbers.length === 0) continue;

      // a. 修正該列本身
      _relocateCaseCorrectedFiles(freshData3[i], correctedCaseNumbers, ss, i);

      // 標記修正來源
      const newSource3 = correctionSource3 ? correctionSource3 + '+case_corrected' : 'case_corrected';
      sheet.getRange(i + 1, 17).setValue(new Date());       // col 16 (1-based=17): 修正時間
      sheet.getRange(i + 1, 18).setValue(newSource3);        // col 17 (1-based=18): 修正來源
      caseCorrected++;

      // b. Thread Cascade：找同 thread 中時間 >= 該信的後續信件
      const messageId = String(freshData3[i][0]).trim();
      const message = GmailApp.getMessageById(messageId);
      if (!message) continue;

      const currentDate = message.getDate();
      const threadMessages = message.getThread().getMessages();

      // 收集同 thread 中時間 >= 當前信件的其他 messageId
      const cascadeIds = new Set();
      for (const msg of threadMessages) {
        if (msg.getDate() >= currentDate && msg.getId() !== messageId) {
          cascadeIds.add(msg.getId());
        }
      }

      if (cascadeIds.size === 0) continue;

      // 在 LOG sheet 中搜尋這些 messageId 並 cascade
      for (let j = 1; j < freshData3.length; j++) {
        if (j === i) continue;
        const rowMsgId = String(freshData3[j][0]).trim();
        if (!cascadeIds.has(rowMsgId)) continue;

        const rowFiling = String(freshData3[j][6] || '').trim();
        const rowSource = String(freshData3[j][17] || '').trim();

        // 只 cascade 無案號狀態的列（空、clientCode、或無案號）
        // 有正常案號的不動
        const hasProperCase = rowFiling && rowFiling !== '無案號' && /\d{5}[A-Z]{2,3}\d/.test(rowFiling);
        if (hasProperCase) continue;
        if (rowSource.indexOf('case_cascade') !== -1) continue;  // 已 cascade 過

        try {
          _relocateCaseCorrectedFiles(freshData3[j], correctedCaseNumbers, ss, j);

          // 寫入修正案號 + 標記 cascade
          sheet.getRange(j + 1, 24).setValue(correctedCase);        // col 23 (1-based=24): 修正案號
          const cascadeSource = rowSource ? rowSource + '+case_cascade' : 'case_cascade';
          sheet.getRange(j + 1, 17).setValue(new Date());            // col 16 (1-based=17): 修正時間
          sheet.getRange(j + 1, 18).setValue(cascadeSource);          // col 17 (1-based=18): 修正來源
          caseCascaded++;
          Logger.log('  📎 Cascade: row ' + (j + 1) + ' msgId=' + rowMsgId);
        } catch (cascErr) {
          Logger.log('  ⚠️ Cascade 失敗 row ' + (j + 1) + ': ' + cascErr.message);
        }
      }
    } catch (e) {
      Logger.log('回授(案號修正)失敗: ' + e.message);
    }
  }

  const msg = '回授偵測完成\n\n' +
    '【Sender 角色 - Gmail tag】\n' +
    '檢查 pending 紀錄: ' + checked + ' 筆\n' +
    '✅ 確認: ' + confirmed + '\n' +
    '🔄 修正: ' + corrected + '\n' +
    '⏳ 尚未處理: ' + (checked - confirmed - corrected) + '\n\n' +
    '【Sender 角色 - Sheet 直填】\n' +
    '📝 學習: ' + sheetCodeLearned + ' 筆\n\n' +
    '【檔名修正】\n' +
    '📝 改名檔案: ' + renamed + ' 個\n' +
    (renameErrors > 0 ? '❌ 改名失敗: ' + renameErrors + ' 筆\n' : '') +
    ((caseCorrected > 0 || caseCascaded > 0) ?
      '\n【案號修正】\n' +
      '📝 直接修正: ' + caseCorrected + ' 筆\n' +
      '📎 Cascade: ' + caseCascaded + ' 筆\n' : '');

  Logger.log(msg);

  // 執行狀態追蹤：完成
  var feedbackStats = {
    checked: checked,
    confirmed: confirmed,
    corrected: corrected,
    pending: checked - confirmed - corrected,
    sheetCodeLearned: sheetCodeLearned,
    sheetCodeCorrected: sheetCodeCorrected,
    renamed: renamed,
    renameErrors: renameErrors,
    caseCorrected: caseCorrected,
    caseCascaded: caseCascaded
  };
  _execProps.setProperty('_execution_status', JSON.stringify({
    action: 'runFeedback',
    status: 'completed',
    startTime: _execStartTime,
    endTime: new Date().toISOString(),
    stats: feedbackStats
  }));

  _testSaveLog(Logger.getLog().split('\n').filter(Boolean));
  try {
    SpreadsheetApp.getUi().alert('🔄 回授偵測', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 從 trigger 或編輯器呼叫時沒有 UI */ }

  return feedbackStats;
}

/**
 * 在 Drive 裡精準找到原始檔案並改名
 *
 * 比對策略：
 *   1. 如果有 oldBaseNames → 檔名必須以其中一個 baseName 開頭（支援多案號，每個案號資料夾的 baseName 不同）
 *   2. 如果 oldBaseNames 為空 → fallback 到只比對 oldSemanticName（較不精準）
 *
 * 搜尋範圍：
 *   如果有 category → 只搜該分類資料夾底下的案號資料夾
 *   否則 → 搜所有分類/案號資料夾
 *
 * @param {string[]} oldBaseNames    完整的原始 baseName 陣列（多案號會有多個，如 ["20260313-FA-BRIT25710PUS1等2案-委託...", "20260313-FA-BRIT25711PUS2等2案-委託..."]）
 * @param {string} oldSemanticName   原始 AI 語義名（baseName 中的語義部分）
 * @param {string} newSemanticName   修正後名稱
 * @param {string} category          案件類別（專利/商標/未分類），縮小搜尋範圍
 * @return {number} 改名的檔案數量
 */
function _renameDriveFiles(oldBaseNames, oldSemanticName, newSemanticName, category) {
  const rootFolder = _getDriveRootFolder();
  let count = 0;
  const baseNames = oldBaseNames || [];

  Logger.log('  🔍 搜尋參數: oldSemanticName=「' + oldSemanticName + '」');
  if (baseNames.length > 0) {
    baseNames.forEach((bn, idx) => Logger.log('  🔍 baseName[' + idx + ']=「' + bn + '」'));
  }

  /**
   * 掃描一個資料夾內的檔案，符合條件就改名
   */
  function _scanAndRename(folder) {
    const folderName = folder.getName();
    const files = folder.getFiles();
    let fileCount = 0;
    while (files.hasNext()) {
      const file = files.next();
      const oldName = file.getName();
      fileCount++;

      // 比對條件：檔名包含舊語義名
      if (oldName.indexOf(oldSemanticName) === -1) continue;

      // 如果有 baseNames，確認檔名以其中一個開頭（支援多案號）
      if (baseNames.length > 0) {
        const matchesAny = baseNames.some(bn => oldName.indexOf(bn) === 0);
        if (!matchesAny) {
          Logger.log('  ⚠️ 語義名吻合但 baseName 不符: 「' + oldName + '」');
          continue;
        }
      }

      const newName = oldName.replace(oldSemanticName, newSemanticName);
      if (newName !== oldName) {
        file.setName(newName);
        Logger.log('  📄 ' + oldName + ' → ' + newName);
        count++;
      }
    }
    if (fileCount > 0) {
      Logger.log('  📂 ' + folderName + ': 掃描 ' + fileCount + ' 個檔案');
    }
  }

  // 決定搜尋範圍
  const categoriesToSearch = category ? [category] : ['專利', '商標', '未分類'];
  Logger.log('  🔍 搜尋分類: ' + categoriesToSearch.join(', ') + ' (rootFolder=「' + rootFolder.getName() + '」)');

  for (const cat of categoriesToSearch) {
    try {
      const catFolder = _getOrCreateFolder(rootFolder, cat);
      // 搜尋該分類下所有案號資料夾
      const caseFolders = catFolder.getFolders();
      let folderCount = 0;
      while (caseFolders.hasNext()) {
        _scanAndRename(caseFolders.next());
        folderCount++;
      }
      // 也搜分類資料夾本身（以防檔案直接放在分類層）
      _scanAndRename(catFolder);
      Logger.log('  📁 分類「' + cat + '」: 共 ' + folderCount + ' 個案號資料夾');
    } catch (e) {
      Logger.log('  ⚠️ 搜尋 ' + cat + ' 資料夾失敗: ' + e.message);
    }
  }

  if (count === 0) {
    Logger.log('  ⚠️ 未找到符合的 Drive 檔案');
  }

  return count;
}


// ===================== 查看學習紀錄 =====================

function showLearningLog() {
  const corrections = _getRecentCorrections(50);
  const ui = SpreadsheetApp.getUi();

  if (corrections.length === 0) {
    ui.alert('📝 學習紀錄', '目前沒有任何修正紀錄。\n\n' +
      '修正紀錄的來源：\n' +
      '1. 在 Gmail 移除「自動辨識來源」標籤 → 執行回授偵測（學習 Sender 角色）\n' +
      '2. 在「處理紀錄」Sheet 填寫「修正後名稱」欄 → 執行回授偵測（改名 Drive 檔案 + LLM 學習）\n' +
      '3. 在「修正原因」欄填寫原因，讓 LLM 理解為什麼修改', ui.ButtonSet.OK);
    return;
  }

  let text = '目前有 ' + corrections.length + ' 筆修正紀錄（最新在前）：\n\n';
  corrections.slice(0, 15).forEach((c, i) => {
    text += (i + 1) + '. 「' + c.subject + '」\n';
    if (c.aiCode !== c.finalCode) text += '   碼: ' + c.aiCode + ' → ' + c.finalCode + '\n';
    if (c.aiName !== c.finalName) text += '   名: 「' + c.aiName + '」→「' + c.finalName + '」\n';
    if (c.reason) text += '   原因: ' + c.reason + '\n';
    text += '\n';
  });

  if (corrections.length > 15) text += '...還有 ' + (corrections.length - 15) + ' 筆\n';
  text += '\n這些紀錄會在每次 LLM 分類時自動注入 prompt。';

  ui.alert('📝 學習紀錄', text, ui.ButtonSet.OK);
}


// ===================== LLM Prompt 文件管理 =====================

/**
 * 取得或建立 LLM Prompt Doc（在專案資料夾內，與 Sheet 同層級）
 */
function _getOrCreatePromptDoc() {
  const projectFolder = _getProjectFolder();
  const docName = CONFIG.PROMPT_DOC_NAME;

  // 在專案資料夾內搜尋同名 Doc
  const files = projectFolder.getFilesByName(docName);
  if (files.hasNext()) {
    const file = files.next();
    return DocumentApp.openById(file.getId());
  }

  // 不存在 → 建立新的，然後移到專案資料夾
  const doc = DocumentApp.create(docName);
  const file = DriveApp.getFileById(doc.getId());
  projectFolder.addFile(file);
  // 從根目錄移除（create 預設放在根目錄）
  const parents = file.getParents();
  while (parents.hasNext()) {
    const parent = parents.next();
    if (parent.getId() !== projectFolder.getId()) {
      parent.removeFile(file);
    }
  }

  return doc;
}

/**
 * 匯出 LLM Prompt 到 Google Doc（選單功能）
 * Doc 結構：
 *   1. 完整 SYSTEM_PROMPT（含模板 + 修正紀錄注入後的版本）
 *   2. 待整理學習紀錄（累積區）
 */
function exportPromptDoc() {
  const corrections = _getRecentCorrections(20);
  const templates = _loadTemplates();
  const prompt = _buildPrompt(corrections, templates);

  const doc = _getOrCreatePromptDoc();
  const body = doc.getBody();

  // 清除舊內容
  body.clear();

  // ── 標題 ──
  body.appendParagraph('LLM Prompt 文件')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('最後更新: ' + new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }))
    .setItalic(true);
  body.appendParagraph('');

  // ── 注入摘要 ──
  body.appendParagraph('注入摘要')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('模板數量: ' + templates.length + ' 條');
  body.appendParagraph('修正紀錄: ' + corrections.length + ' 筆（最近 20 筆 few-shot）');
  body.appendParagraph('Prompt 總長: 約 ' + prompt.length + ' 字元');
  body.appendParagraph('');

  // ── 完整 Prompt ──
  body.appendParagraph('完整 SYSTEM_PROMPT')
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(prompt)
    .setFontFamily('Noto Sans Mono')
    .setFontSize(9);
  body.appendParagraph('');

  // ── 待整理學習紀錄（保留區：不會被清除，只會在合併後清空）──
  body.appendParagraph('').setAttributes({});  // 分隔線
  body.appendHorizontalRule();
  body.appendParagraph('待整理學習紀錄')
    .setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('以下紀錄會在「整理學習紀錄」時由 LLM 自動摘要，歸納成規則後合併進 SYSTEM_PROMPT。')
    .setItalic(true);
  body.appendParagraph('');

  // 寫入目前所有修正紀錄（含原因）
  if (corrections.length > 0) {
    corrections.forEach((c, i) => {
      let line = (i + 1) + '. 「' + c.subject + '」';
      if (c.aiCode !== c.finalCode) line += ' [碼: ' + c.aiCode + '→' + c.finalCode + ']';
      if (c.aiName !== c.finalName) line += ' [名: 「' + c.aiName + '」→「' + c.finalName + '」]';
      if (c.reason) line += ' [原因: ' + c.reason + ']';
      body.appendParagraph(line).setFontSize(9);
    });
  } else {
    body.appendParagraph('（目前沒有待整理的修正紀錄）');
  }

  doc.saveAndClose();

  const url = doc.getUrl();
  const ui = SpreadsheetApp.getUi();
  ui.alert('📋 LLM Prompt 文件',
    '已匯出到專案資料夾：\n\n' + url + '\n\n' +
    '── 注入摘要 ──\n' +
    '模板: ' + templates.length + ' 條\n' +
    '修正紀錄: ' + corrections.length + ' 筆\n' +
    'Prompt: 約 ' + prompt.length + ' 字元',
    ui.ButtonSet.OK);
}


/**
 * 整理學習紀錄：用 LLM 把累積的修正紀錄歸納成規則，合併進 SYSTEM_PROMPT
 *
 * 流程：
 *   1. 讀取所有修正紀錄
 *   2. 呼叫 LLM 分析修正紀錄 → 產生歸納規則建議
 *   3. 把歸納結果寫入 Prompt Doc 的「已合併規則」區
 *   4. 清空 Sheet 裡已處理的修正紀錄（標記為已合併）
 *   5. 更新 Prompt Doc
 */
function consolidateLearning() {
  const corrections = _getRecentCorrections(100);  // 讀取所有修正紀錄
  Logger.log('📋 consolidateLearning: 找到 ' + corrections.length + ' 筆修正紀錄');
  corrections.forEach((c, i) => {
    Logger.log('  #' + (i+1) + ' subject=' + String(c.subject).substring(0, 50) + ' aiName=' + c.aiName + ' finalName=' + c.finalName);
  });

  if (corrections.length < 3) {
    try {
      SpreadsheetApp.getUi().alert('📝 學習紀錄整理',
        '目前只有 ' + corrections.length + ' 筆修正紀錄，建議累積至少 3 筆再整理。',
        SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) { Logger.log('修正紀錄不足，跳過整理'); }
    return;
  }

  // 組裝修正紀錄文字
  const correctionText = corrections.map((c, i) => {
    let line = (i + 1) + '. 信件主旨:「' + c.subject + '」';
    if (c.aiCode !== c.finalCode) line += '\n   收發碼修正: ' + c.aiCode + ' → ' + c.finalCode;
    if (c.aiName !== c.finalName) line += '\n   語義名修正: 「' + c.aiName + '」→「' + c.finalName + '」';
    if (c.reason) line += '\n   原因: ' + c.reason;
    return line;
  }).join('\n\n');

  // 呼叫 LLM 做歸納（使用 Gemini Pro）
  const consolidationPrompt = `你是 IP Winner 智財事務所的 email 分類系統開發者。
以下是使用者對 LLM 分類結果的修正紀錄。請分析這些修正，歸納出通用規則。

## 修正紀錄
${correctionText}

## 任務
1. 分析上述修正紀錄，找出重複出現的模式
2. 歸納出 LLM 在分類/命名時應該遵守的規則（每條規則用一行描述）
3. 只產出「新規則」，不要重複已知的基本規則
4. 每條規則要具體、可操作（例如：「TA 委託信中 by [日期] 是我方期限，必須加入語義名」）

## 輸出格式（只回 JSON）
{
  "rules": [
    {
      "category": "期限選擇 | 語義名命名 | 收發碼判定 | 歸檔 | 其他",
      "rule": "具體規則描述",
      "examples": "來源修正紀錄的簡短引用"
    }
  ],
  "summary": "整體修正趨勢的一句話摘要"
}`;

  const response = _callConsolidationModel(consolidationPrompt);

  const respCode = response.getResponseCode();
  const respText = response.getContentText();
  Logger.log('📡 Consolidation LLM 回應碼: ' + respCode);
  Logger.log('📡 Consolidation LLM 回應（前 500 字）: ' + respText.substring(0, 500));

  if (respCode !== 200) {
    Logger.log('❌ 學習整理 LLM 呼叫失敗: ' + respCode + ' / ' + respText.substring(0, 300));
    try {
      SpreadsheetApp.getUi().alert('❌ LLM 呼叫失敗', '錯誤碼: ' + respCode, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e) {}
    return;
  }

  let result;
  try {
    const respJson = JSON.parse(respText);
    Logger.log('📡 Consolidation candidates 數: ' + (respJson.candidates ? respJson.candidates.length : 'N/A'));
    if (respJson.candidates && respJson.candidates[0]) {
      const finishReason = respJson.candidates[0].finishReason;
      Logger.log('📡 Consolidation finishReason: ' + finishReason);
    }
    const text = respJson.candidates[0].content.parts[0].text;
    Logger.log('📡 Consolidation LLM 產出文字（前 300 字）: ' + text.substring(0, 300));
    result = JSON.parse(text);
    Logger.log('📡 Consolidation 解析成功，rules 數: ' + (result.rules ? result.rules.length : 0));
  } catch (e) {
    Logger.log('❌ 學習整理解析失敗: ' + e.message);
    Logger.log('❌ 原始回應全文: ' + respText.substring(0, 2000));
    try {
      SpreadsheetApp.getUi().alert('❌ 解析失敗', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (e2) {}
    return;
  }

  // 寫入 Prompt Doc
  const doc = _getOrCreatePromptDoc();
  const body = doc.getBody();

  // 找到「待整理學習紀錄」標題，在它前面插入「已合併規則」
  const searchResult = body.findText('待整理學習紀錄');
  if (searchResult) {
    const element = searchResult.getElement().getParent();
    const index = body.getChildIndex(element);

    // 在「待整理學習紀錄」前插入合併結果
    const dateStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    body.insertParagraph(index, '').setAttributes({});
    body.insertParagraph(index + 1, '已合併規則 (' + dateStr + ')')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.insertParagraph(index + 2, '摘要: ' + (result.summary || ''))
      .setItalic(true);

    let insertIdx = index + 3;
    if (result.rules && result.rules.length > 0) {
      result.rules.forEach(r => {
        const ruleText = '• [' + r.category + '] ' + r.rule + (r.examples ? '（例: ' + r.examples + '）' : '');
        body.insertParagraph(insertIdx, ruleText).setFontSize(10);
        insertIdx++;
      });
    }
  }

  // 清空「待整理學習紀錄」底下的舊紀錄，標記為已整理
  const pendingSearch = body.findText('待整理學習紀錄');
  if (pendingSearch) {
    const pendingElement = pendingSearch.getElement().getParent();
    const pendingIndex = body.getChildIndex(pendingElement);
    // 刪除標題之後的所有內容（除了標題本身和說明文字）
    const totalChildren = body.getNumChildren();
    // 保留: 標題(pendingIndex) + 說明(pendingIndex+1) + 空行(pendingIndex+2)
    const keepUntil = pendingIndex + 2;
    for (let i = totalChildren - 1; i > keepUntil; i--) {
      body.removeChild(body.getChild(i));
    }
    body.appendParagraph('（上次整理: ' + new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) + '，共處理 ' + corrections.length + ' 筆修正紀錄）')
      .setItalic(true).setFontSize(9);
  }

  doc.saveAndClose();

  // ── Fix 1: 歸納的規則自動寫入「分類規則」Sheet ──
  const ruleCount = result.rules ? result.rules.length : 0;
  let rulesWritten = 0;
  if (result.rules && result.rules.length > 0) {
    const ss = _getSpreadsheet();
    const rulesSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.RULES);
    if (rulesSheet) {
      // 找出現有 L{nn} 規則的最大編號
      const existingData = rulesSheet.getDataRange().getValues();
      let maxLNum = 0;
      for (let i = 1; i < existingData.length; i++) {
        const id = String(existingData[i][0] || '');
        const match = id.match(/^L(\d+)$/);
        if (match) maxLNum = Math.max(maxLNum, parseInt(match[1], 10));
      }

      // 寫入新規則
      result.rules.forEach(r => {
        maxLNum++;
        const ruleId = 'L' + String(maxLNum).padStart(2, '0');
        const category = 'LLM回饋';
        const trigger = '[' + (r.category || '其他') + '] ' + (r.rule || '');
        const action = r.rule || '';
        const example = r.examples || '';
        rulesSheet.appendRow([ruleId, category, trigger, action, example]);
        Logger.log('  📌 寫入規則 ' + ruleId + ': [' + r.category + '] ' + r.rule);
      });
      rulesWritten = result.rules.length;
      Logger.log('✅ 已將 ' + rulesWritten + ' 條規則寫入「分類規則」Sheet');
    }
  }

  // ── Fix 2: 標記已整理的修正紀錄為 consolidated ──
  const logSheet = _getSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (logSheet) {
    const logData = logSheet.getDataRange().getValues();
    // 用 subject 比對找出這批修正紀錄在 Sheet 中的位置
    const correctionSubjects = new Set(corrections.map(c => String(c.subject)));
    let marked = 0;
    for (let i = logData.length - 1; i >= 1; i--) {
      const subject = String(logData[i][2] || '');
      const correctionSource = String(logData[i][17] || '').trim();  // col 17: 修正來源 (0-based)
      const hasCorrectedName = String(logData[i][14] || '').trim();  // col 14: 修正後名稱
      const hasFinalCode = String(logData[i][13] || '').trim();      // col 13: 最終收發碼

      // 只標記有修正紀錄且尚未標記 consolidated 的
      if ((hasCorrectedName || hasFinalCode) && correctionSubjects.has(subject) && !correctionSource.includes('consolidated')) {
        const newSource = correctionSource ? correctionSource + '+consolidated' : 'consolidated';
        logSheet.getRange(i + 1, 18).setValue(newSource);  // col 18 (1-based) = col 17 (0-based)
        marked++;
      }
    }
    Logger.log('✅ 已標記 ' + marked + ' 筆修正紀錄為 consolidated');
  }

  // Log 結果
  Logger.log('✅ 學習整理完成: 從 ' + corrections.length + ' 筆修正紀錄歸納出 ' + ruleCount + ' 條規則');

  // 整理完成後排定評估測試（60 秒後）
  _scheduleOnce('runEvaluation', 60000);
  Logger.log('⏩ 已排定 runEvaluation：60 秒後自動執行評估測試');

  try {
    const url = doc.getUrl();
    SpreadsheetApp.getUi().alert('✅ 學習紀錄整理完成',
      '從 ' + corrections.length + ' 筆修正紀錄歸納出 ' + ruleCount + ' 條新規則。\n\n' +
      '摘要: ' + (result.summary || '') + '\n\n' +
      '已寫入 Prompt 文件: ' + url + '\n' +
      '✅ 已寫入「分類規則」Sheet: ' + rulesWritten + ' 條（下次處理自動生效）\n' +
      '✅ 已標記相關修正紀錄為 consolidated（不再重複注入 few-shot）\n' +
      '⏩ 60 秒後自動執行評估測試',
      SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * 安裝每週學習整理排程（每週一早上 9 點）
 */
function installConsolidationTrigger() {
  // 先移除舊的
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'weeklyConsolidate')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('weeklyConsolidate')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();

  Logger.log('✅ 已安裝每週學習整理排程（每週一 9:00）');
}

/**
 * 每週自動執行：匯出 Prompt Doc + 整理學習紀錄
 */
function weeklyConsolidate() {
  Logger.log('=== 每週學習整理（自動） ===');

  // 效益統計週回顧補正
  try {
    _reconcileBenefitsStats();
  } catch (e) {
    Logger.log('⚠️ 效益統計補正失敗: ' + e.message);
  }

  // 更新修正統計
  _updateCorrectionStats();

  const corrections = _getRecentCorrections(100);
  if (corrections.length < 3) {
    Logger.log('修正紀錄不足 3 筆，跳過本週整理');
    return;
  }

  // 先匯出最新 Prompt Doc
  exportPromptDoc();
  // 再做整理合併（會自動排定 runEvaluation）
  consolidateLearning();
}


// ===================== 評估系統 =====================

/**
 * 讀取「設定」Sheet 中的指定參數值
 */
function _getSettingValue(key) {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
  if (!sheet) return '';
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) return String(data[i][1] || '').trim();
  }
  return '';
}

/**
 * 將人工修正加入黃金測試集
 * 如果 messageId 已存在則更新，否則 append
 */
function _promoteToGoldenSet(messageId, subject, sender, expectedCode, expectedName, expectedCategory, expectedCaseNumbers, correctionType) {
  if (!messageId) return;
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOLDEN_SET);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  // 檢查是否已存在
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === messageId) {
      // 更新既有列
      const row = i + 1;
      sheet.getRange(row, 5).setValue(expectedCode);
      sheet.getRange(row, 6).setValue(expectedName);
      sheet.getRange(row, 7).setValue(expectedCategory);
      sheet.getRange(row, 8).setValue(expectedCaseNumbers);
      sheet.getRange(row, 9).setValue(correctionType);
      sheet.getRange(row, 11).setValue(true);  // active
      Logger.log('🔄 黃金測試集更新: ' + messageId);
      return;
    }
  }

  // 新增
  sheet.appendRow([
    messageId,
    new Date(),
    subject,
    sender,
    expectedCode,
    expectedName,
    expectedCategory,
    expectedCaseNumbers,
    correctionType,
    '',    // lastEvalResult
    true,  // active
  ]);
  Logger.log('✅ 黃金測試集新增: ' + messageId + ' (' + correctionType + ')');
}

/**
 * 清理黃金測試集：移除已刪除信件、控制總數
 */
function _cleanGoldenSet() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOLDEN_SET);
  if (!sheet || sheet.getLastRow() <= 1) return;

  const data = sheet.getDataRange().getValues();
  let deactivated = 0;

  // 標記已刪除信件為 inactive
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][10]) !== 'true' && data[i][10] !== true) continue;
    const messageId = String(data[i][0]).trim();
    try {
      const msg = GmailApp.getMessageById(messageId);
      if (!msg) {
        sheet.getRange(i + 1, 11).setValue(false);
        deactivated++;
      }
    } catch (e) {
      sheet.getRange(i + 1, 11).setValue(false);
      deactivated++;
    }
  }
  if (deactivated > 0) Logger.log('🧹 黃金測試集清理: ' + deactivated + ' 筆已刪除信件設為 inactive');

  // 超過上限 → 移除「最近 5 次都 pass」的最舊案例
  const freshData = sheet.getDataRange().getValues();
  let activeCount = 0;
  for (let i = 1; i < freshData.length; i++) {
    if (String(freshData[i][10]) === 'true' || freshData[i][10] === true) activeCount++;
  }

  if (activeCount > CONFIG.GOLDEN_SET_MAX) {
    const evalSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.EVAL_RUNS);
    const passHistory = _getPassHistory(evalSheet);
    let removed = 0;

    for (let i = 1; i < freshData.length && activeCount > CONFIG.GOLDEN_SET_MAX; i++) {
      if (String(freshData[i][10]) !== 'true' && freshData[i][10] !== true) continue;
      const msgId = String(freshData[i][0]).trim();
      if (passHistory[msgId] && passHistory[msgId] >= 5) {
        sheet.getRange(i + 1, 11).setValue(false);
        activeCount--;
        removed++;
      }
    }
    if (removed > 0) Logger.log('🧹 黃金測試集瘦身: 移除 ' + removed + ' 筆（連續 5 次 pass）');
  }
}

/**
 * 統計每個 messageId 在最近評估中連續 pass 的次數
 */
function _getPassHistory(evalSheet) {
  const history = {};
  if (!evalSheet || evalSheet.getLastRow() <= 1) return history;

  const data = evalSheet.getDataRange().getValues();
  // 從新到舊遍歷 summary rows 找最近 5 次的 runId
  const runIds = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][2]) === '__SUMMARY__' && runIds.length < 5) {
      runIds.push(String(data[i][0]));
    }
  }

  // 統計每個 messageId 在這些 run 中是否 pass
  for (let i = 1; i < data.length; i++) {
    const runId = String(data[i][0]);
    const msgId = String(data[i][2]);
    if (msgId === '__SUMMARY__' || !runIds.includes(runId)) continue;
    if (String(data[i][12]) === 'pass') {
      history[msgId] = (history[msgId] || 0) + 1;
    }
  }
  return history;
}

/**
 * 從既有處理紀錄中匯入黃金測試集（一次性初始化工具）
 */
function seedGoldenSetFromExisting() {
  const ss = _getSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!logSheet || logSheet.getLastRow() <= 1) {
    try { SpreadsheetApp.getUi().alert('處理紀錄為空，無法匯入'); } catch (e) {}
    return;
  }

  const data = logSheet.getDataRange().getValues();
  let imported = 0;

  for (let i = 1; i < data.length; i++) {
    const finalCode = String(data[i][13] || '').trim();
    const correctedName = String(data[i][14] || '').trim();
    if (!finalCode && !correctedName) continue;

    const messageId = String(data[i][0]).trim();
    const subject = String(data[i][2] || '');
    const sender = String(data[i][3] || '');
    const code = finalCode || String(data[i][4] || '');
    const name = correctedName || String(data[i][8] || '');
    const category = String(data[i][10] || '');
    const caseNums = String(data[i][6] || '');

    let type = 'confirmed';
    if (finalCode && correctedName) type = 'both';
    else if (finalCode) type = 'code';
    else if (correctedName) type = 'name';

    _promoteToGoldenSet(messageId, subject, sender, code, name, category, caseNums, type);
    imported++;
  }

  const msg = '已從處理紀錄匯入 ' + imported + ' 筆到黃金測試集';
  Logger.log('✅ ' + msg);
  try {
    SpreadsheetApp.getUi().alert('✅ 匯入完成', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * 評估引擎主進入點
 * 讀取黃金測試集，用當前 prompt 重跑 LLM，比對結果
 */
function runEvaluation() {
  Logger.log('=== 評估測試 ===');
  const startTime = Date.now();

  _cleanGoldenSet();

  const ss = _getSpreadsheet();
  const gsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOLDEN_SET);
  if (!gsSheet || gsSheet.getLastRow() <= 1) {
    Logger.log('黃金測試集為空，跳過評估');
    try { SpreadsheetApp.getUi().alert('黃金測試集為空，請先執行回授偵測或匯入測試資料'); } catch (e) {}
    return;
  }

  const gsData = gsSheet.getDataRange().getValues();
  const activeCases = [];
  for (let i = 1; i < gsData.length; i++) {
    if (String(gsData[i][10]) === 'true' || gsData[i][10] === true) {
      activeCases.push({ row: i + 1, data: gsData[i] });
    }
  }

  if (activeCases.length === 0) {
    Logger.log('沒有 active 的測試案例');
    try { SpreadsheetApp.getUi().alert('黃金測試集沒有 active 案例'); } catch (e) {}
    return;
  }

  Logger.log('評估案例數: ' + activeCases.length);

  const runId = 'eval-' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd-HHmm');
  const runDate = new Date();
  const evalSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.EVAL_RUNS);
  if (!evalSheet) return;

  const senderMap = _loadSenderMap();
  const corrections = _getRecentCorrections(20);
  const templates = _loadTemplates();

  // 統計
  let totalCases = 0, codeCorrect = 0, nameScoreSum = 0, nameExact = 0, catCorrect = 0, overallPass = 0;
  const detailRows = [];

  // 分批處理
  for (let batchStart = 0; batchStart < activeCases.length; batchStart += CONFIG.EVAL_BATCH_SIZE) {
    // 時間安全閾值：4 分鐘
    if (Date.now() - startTime > 4 * 60 * 1000) {
      Logger.log('⏱️ 已超過 4 分鐘，停止評估（已完成 ' + totalCases + '/' + activeCases.length + '）');
      break;
    }

    const batch = activeCases.slice(batchStart, batchStart + CONFIG.EVAL_BATCH_SIZE);
    const preprocessedList = [];

    for (const gc of batch) {
      const messageId = String(gc.data[0]).trim();
      try {
        const message = GmailApp.getMessageById(messageId);
        if (!message) {
          Logger.log('⚠️ 信件已刪除: ' + messageId);
          continue;
        }
        const preprocessed = _preprocessMessage(message, senderMap);
        preprocessed._goldenCase = gc;
        preprocessedList.push(preprocessed);
      } catch (e) {
        Logger.log('⚠️ 讀取信件失敗: ' + messageId + ' - ' + e.message);
      }
    }

    if (preprocessedList.length === 0) continue;

    // 呼叫 LLM（重用現有 pipeline）
    const llmResults = _callGeminiBatch(preprocessedList, corrections, templates);

    for (let j = 0; j < preprocessedList.length; j++) {
      const preprocessed = preprocessedList[j];
      const llmResult = llmResults[j];
      const gc = preprocessed._goldenCase;

      const finalResult = _determineFinalResult(preprocessed, llmResult, null);  // 評估不套用 thread 修正
      const evalResult = _evaluateSingleCase(finalResult, llmResult, gc.data);

      detailRows.push([
        runId, runDate, String(gc.data[0]).trim(),
        evalResult.expectedCode, evalResult.actualCode, evalResult.codeMatch,
        evalResult.expectedName, evalResult.actualName, evalResult.nameScore,
        evalResult.expectedCategory, evalResult.actualCategory, evalResult.categoryMatch,
        evalResult.overallResult, evalResult.notes,
      ]);

      totalCases++;
      if (evalResult.codeMatch) codeCorrect++;
      nameScoreSum += evalResult.nameScore;
      if (evalResult.nameScore >= 0.99) nameExact++;
      if (evalResult.categoryMatch) catCorrect++;
      if (evalResult.overallResult === 'pass') overallPass++;

      // 更新 golden set 的 lastEvalResult
      gsSheet.getRange(gc.row, 10).setValue(evalResult.overallResult);
    }
  }

  // 寫入 detail rows
  if (detailRows.length > 0) {
    evalSheet.getRange(evalSheet.getLastRow() + 1, 1, detailRows.length, detailRows[0].length)
      .setValues(detailRows);
  }

  // 寫入 summary row
  const codeAccuracy = totalCases > 0 ? Math.round(codeCorrect / totalCases * 1000) / 10 : 0;
  const nameAvgScore = totalCases > 0 ? Math.round(nameScoreSum / totalCases * 100) / 100 : 0;
  const nameExactPct = totalCases > 0 ? Math.round(nameExact / totalCases * 1000) / 10 : 0;
  const catAccuracy = totalCases > 0 ? Math.round(catCorrect / totalCases * 1000) / 10 : 0;
  const overallPassRate = totalCases > 0 ? Math.round(overallPass / totalCases * 1000) / 10 : 0;

  const regressionDetected = _checkRegression(runId, evalSheet, overallPassRate, codeAccuracy);

  const summaryRow = [
    runId, runDate, '__SUMMARY__',
    totalCases, codeAccuracy, '',
    nameAvgScore, '', nameExactPct,
    catAccuracy, '', '',
    overallPassRate, regressionDetected ? 'TRUE' : 'FALSE',
  ];
  const summaryRowNum = evalSheet.getLastRow() + 1;
  evalSheet.getRange(summaryRowNum, 1, 1, summaryRow.length).setValues([summaryRow]);

  // 如果有退步 → 標紅
  if (regressionDetected) {
    evalSheet.getRange(summaryRowNum, 1, 1, summaryRow.length).setBackground('#f4cccc');
  }

  const msg = '評估完成\n\n' +
    '測試案例: ' + totalCases + ' 筆\n' +
    '收發碼準確率: ' + codeAccuracy + '%\n' +
    '語義名平均分: ' + nameAvgScore + '\n' +
    '語義名完全匹配: ' + nameExactPct + '%\n' +
    '類別準確率: ' + catAccuracy + '%\n' +
    '整體通過率: ' + overallPassRate + '%\n' +
    (regressionDetected ? '\n⚠️ 偵測到退步！已標紅並通知' : '');

  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('🧪 評估測試結果', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * 評估單一案例：比對 LLM 結果與黃金答案
 */
function _evaluateSingleCase(finalResult, llmResult, goldenData) {
  const expectedCode = String(goldenData[4] || '').trim();
  const expectedName = String(goldenData[5] || '').trim();
  const expectedCategory = String(goldenData[6] || '').trim();

  const actualCode = finalResult.sendReceiveCode || '';
  const actualName = llmResult.emlFilename || '';
  const actualCategory = finalResult.caseCategory || '';

  const codeMatch = expectedCode ? (actualCode === expectedCode) : true;
  const nameScore = expectedName ? _computeNameSimilarity(expectedName, actualName) : 1.0;
  const categoryMatch = expectedCategory ? (actualCategory === expectedCategory) : true;

  let overallResult = 'fail';
  if (codeMatch && nameScore >= 0.8 && categoryMatch) {
    overallResult = 'pass';
  } else if ((codeMatch || nameScore >= 0.5) && categoryMatch) {
    overallResult = 'partial';
  }

  const notes = [];
  if (!codeMatch && expectedCode) notes.push('碼:' + expectedCode + '→' + actualCode);
  if (nameScore < 0.8 && expectedName) notes.push('名:' + Math.round(nameScore * 100) + '%');
  if (!categoryMatch && expectedCategory) notes.push('類:' + expectedCategory + '→' + actualCategory);

  return {
    expectedCode, actualCode, codeMatch,
    expectedName, actualName, nameScore,
    expectedCategory, actualCategory, categoryMatch,
    overallResult,
    notes: notes.join('; '),
  };
}

/**
 * 語義名相似度計算（輕量 token 比較，不呼叫 LLM）
 *
 * 1. 完全相同 → 1.0
 * 2. 正規化：移除日期後綴（-期限X/XX）、空白
 * 3. 拆 token（用 -()（）ー 分割）
 * 4. 計算 Jaccard similarity
 * 5. 前綴相同 → +0.2 bonus
 */
function _computeNameSimilarity(expected, actual) {
  if (!expected || !actual) return 0;
  if (expected === actual) return 1.0;

  // 正規化：移除日期後綴、空白
  function normalize(s) {
    return s
      .replace(/-(?:期限|建議|通知官方期限|預計)\d+[/_]\d+.*$/, '')
      .replace(/\s+/g, '');
  }

  const normExp = normalize(expected);
  const normAct = normalize(actual);
  if (normExp === normAct) return 1.0;

  // 拆 token
  function tokenize(s) {
    return s.split(/[-()（）ー]/).filter(t => t.length > 0);
  }

  const tokensA = tokenize(normExp);
  const tokensB = tokenize(normAct);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Jaccard similarity
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  let score = union > 0 ? intersection / union : 0;

  // 前綴 bonus
  if (tokensA[0] === tokensB[0]) {
    score = Math.min(1.0, score + 0.2);
  }

  return Math.round(score * 100) / 100;
}

/**
 * 迴歸偵測：比較最近兩次評估的 summary
 * @return {boolean} 是否偵測到退步
 */
function _checkRegression(currentRunId, evalSheet, currentPassRate, currentCodeAccuracy) {
  if (!evalSheet || evalSheet.getLastRow() <= 1) return false;

  const data = evalSheet.getDataRange().getValues();
  // 找最近一次非當前的 summary row
  let previousSummary = null;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][2]) === '__SUMMARY__' && String(data[i][0]) !== currentRunId) {
      previousSummary = data[i];
      break;
    }
  }

  if (!previousSummary) return false;  // 第一次跑，無前次可比

  const prevPassRate = parseFloat(previousSummary[12]) || 0;
  const prevCodeAccuracy = parseFloat(previousSummary[4]) || 0;

  const passRateDrop = prevPassRate - currentPassRate;
  const codeAccuracyDrop = prevCodeAccuracy - currentCodeAccuracy;

  const regression =
    passRateDrop > CONFIG.REGRESSION_THRESHOLD_PP ||
    codeAccuracyDrop > CONFIG.CODE_REGRESSION_THRESHOLD_PP ||
    currentPassRate < CONFIG.MIN_PASS_RATE;

  if (regression) {
    Logger.log('⚠️ 迴歸偵測觸發: 通過率 ' + prevPassRate + '% → ' + currentPassRate + '%, 碼準確率 ' + prevCodeAccuracy + '% → ' + currentCodeAccuracy + '%');
    _sendRegressionAlert(
      { passRate: currentPassRate, codeAccuracy: currentCodeAccuracy },
      { passRate: prevPassRate, codeAccuracy: prevCodeAccuracy }
    );
  }

  return regression;
}

/**
 * 寄出迴歸警報 email
 */
function _sendRegressionAlert(current, previous) {
  const recipients = _getSettingValue('評估通知 Email');
  if (!recipients) {
    Logger.log('⚠️ 未設定「評估通知 Email」，只標紅 Sheet，不寄 email');
    return;
  }

  const ss = _getSpreadsheet();
  const sheetUrl = ss.getUrl();

  const body =
    'IP Winner 分類評估偵測到退步：\n\n' +
    '整體通過率: ' + previous.passRate + '% → ' + current.passRate + '%' +
    (previous.passRate - current.passRate > 0 ? ' (↓' + (previous.passRate - current.passRate).toFixed(1) + 'pp)' : '') + '\n' +
    '收發碼準確率: ' + previous.codeAccuracy + '% → ' + current.codeAccuracy + '%' +
    (previous.codeAccuracy - current.codeAccuracy > 0 ? ' (↓' + (previous.codeAccuracy - current.codeAccuracy).toFixed(1) + 'pp)' : '') + '\n\n' +
    '請檢查評估紀錄：' + sheetUrl;

  recipients.split(',').forEach(function(email) {
    email = email.trim();
    if (email) {
      try {
        MailApp.sendEmail(email, '⚠️ IP Winner 分類評估退步', body);
        Logger.log('📧 已寄出迴歸警報至: ' + email);
      } catch (e) {
        Logger.log('❌ 寄信失敗: ' + email + ' - ' + e.message);
      }
    }
  });
}

/**
 * 修正統計：統計過去 7 天的修正數量，寫入修正統計 Sheet
 */
function _updateCorrectionStats() {
  const ss = _getSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  const statsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CORRECTION_STATS);
  if (!logSheet || !statsSheet) return;

  const data = logSheet.getDataRange().getValues();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 計算本週一的日期
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const weekStart = Utilities.formatDate(monday, 'Asia/Taipei', 'yyyy-MM-dd');

  let totalProcessed = 0, totalCorrections = 0, codeCorrections = 0, nameCorrections = 0;

  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][1];
    if (!(rowDate instanceof Date)) continue;
    if (rowDate < weekAgo) continue;

    totalProcessed++;

    const finalCode = String(data[i][13] || '').trim();
    const aiCode = String(data[i][4] || '').trim();
    const correctedName = String(data[i][14] || '').trim();

    if (finalCode && finalCode !== aiCode) {
      codeCorrections++;
      totalCorrections++;
    }
    if (correctedName) {
      nameCorrections++;
      totalCorrections++;
    }
  }

  const codeErrorRate = totalProcessed > 0 ? Math.round(codeCorrections / totalProcessed * 1000) / 10 : 0;
  const nameErrorRate = totalProcessed > 0 ? Math.round(nameCorrections / totalProcessed * 1000) / 10 : 0;

  // 檢查是否已有本週的統計（避免重複）
  const statsData = statsSheet.getDataRange().getValues();
  for (let i = 1; i < statsData.length; i++) {
    if (String(statsData[i][0]).trim() === weekStart) {
      // 更新既有行
      const row = i + 1;
      statsSheet.getRange(row, 2, 1, 6).setValues([[
        totalProcessed, totalCorrections,
        codeCorrections, nameCorrections,
        codeErrorRate, nameErrorRate,
      ]]);
      Logger.log('✅ 修正統計已更新: ' + weekStart);
      return;
    }
  }

  // 新增行
  statsSheet.appendRow([
    weekStart, totalProcessed, totalCorrections,
    codeCorrections, nameCorrections,
    codeErrorRate, nameErrorRate,
  ]);
  Logger.log('✅ 修正統計已新增: ' + weekStart);
}

/**
 * 查看最近 5 次評估 summary（選單 UI）
 */
function showEvalHistory() {
  const ss = _getSpreadsheet();
  const evalSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.EVAL_RUNS);
  if (!evalSheet || evalSheet.getLastRow() <= 1) {
    try { SpreadsheetApp.getUi().alert('尚無評估紀錄'); } catch (e) { Logger.log('尚無評估紀錄'); }
    return;
  }

  const data = evalSheet.getDataRange().getValues();
  const summaries = [];
  for (let i = data.length - 1; i >= 1 && summaries.length < 5; i--) {
    if (String(data[i][2]) === '__SUMMARY__') {
      summaries.push(data[i]);
    }
  }

  if (summaries.length === 0) {
    try { SpreadsheetApp.getUi().alert('尚無評估 summary'); } catch (e) {}
    return;
  }

  const lines = summaries.map(function(s) {
    const date = s[1] instanceof Date
      ? Utilities.formatDate(s[1], 'Asia/Taipei', 'MM/dd HH:mm')
      : String(s[1]).substring(0, 16);
    return date + '  通過:' + s[12] + '%  碼:' + s[4] + '%  名:' + s[6] + '  類:' + s[9] + '%' +
      (String(s[13]) === 'TRUE' ? '  ⚠️退步' : '');
  });

  const msg = '最近 ' + summaries.length + ' 次評估:\n\n' + lines.join('\n');
  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('📊 評估歷史', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}
}

/**
 * Consolidation 專用 model 呼叫（Gemini Pro）
 */
function _callConsolidationModel(prompt) {
  const apiKey = getApiKey();
  const endpoint = CONFIG.GEMINI_ENDPOINT + CONFIG.GEMINI_CONSOLIDATION_MODEL + ':generateContent?key=' + apiKey;

  Logger.log('📡 Consolidation 使用模型: ' + CONFIG.GEMINI_CONSOLIDATION_MODEL);

  return UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
    muteHttpExceptions: true,
  });
}


// ===================== 效益統計 =====================

/**
 * 取得或建立「效益統計」Sheet，回傳 Sheet 物件
 */
function _getOrCreateBenefitsSheet() {
  const ss = _getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BENEFITS);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAMES.BENEFITS);
    sheet.appendRow([
      '日期', '處理封數', '省下時間(分鐘)', '省下時間(小時)',
      'Input Tokens', 'Output Tokens', 'API 成本(USD)',
      '累計處理封數', '累計省下時間(小時)', '累計 API 成本(USD)',
    ]);
    sheet.getRange('1:1').setFontWeight('bold').setBackground('#6d9eeb').setFontColor('white');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 80);
    sheet.setColumnWidth(3, 110);
    sheet.setColumnWidth(4, 110);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 100);
    sheet.setColumnWidth(7, 110);
    sheet.setColumnWidth(8, 110);
    sheet.setColumnWidth(9, 140);
    sheet.setColumnWidth(10, 130);
    Logger.log('✅ 建立「效益統計」Sheet');
  }
  return sheet;
}

/**
 * 每批處理後更新效益統計
 * @param {number} processed - 本批處理封數
 * @param {number} inputTokens - 本批 input token 用量
 * @param {number} outputTokens - 本批 output token 用量
 */
function _updateBenefitsStats(processed, inputTokens, outputTokens) {
  if (processed <= 0) return;

  const sheet = _getOrCreateBenefitsSheet();
  const today = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');

  // 讀取人工基準分鐘數
  const manualMinutes = parseFloat(_getSettingValue('MANUAL_MINUTES_PER_EMAIL')) || 5.5;

  // 計算本批數值
  const savedMinutes = processed * manualMinutes;
  const apiCost = inputTokens * CONFIG.GEMINI_INPUT_PRICE_PER_TOKEN
                + outputTokens * CONFIG.GEMINI_OUTPUT_PRICE_PER_TOKEN;

  // 找今天的行
  const data = sheet.getDataRange().getValues();
  let todayRow = -1;
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][0] instanceof Date
      ? Utilities.formatDate(data[i][0], 'Asia/Taipei', 'yyyy-MM-dd')
      : String(data[i][0]).trim();
    if (rowDate === today) {
      todayRow = i + 1; // 1-based row number
      break;
    }
  }

  if (todayRow > 0) {
    // 累加到既有行
    const existing = sheet.getRange(todayRow, 1, 1, 7).getValues()[0];
    sheet.getRange(todayRow, 2).setValue((existing[1] || 0) + processed);
    sheet.getRange(todayRow, 3).setValue((existing[2] || 0) + savedMinutes);
    sheet.getRange(todayRow, 4).setValue(((existing[2] || 0) + savedMinutes) / 60);
    sheet.getRange(todayRow, 5).setValue((existing[4] || 0) + inputTokens);
    sheet.getRange(todayRow, 6).setValue((existing[5] || 0) + outputTokens);
    sheet.getRange(todayRow, 7).setValue((existing[6] || 0) + apiCost);
  } else {
    // 新增今天的行
    sheet.appendRow([
      today, processed, savedMinutes, savedMinutes / 60,
      inputTokens, outputTokens, apiCost,
      0, 0, 0, // 累計欄位稍後重算
    ]);
  }

  // 重算所有累計欄位
  _recalcBenefitsCumulatives(sheet);
  Logger.log('📈 效益統計已更新：+' + processed + ' 封，省下 ' + (savedMinutes / 60).toFixed(1) + ' 小時');
}

/**
 * 重算效益統計的累計欄位（col 8-10）
 */
function _recalcBenefitsCumulatives(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let cumProcessed = 0, cumHours = 0, cumCost = 0;

  for (let i = 0; i < data.length; i++) {
    cumProcessed += (data[i][1] || 0);
    cumHours += (data[i][3] || 0);
    cumCost += (data[i][6] || 0);
    sheet.getRange(i + 2, 8).setValue(cumProcessed);
    sheet.getRange(i + 2, 9).setValue(Math.round(cumHours * 100) / 100);
    sheet.getRange(i + 2, 10).setValue(Math.round(cumCost * 10000) / 10000);
  }
}

/**
 * 週回顧補正：掃描 LOG Sheet 本週紀錄，修正效益統計
 */
function _reconcileBenefitsStats() {
  Logger.log('=== 效益統計週回顧補正 ===');

  const ss = _getSpreadsheet();
  const logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!logSheet || logSheet.getLastRow() <= 1) return;

  const logData = logSheet.getDataRange().getValues();
  const manualMinutes = parseFloat(_getSettingValue('MANUAL_MINUTES_PER_EMAIL')) || 5.5;

  // 計算本週日期範圍（往前 7 天）
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = Utilities.formatDate(weekAgo, 'Asia/Taipei', 'yyyy-MM-dd');

  // 從 LOG 按日期分組統計
  const dailyFromLog = {}; // { 'yyyy-MM-dd': { count, inputTokens, outputTokens } }

  for (let i = 1; i < logData.length; i++) {
    const dateVal = logData[i][1]; // col 1: 日期
    if (!dateVal) continue;

    let dateStr;
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, 'Asia/Taipei', 'yyyy-MM-dd');
    } else {
      dateStr = String(dateVal).trim().substring(0, 10);
    }

    if (dateStr < weekAgoStr) continue;

    // 排除失敗/放棄的紀錄
    const aiName = String(logData[i][8] || '');
    if (aiName.startsWith('[失敗:') || aiName.startsWith('[放棄]')) continue;

    if (!dailyFromLog[dateStr]) {
      dailyFromLog[dateStr] = { count: 0, inputTokens: 0, outputTokens: 0 };
    }
    dailyFromLog[dateStr].count++;
    dailyFromLog[dateStr].inputTokens += (Number(logData[i][19]) || 0);  // col 19: Input Tokens
    dailyFromLog[dateStr].outputTokens += (Number(logData[i][20]) || 0); // col 20: Output Tokens
  }

  // 對比效益統計 Sheet
  const benefitsSheet = _getOrCreateBenefitsSheet();
  const benefitsData = benefitsSheet.getDataRange().getValues();
  const existingDates = {};
  for (let i = 1; i < benefitsData.length; i++) {
    const d = benefitsData[i][0] instanceof Date
      ? Utilities.formatDate(benefitsData[i][0], 'Asia/Taipei', 'yyyy-MM-dd')
      : String(benefitsData[i][0]).trim();
    existingDates[d] = i + 1; // 1-based row
  }

  let corrected = 0;
  for (const dateStr in dailyFromLog) {
    const logStats = dailyFromLog[dateStr];
    const savedMinutes = logStats.count * manualMinutes;
    const apiCost = logStats.inputTokens * CONFIG.GEMINI_INPUT_PRICE_PER_TOKEN
                  + logStats.outputTokens * CONFIG.GEMINI_OUTPUT_PRICE_PER_TOKEN;

    if (existingDates[dateStr]) {
      // 對比，有差異就修正
      const row = existingDates[dateStr];
      const existing = benefitsSheet.getRange(row, 1, 1, 7).getValues()[0];
      if (Math.abs((existing[1] || 0) - logStats.count) > 0 ||
          Math.abs((existing[4] || 0) - logStats.inputTokens) > 0) {
        benefitsSheet.getRange(row, 2).setValue(logStats.count);
        benefitsSheet.getRange(row, 3).setValue(savedMinutes);
        benefitsSheet.getRange(row, 4).setValue(savedMinutes / 60);
        benefitsSheet.getRange(row, 5).setValue(logStats.inputTokens);
        benefitsSheet.getRange(row, 6).setValue(logStats.outputTokens);
        benefitsSheet.getRange(row, 7).setValue(apiCost);
        corrected++;
      }
    } else {
      // 缺漏：新增
      benefitsSheet.appendRow([
        dateStr, logStats.count, savedMinutes, savedMinutes / 60,
        logStats.inputTokens, logStats.outputTokens, apiCost,
        0, 0, 0,
      ]);
      corrected++;
    }
  }

  // 按日期排序（跳過表頭）
  if (benefitsSheet.getLastRow() > 2) {
    benefitsSheet.getRange(2, 1, benefitsSheet.getLastRow() - 1, 10)
      .sort({ column: 1, ascending: true });
  }

  // 重算累計
  _recalcBenefitsCumulatives(benefitsSheet);

  Logger.log('📈 效益統計補正完成：修正 ' + corrected + ' 天的數據');
}


// ===================== 統計 =====================

function showStats() {
  const ss = _getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet || sheet.getLastRow() <= 1) {
    try { SpreadsheetApp.getUi().alert('尚無處理紀錄'); } catch (e) { Logger.log('尚無處理紀錄'); }
    return;
  }

  const data = sheet.getDataRange().getValues();
  const codeCounts = {};
  let total = 0, pending = 0, withCustomerName = 0;

  for (let i = 1; i < data.length; i++) {
    total++;
    const code = String(data[i][4]).trim();
    codeCounts[code] = (codeCounts[code] || 0) + 1;
    if (String(data[i][11]).trim() === 'pending') pending++;    // col 11: 來源確認狀態
    if (String(data[i][14] || '').trim()) withCustomerName++;  // col 14: 修正後名稱
  }

  const codeStats = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => c + ': ' + n + ' 封')
    .join('\n');

  let msg = '📊 處理統計\n\n' +
    '總計: ' + total + ' 封\n' +
    '待確認來源: ' + pending + ' 封\n' +
    '客戶已改名: ' + withCustomerName + ' 筆\n\n' +
    '收發碼分布:\n' + codeStats;

  // 效益統計區塊
  const benefitsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.BENEFITS);
  if (benefitsSheet && benefitsSheet.getLastRow() > 1) {
    const bData = benefitsSheet.getRange(2, 1, benefitsSheet.getLastRow() - 1, 10).getValues();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = Utilities.formatDate(weekAgo, 'Asia/Taipei', 'yyyy-MM-dd');
    const monthStart = Utilities.formatDate(now, 'Asia/Taipei', 'yyyy-MM') + '-01';

    // 即時讀取當前設定值，用封數 × 設定值計算省下時間（不用 Sheet 裡寫死的舊值）
    const currentManualMinutes = parseFloat(_getSettingValue('MANUAL_MINUTES_PER_EMAIL')) || 5.5;

    let weekProcessed = 0, monthProcessed = 0, monthCost = 0;
    let totalProcessed = 0;

    for (let i = 0; i < bData.length; i++) {
      const d = bData[i][0] instanceof Date
        ? Utilities.formatDate(bData[i][0], 'Asia/Taipei', 'yyyy-MM-dd')
        : String(bData[i][0]).trim();
      const rowProcessed = bData[i][1] || 0;
      const rowCost = bData[i][6] || 0;

      totalProcessed += rowProcessed;
      if (d >= weekAgoStr) weekProcessed += rowProcessed;
      if (d >= monthStart) {
        monthProcessed += rowProcessed;
        monthCost += rowCost;
      }
    }

    const weekHours = weekProcessed * currentManualMinutes / 60;
    const monthHours = monthProcessed * currentManualMinutes / 60;
    const cumHours = totalProcessed * currentManualMinutes / 60;

    msg += '\n\n📈 自動化效益（基準: ' + currentManualMinutes + ' 分鐘/封）\n' +
      '本週：處理 ' + weekProcessed + ' 封，省下 ' + weekHours.toFixed(1) + ' 小時\n' +
      '本月：處理 ' + monthProcessed + ' 封，省下 ' + monthHours.toFixed(1) + ' 小時\n' +
      '累計至今：處理 ' + totalProcessed + ' 封，省下 ' + cumHours.toFixed(1) + ' 小時\n' +
      '本月 API 成本：$' + monthCost.toFixed(2) + ' USD';
  }

  Logger.log(msg);
  try {
    SpreadsheetApp.getUi().alert('📊 處理統計', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) { /* 從編輯器呼叫時沒有 UI，已有 Logger */ }
}


// ===================== 排程 =====================

/** 安裝每日排程：早上 7-8 點執行 */
function installTrigger() {
  removeTrigger();
  ScriptApp.newTrigger('processEmails')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('Asia/Taipei')
    .create();

  Logger.log('✅ 已安裝每日排程（每天早上 7:00-8:00 台北時間）');
  try {
    SpreadsheetApp.getUi().alert('✅ 已安裝每日排程\n\n每天早上 7:00-8:00（台北時間）自動執行');
  } catch (e) { /* 從編輯器呼叫 */ }
}

function removeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'processEmails')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

// ===================== doGet — HTTP Trigger for Automated Testing =====================

/**
 * Web App 入口：透過 HTTP GET 觸發任何函式
 *
 * 用法：curl -sL "https://script.google.com/macros/s/{DEPLOY_ID}/exec?action=ping"
 *
 * 部署：Apps Script Editor → 部署 → 新增部署 → 網頁應用程式
 *       執行身分：我 / 存取權限：只有自己
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var params = (e && e.parameter) || {};
  var result;
  var startTime = new Date();
  try {
    switch(action) {
      // === 核心函式 ===
      case 'trialRun':
        // 繞過 UI prompt，直接呼叫底層 _processEmailBatch
        var query = params.query || '';
        var limit = parseInt(params.limit) || 50;
        result = _processEmailBatch(query, limit, true);
        break;
      case 'runFeedback':        result = runFeedback(); break;
      case 'processEmails':
        // 注意：processEmails 會 schedule 後續 trigger
        result = _processEmailBatch(params.query || '', parseInt(params.limit) || 20, true);
        break;
      case 'setupAll':           setupAll(); result = {status: 'success', note: 'setupAll completed'}; break;
      case 'resetAllAILabels':   resetAllAILabels(); result = {status: 'success'}; break;
      case 'setLabelColors':     _setLabelColors(); result = {status: 'success'}; break;
      case 'migrateSenderDropdown': _migrateSenderDropdown(); result = {status: 'success'}; break;
      case 'consolidateLearning': result = _scheduleAsync('consolidateLearning'); break;
      case 'seedGoldenSet':      seedGoldenSetFromExisting(); result = {status: 'success'}; break;
      case 'runEvaluation':      result = _scheduleAsync('runEvaluation'); break;
      case 'updateCorrectionStats': _updateCorrectionStats(); result = {status: 'success'}; break;
      case 'exportPromptDoc':    exportPromptDoc(); result = {status: 'success'}; break;
      case 'updateBenefitsStats': _reconcileBenefitsStats(); result = {status: 'success'}; break;
      case 'reconcileBenefitsStats': _reconcileBenefitsStats(); result = {status: 'success'}; break;
      case 'retryFailed':        result = _retryFailedEmails(); break;

      // === 測試前置操作（Gmail 標籤） ===
      case 'addLabel':    result = _testAddLabel(params); break;
      case 'removeLabel': result = _testRemoveLabel(params); break;
      case 'swapLabels':  result = _testSwapLabels(params); break;

      // === 測試前置操作（Sheet 資料） ===
      case 'setSenderRole':    result = _testSetSenderRole(params); break;
      case 'setCorrectedName': result = _testSetCorrectedName(params); break;
      case 'setFinalCode':     result = _testSetFinalCode(params); break;
      case 'modifyGoldenSet':  result = _testModifyGoldenSet(params); break;

      // === 測試驗證（讀取狀態） ===
      case 'getSheetData':  result = _testGetSheetData(params); break;
      case 'getDriveFiles': result = _testGetDriveFiles(params); break;
      case 'listAllDriveFiles': result = _testListAllDriveFiles(); break;
      case 'getLastLog':    result = _testGetLastLog(params); break;

      // === 清理 ===
      case 'cleanup':    result = _testCleanup(); break;
      case 'fullReset':  result = _testFullReset(); break;
      case 'factoryReset': result = _testFactoryReset(); break;
      case 'deepClean':  result = _testDeepClean(params); break;
      case 'removeSenders': result = _testRemoveSenders(params); break;
      case 'snapshot':   result = _testSnapshot(); break;
      case 'restore':    result = _testRestore(); break;
      case 'status':     result = _testGetStatus(); break;
      case 'ping':       result = {status: 'ok', timestamp: new Date().toISOString()}; break;
      default: result = {error: 'Unknown action: ' + action};
    }
  } catch(err) {
    result = {error: err.message, stack: err.stack};
    // 長時間執行的 action 失敗時，更新執行狀態為 error
    if (action === 'trialRun' || action === 'processEmails' || action === 'runFeedback') {
      try {
        PropertiesService.getScriptProperties().setProperty('_execution_status', JSON.stringify({
          action: action,
          status: 'error',
          error: err.message,
          endTime: new Date().toISOString()
        }));
      } catch(e2) { /* ignore */ }
    }
  }

  // 統一加入 metadata
  if (typeof result === 'object' && result !== null) {
    result._action = action;
    result._duration_ms = new Date() - startTime;
    if (!result.status) result.status = result.error ? 'error' : 'success';
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ===================== 非同步執行（繞過 doGet 30 秒限制） =====================

/**
 * 排程一個函式在 1 秒後以 time-based trigger 執行（最多 6 分鐘執行時間）
 * 用於 consolidateLearning、runEvaluation 等需要 LLM 呼叫的長時間函式
 */
function _scheduleAsync(functionName) {
  // 清除同名的既有 trigger，避免重複排程
  var triggers = ScriptApp.getProjectTriggers();
  var wrapperName = '_asyncRun_' + functionName;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === wrapperName) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 寫入排程狀態
  var props = PropertiesService.getScriptProperties();
  props.setProperty('_execution_status', JSON.stringify({
    action: functionName,
    status: 'scheduled',
    scheduledAt: new Date().toISOString()
  }));

  // 建立 1 秒後執行的 trigger
  ScriptApp.newTrigger(wrapperName)
    .timeBased()
    .after(1000)
    .create();

  return {status: 'scheduled', action: functionName, note: '將在背景執行，用 ?action=status 查詢進度'};
}

/** consolidateLearning 的非同步 wrapper */
function _asyncRun_consolidateLearning() {
  var props = PropertiesService.getScriptProperties();
  try {
    props.setProperty('_execution_status', JSON.stringify({
      action: 'consolidateLearning',
      status: 'running',
      startTime: new Date().toISOString()
    }));
    var result = consolidateLearning();
    props.setProperty('_execution_status', JSON.stringify({
      action: 'consolidateLearning',
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      result: result
    }));
  } catch(e) {
    props.setProperty('_execution_status', JSON.stringify({
      action: 'consolidateLearning',
      status: 'error',
      error: e.message,
      endTime: new Date().toISOString()
    }));
  }
  // 清除自己的 trigger
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === '_asyncRun_consolidateLearning') ScriptApp.deleteTrigger(t);
  });
}

/** runEvaluation 的非同步 wrapper */
function _asyncRun_runEvaluation() {
  var props = PropertiesService.getScriptProperties();
  try {
    props.setProperty('_execution_status', JSON.stringify({
      action: 'runEvaluation',
      status: 'running',
      startTime: new Date().toISOString()
    }));
    var result = runEvaluation();
    props.setProperty('_execution_status', JSON.stringify({
      action: 'runEvaluation',
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      result: result
    }));
  } catch(e) {
    props.setProperty('_execution_status', JSON.stringify({
      action: 'runEvaluation',
      status: 'error',
      error: e.message,
      endTime: new Date().toISOString()
    }));
  }
  // 清除自己的 trigger
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === '_asyncRun_runEvaluation') ScriptApp.deleteTrigger(t);
  });
}

// ===================== Gmail 標籤操作（測試前置） =====================

function _testAddLabel(params) {
  if (!params.messageId || !params.label) return {error: 'Required: messageId, label'};
  var message = GmailApp.getMessageById(params.messageId);
  if (!message) return {error: 'Message not found: ' + params.messageId};
  var thread = message.getThread();
  var label = GmailApp.getUserLabelByName(params.label);
  if (!label) return {error: 'Label not found: ' + params.label};
  label.addToThread(thread);
  return {added: params.label, messageId: params.messageId};
}

function _testRemoveLabel(params) {
  if (!params.messageId || !params.label) return {error: 'Required: messageId, label'};
  var message = GmailApp.getMessageById(params.messageId);
  if (!message) return {error: 'Message not found: ' + params.messageId};
  var thread = message.getThread();
  var label = GmailApp.getUserLabelByName(params.label);
  if (!label) return {error: 'Label not found: ' + params.label};
  label.removeFromThread(thread);
  return {removed: params.label, messageId: params.messageId};
}

function _testSwapLabels(params) {
  if (!params.messageId || !params.remove || !params.add) return {error: 'Required: messageId, remove, add'};
  var message = GmailApp.getMessageById(params.messageId);
  if (!message) return {error: 'Message not found: ' + params.messageId};
  var thread = message.getThread();
  var removeLabel = GmailApp.getUserLabelByName(params.remove);
  var addLabel = GmailApp.getUserLabelByName(params.add);
  if (!removeLabel) return {error: 'Label not found: ' + params.remove};
  if (!addLabel) return {error: 'Label not found: ' + params.add};
  removeLabel.removeFromThread(thread);
  addLabel.addToThread(thread);
  return {removed: params.remove, added: params.add, messageId: params.messageId};
}


// ===================== Sheet 資料操作（測試前置） =====================

function _testSetSenderRole(params) {
  if (!params.email || !params.role) return {error: 'Required: email, role'};
  // 使用現有的 _addSender 函式（已處理新增/更新邏輯）
  _addSender(params.email, params.role, params.note || '(test)');
  return {email: params.email, role: params.role};
}

function _testSetCorrectedName(params) {
  // params: row（1-based）, value
  if (!params.row || !params.value) return {error: 'Required: row, value'};
  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return {error: 'Sheet not found: ' + CONFIG.SHEET_NAMES.LOG};
  var row = parseInt(params.row);
  sheet.getRange(row, 15).setValue(params.value);  // Col 15 = 修正後名稱 (1-based)
  return {row: row, col: 15, colName: '修正後名稱', value: params.value};
}

function _testSetFinalCode(params) {
  // params: row（1-based）, value
  if (!params.row || !params.value) return {error: 'Required: row, value'};
  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
  if (!sheet) return {error: 'Sheet not found: ' + CONFIG.SHEET_NAMES.LOG};
  var row = parseInt(params.row);
  sheet.getRange(row, 14).setValue(params.value);  // Col 14 = 最終收發碼 (1-based)
  return {row: row, col: 14, colName: '最終收發碼', value: params.value};
}

function _testModifyGoldenSet(params) {
  // params: row（1-based）, col（1-based）, value
  if (!params.row || !params.col || !params.value) return {error: 'Required: row, col, value'};
  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.GOLDEN_SET);
  if (!sheet) return {error: 'Sheet not found: ' + CONFIG.SHEET_NAMES.GOLDEN_SET};
  sheet.getRange(parseInt(params.row), parseInt(params.col)).setValue(params.value);
  return {tab: CONFIG.SHEET_NAMES.GOLDEN_SET, row: params.row, col: params.col, value: params.value};
}


// ===================== 驗證用讀取函式 =====================

function _testGetSheetData(params) {
  if (!params.tab) return {error: 'Required: tab'};
  var ss = _getSpreadsheet();
  var sheet = ss.getSheetByName(params.tab);
  if (!sheet) return {error: 'Sheet not found: ' + params.tab};

  var data;
  if (params.range) {
    data = sheet.getRange(params.range).getValues();
  } else if (params.lastRows) {
    // 讀取最後 N 行（避免讀取整個大表）
    var lastRow = sheet.getLastRow();
    var n = parseInt(params.lastRows);
    var startRow = Math.max(1, lastRow - n + 1);
    data = sheet.getRange(startRow, 1, lastRow - startRow + 1, sheet.getLastColumn()).getValues();
  } else {
    data = sheet.getDataRange().getValues();
  }

  // 如果有搜尋關鍵字，過濾
  if (params.search) {
    var keyword = params.search;
    data = data.filter(function(row) {
      return row.some(function(cell) {
        return String(cell).indexOf(keyword) !== -1;
      });
    });
  }

  return {tab: params.tab, range: params.range || 'all', rowCount: data.length, data: data};
}

function _testGetDriveFiles(params) {
  var folder;
  try {
    if (params.folderId) {
      folder = DriveApp.getFolderById(params.folderId);
    } else if (params.folderPath) {
      // 從專案根資料夾按路徑找
      var parts = params.folderPath.split('/');
      folder = _getProjectFolder();
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;  // 跳過空字串
        var subFolders = folder.getFoldersByName(parts[i]);
        if (!subFolders.hasNext()) return {error: 'Folder not found: ' + parts[i], searchedIn: folder.getName()};
        folder = subFolders.next();
      }
    } else {
      // 預設：專案根資料夾
      folder = _getProjectFolder();
    }
  } catch(e) {
    return {error: 'Drive error: ' + e.message};
  }

  var files = folder.getFiles();
  var list = [];
  while (files.hasNext()) {
    var f = files.next();
    list.push({
      name: f.getName(),
      size: f.getSize(),
      mimeType: f.getMimeType(),
      date: f.getDateCreated().toISOString(),
      lastUpdated: f.getLastUpdated().toISOString()
    });
  }

  // 也列出子資料夾
  var subfolders = [];
  var sf = folder.getFolders();
  while (sf.hasNext()) {
    var sub = sf.next();
    subfolders.push({name: sub.getName(), id: sub.getId()});
  }

  return {
    folder: folder.getName(),
    folderId: folder.getId(),
    fileCount: list.length,
    files: list,
    subfolderCount: subfolders.length,
    subfolders: subfolders
  };
}

/**
 * 遞迴列出專利/商標/未分類資料夾下所有檔案（含子資料夾路徑）
 * 用於 snapshot/restore 測試時比對 Drive 檔案是否重複
 */
function _testListAllDriveFiles() {
  var rootFolder = _getProjectFolder();
  var topFolders = ['專利', '商標', '未分類'];
  var result = {};
  var totalFiles = 0;

  topFolders.forEach(function(name) {
    var iter = rootFolder.getFoldersByName(name);
    if (!iter.hasNext()) {
      result[name] = {subfolders: 0, files: 0, detail: {}};
      return;
    }
    var folder = iter.next();
    var detail = {};
    var folderFileCount = 0;

    // 遞迴列出
    var _listRecursive = function(f, path) {
      var files = f.getFiles();
      var fileList = [];
      while (files.hasNext()) {
        var file = files.next();
        fileList.push(file.getName());
        folderFileCount++;
        totalFiles++;
      }
      if (fileList.length > 0) detail[path || '_root'] = fileList;

      var subs = f.getFolders();
      while (subs.hasNext()) {
        var sub = subs.next();
        _listRecursive(sub, (path ? path + '/' : '') + sub.getName());
      }
    };

    _listRecursive(folder, '');
    result[name] = {subfolders: Object.keys(detail).length, files: folderFileCount, detail: detail};
  });

  return {totalFiles: totalFiles, folders: result};
}

function _testGetLastLog(params) {
  // 從 PropertiesService 讀取儲存的 log
  var props = PropertiesService.getScriptProperties();
  var savedLog = props.getProperty('_testLastLog');

  if (!savedLog) {
    return {
      status: 'no_log',
      note: 'No saved log. Core functions need _testSaveLog() calls.',
      hint: 'Add _testSaveLog(logMessages) at end of core functions, or check Apps Script Execution Log manually.'
    };
  }

  var logData;
  try {
    logData = JSON.parse(savedLog);
  } catch(e) {
    return {status: 'parse_error', raw: savedLog};
  }

  // 如果有搜尋關鍵字，過濾
  if (params.search) {
    var filtered = logData.messages.filter(function(line) {
      return line.indexOf(params.search) !== -1;
    });
    return {search: params.search, matchCount: filtered.length, matches: filtered, totalLines: logData.messages.length, savedAt: logData.savedAt};
  }

  return logData;
}

/**
 * 核心函式呼叫此函式儲存 log（給 getLastLog 用）
 * 用法：在 _processEmailBatch / runFeedback 結尾加上
 *   _testSaveLog(['訊息1', '訊息2', ...]);
 */
function _testSaveLog(messages) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('_testLastLog', JSON.stringify({
    savedAt: new Date().toISOString(),
    messages: messages
  }));
}


// ===================== 清理函式 =====================

function _testCleanup() {
  var log = [];

  // 1. 清 Drive 測試資料（未分類資料夾內的檔案和子資料夾）
  try {
    var rootFolder = _getProjectFolder();
    var unclassified = null;
    var iter = rootFolder.getFoldersByName('未分類');
    if (iter.hasNext()) unclassified = iter.next();

    if (unclassified) {
      // 清「未分類/垃圾」內的檔案
      var spamFolder = null;
      var spamIter = unclassified.getFoldersByName('垃圾');
      if (spamIter.hasNext()) spamFolder = spamIter.next();
      if (spamFolder) {
        var spamFiles = spamFolder.getFiles();
        var count = 0;
        while (spamFiles.hasNext()) { spamFiles.next().setTrashed(true); count++; }
        log.push('Drive: trashed ' + count + ' files in 未分類/垃圾');
      }

      // 清「未分類」直接的檔案
      var uncFiles = unclassified.getFiles();
      var uncCount = 0;
      while (uncFiles.hasNext()) { uncFiles.next().setTrashed(true); uncCount++; }
      if (uncCount > 0) log.push('Drive: trashed ' + uncCount + ' files in 未分類');
    }
  } catch(e) {
    log.push('Drive cleanup error: ' + e.message);
  }

  // 2. 清 Sheet 處理紀錄 rows（保留標題行）
  try {
    var ss = _getSpreadsheet();
    var recordSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    if (recordSheet && recordSheet.getLastRow() > 1) {
      var rowCount = recordSheet.getLastRow() - 1;
      recordSheet.deleteRows(2, rowCount);
      log.push('Sheet: cleared ' + rowCount + ' rows from ' + CONFIG.SHEET_NAMES.LOG);
    }
  } catch(e) {
    log.push('Sheet cleanup error: ' + e.message);
  }

  // 3. 移除所有 Gmail AI/* 標籤（從信件上移除，不刪標籤本身）
  try {
    var labels = GmailApp.getUserLabels().filter(function(l) {
      return l.getName().startsWith(CONFIG.LABEL_PREFIX + '/');
    });
    labels.forEach(function(label) {
      var threads = label.getThreads(0, 100);
      if (threads.length > 0) {
        label.removeFromThreads(threads);
      }
      log.push('Gmail: removed ' + label.getName() + ' from ' + threads.length + ' threads');
    });
  } catch(e) {
    log.push('Gmail cleanup error: ' + e.message);
  }

  // 4. 清除 log cache
  try {
    PropertiesService.getScriptProperties().deleteProperty('_testLastLog');
    log.push('Props: cleared _testLastLog');
  } catch(e) {
    log.push('Props cleanup error: ' + e.message);
  }

  return {status: 'cleaned', steps: log};
}

function _testFullReset() {
  var cleanResult = _testCleanup();
  setupAll();  // 重建 Sheet tabs + Drive 資料夾 + 標籤
  return {status: 'reset complete', cleanup: cleanResult};
}

/**
 * 深度清理：完整重置測試環境
 * params.removeSenders — 逗號分隔的 email/domain 列表（如 "@questel.com,@lexisnexis.com"）
 * params.removeFolders — 逗號分隔的資料夾名稱（如 "未分類,商標,專利"）
 * params.removeLabels — 逗號分隔的 Gmail 標籤名稱（如 "已下載,未分類"）
 */
function _testDeepClean(params) {
  var log = [];

  // 1. Drive：刪除指定資料夾（含內容）
  var foldersToRemove = (params.removeFolders || '未分類,商標,專利').split(',');
  try {
    var rootFolder = _getProjectFolder();
    foldersToRemove.forEach(function(name) {
      name = name.trim();
      if (!name) return;
      var iter = rootFolder.getFoldersByName(name);
      if (iter.hasNext()) {
        var folder = iter.next();
        folder.setTrashed(true);
        log.push('Drive: trashed folder "' + name + '" (id: ' + folder.getId() + ')');
      } else {
        log.push('Drive: folder "' + name + '" not found, skipped');
      }
    });
  } catch(e) {
    log.push('Drive error: ' + e.message);
  }

  // 2. Gmail：移除所有信件上的 AI/* 標籤
  try {
    var aiLabels = GmailApp.getUserLabels().filter(function(l) {
      return l.getName().startsWith(CONFIG.LABEL_PREFIX + '/');
    });
    aiLabels.forEach(function(label) {
      var threads = label.getThreads(0, 500);
      if (threads.length > 0) {
        label.removeFromThreads(threads);
      }
      log.push('Gmail: removed "' + label.getName() + '" from ' + threads.length + ' threads');
    });
  } catch(e) {
    log.push('Gmail AI label removal error: ' + e.message);
  }

  // 3. Gmail：刪除指定標籤（整個刪除）
  var labelsToDelete = (params.removeLabels || '已下載,未分類').split(',');
  try {
    labelsToDelete.forEach(function(name) {
      name = name.trim();
      if (!name) return;
      // 先找子標籤（如 已下載/xxx），從子到父刪除
      var allLabels = GmailApp.getUserLabels();
      var children = allLabels.filter(function(l) {
        return l.getName().startsWith(name + '/');
      });
      children.forEach(function(child) {
        // 先移除信件上的標籤
        var threads = child.getThreads(0, 500);
        if (threads.length > 0) child.removeFromThreads(threads);
        child.deleteLabel();
        log.push('Gmail: deleted label "' + child.getName() + '"');
      });
      // 再刪父標籤本身
      var parent = GmailApp.getUserLabelByName(name);
      if (parent) {
        var threads = parent.getThreads(0, 500);
        if (threads.length > 0) parent.removeFromThreads(threads);
        parent.deleteLabel();
        log.push('Gmail: deleted label "' + name + '"');
      } else {
        log.push('Gmail: label "' + name + '" not found, skipped');
      }
    });
  } catch(e) {
    log.push('Gmail label delete error: ' + e.message);
  }

  // 4. Sheet：清空處理紀錄（保留標題行）
  try {
    var ss = _getSpreadsheet();
    var recordSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    if (recordSheet && recordSheet.getLastRow() > 1) {
      var rowCount = recordSheet.getLastRow() - 1;
      recordSheet.deleteRows(2, rowCount);
      log.push('Sheet: cleared ' + rowCount + ' rows from ' + CONFIG.SHEET_NAMES.LOG);
    } else {
      log.push('Sheet: ' + CONFIG.SHEET_NAMES.LOG + ' already empty');
    }
  } catch(e) {
    log.push('Sheet cleanup error: ' + e.message);
  }

  // 5. 清除 log cache
  try {
    PropertiesService.getScriptProperties().deleteProperty('_testLastLog');
    log.push('Props: cleared _testLastLog');
  } catch(e) {
    log.push('Props cleanup error: ' + e.message);
  }

  return {status: 'deep cleaned', steps: log};
}

/**
 * 從 Sender 名單刪除指定 sender
 * params.senders — 逗號分隔的 email/domain（如 "@questel.com,@lexisnexis.com"）
 */
function _testRemoveSenders(params) {
  if (!params.senders) return {error: 'Required: senders (comma-separated)'};
  var sendersToRemove = params.senders.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  var log = [];

  try {
    var ss = _getSpreadsheet();
    var senderSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SENDERS);
    if (!senderSheet) return {error: 'Sheet not found: ' + CONFIG.SHEET_NAMES.SENDERS};

    var data = senderSheet.getDataRange().getValues();
    var rowsToDelete = [];
    for (var i = data.length - 1; i >= 1; i--) {
      var email = String(data[i][0]).trim();
      if (sendersToRemove.some(function(s) { return email === s || email.endsWith(s); })) {
        rowsToDelete.push({row: i + 1, email: email});
      }
    }
    rowsToDelete.forEach(function(item) {
      senderSheet.deleteRow(item.row);
      log.push('Deleted row ' + item.row + ' (' + item.email + ')');
    });
    if (rowsToDelete.length === 0) {
      log.push('No matching entries found for ' + sendersToRemove.join(', '));
    }
  } catch(e) {
    log.push('Error: ' + e.message);
  }

  return {status: 'done', deleted: rowsToDelete ? rowsToDelete.length : 0, steps: log};
}

/**
 * Snapshot：儲存所有 Sheet tab 資料到 ScriptProperties
 * 用於測試前保存狀態，測試後可用 restore 還原
 */
/**
 * Factory Reset：完整清除 → 從 Code.gs 重建一切
 * 等同第一次執行 setupAll()，回到程式碼定義的初始狀態
 * 包含：Sender名單 8 筆預設、70+ 條分類規則、設定預設值等
 */
function _testFactoryReset() {
  var log = [];

  // 1. Drive：清空專利/商標/未分類資料夾內所有檔案（保留資料夾結構）
  _cleanDriveFolderContents(log);

  // 2. Gmail：移除所有信件上的 AI/* 標籤（從信件移除，不刪標籤本身）
  try {
    var aiLabels = GmailApp.getUserLabels().filter(function(l) {
      return l.getName().startsWith(CONFIG.LABEL_PREFIX + '/');
    });
    aiLabels.forEach(function(label) {
      var threads = label.getThreads(0, 500);
      if (threads.length > 0) {
        label.removeFromThreads(threads);
      }
      log.push('Gmail: removed "' + label.getName() + '" from ' + threads.length + ' threads');
    });
  } catch(e) {
    log.push('Gmail cleanup error: ' + e.message);
  }

  // 3. Sheet：刪除所有 7 個 tab → 重跑 _setupSheets(ss)
  try {
    var ss = _getSpreadsheet();
    var tabNames = Object.values(CONFIG.SHEET_NAMES);

    // 先建一個暫時 Sheet（Spreadsheet 至少需要 1 個 sheet 才能刪其他的）
    var tempSheet = ss.insertSheet('_temp_factory_reset');

    tabNames.forEach(function(tabName) {
      var sheet = ss.getSheetByName(tabName);
      if (sheet) {
        ss.deleteSheet(sheet);
        log.push('Sheet: deleted tab "' + tabName + '"');
      }
    });

    // 重建所有 Sheet（_setupSheets 內部呼叫 _setupRulesSheet）
    _setupSheets(ss);
    log.push('Sheet: rebuilt all tabs via _setupSheets()');

    // 刪除暫時 Sheet
    try { ss.deleteSheet(tempSheet); } catch(e) { /* ignore */ }
  } catch(e) {
    log.push('Sheet rebuild error: ' + e.message);
  }

  // 4. 清除 ScriptProperties：snapshot 資料、execution 狀態
  try {
    var props = PropertiesService.getScriptProperties();
    var allKeys = props.getKeys();
    var cleanedKeys = [];
    allKeys.forEach(function(key) {
      if (key.startsWith('_snapshot_') || key.startsWith('_execution_') ||
          key === '_testLastLog' || key === 'lastProcessedTime') {
        props.deleteProperty(key);
        cleanedKeys.push(key);
      }
    });
    log.push('Props: cleared ' + cleanedKeys.length + ' keys (' + cleanedKeys.join(', ') + ')');
  } catch(e) {
    log.push('Props cleanup error: ' + e.message);
  }

  return {status: 'factory reset complete', steps: log};
}

/**
 * Drive 檔案清除 helper：遍歷專利/商標/未分類（含子資料夾）的所有檔案，trash 檔案但保留資料夾結構
 */
function _cleanDriveFolderContents(log) {
  var folderNames = ['專利', '商標', '未分類'];
  try {
    var rootFolder = _getProjectFolder();
    folderNames.forEach(function(name) {
      var iter = rootFolder.getFoldersByName(name);
      if (!iter.hasNext()) {
        log.push('Drive: folder "' + name + '" not found, skipped');
        return;
      }
      var folder = iter.next();
      var count = _trashAllFilesRecursive(folder);
      log.push('Drive: trashed ' + count + ' files in "' + name + '" (folder preserved)');
    });
  } catch(e) {
    log.push('Drive cleanup error: ' + e.message);
  }
}

/**
 * 遞迴清空資料夾內所有檔案（保留子資料夾結構）
 */
function _trashAllFilesRecursive(folder) {
  var count = 0;

  // 清該資料夾的檔案
  var files = folder.getFiles();
  while (files.hasNext()) {
    files.next().setTrashed(true);
    count++;
  }

  // 遞迴清子資料夾的檔案
  var subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    count += _trashAllFilesRecursive(subFolders.next());
  }

  return count;
}

/**
 * Drive 快照 helper：遞迴收集專利/商標/未分類資料夾內所有檔案的 {id, name, folderId}
 * 回傳 [{id, name, folderId}, ...] 陣列
 */
function _snapshotDriveFiles() {
  var folderNames = ['專利', '商標', '未分類'];
  var rootFolder = _getProjectFolder();
  var allFiles = [];

  folderNames.forEach(function(name) {
    var iter = rootFolder.getFoldersByName(name);
    if (!iter.hasNext()) return;
    var folder = iter.next();

    var _collectFiles = function(currentFolder) {
      var files = currentFolder.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        allFiles.push({ id: f.getId(), name: f.getName(), folderId: currentFolder.getId() });
      }
      var subs = currentFolder.getFolders();
      while (subs.hasNext()) {
        _collectFiles(subs.next());
      }
    };
    _collectFiles(folder);
  });

  return allFiles;
}

/**
 * Gmail 快照 helper：收集所有 AI/* 標籤下的 thread×label 對應
 * 回傳 {data: {threadId: [labelName, ...], ...}, threadCount: N, warning: string|null}
 */
function _snapshotGmailLabels() {
  var prefix = CONFIG.LABEL_PREFIX + '/';
  var aiLabels = GmailApp.getUserLabels().filter(function(l) {
    return l.getName().startsWith(prefix);
  });

  var threadLabels = {}; // {threadId: [labelName, ...]}
  var warning = null;

  aiLabels.forEach(function(label) {
    var threads = label.getThreads(0, 500);
    if (threads.length >= 490) {
      warning = 'Label "' + label.getName() + '" has ' + threads.length + ' threads (near 500 limit, some may be missed)';
    }
    threads.forEach(function(thread) {
      var tid = thread.getId();
      if (!threadLabels[tid]) threadLabels[tid] = [];
      threadLabels[tid].push(label.getName());
    });
  });

  return {
    data: threadLabels,
    threadCount: Object.keys(threadLabels).length,
    warning: warning
  };
}

function _testSnapshot() {
  var ss = _getSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var tabNames = Object.values(CONFIG.SHEET_NAMES);
  var log = [];

  tabNames.forEach(function(tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      log.push(tabName + ': not found, skipped');
      return;
    }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow === 0 || lastCol === 0) {
      props.setProperty('_snapshot_' + tabName, JSON.stringify({rows: 0, data: []}));
      log.push(tabName + ': empty (saved)');
      return;
    }
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var json = JSON.stringify({rows: lastRow, cols: lastCol, data: data});

    // ScriptProperties 每個 key 上限 9KB，大的 tab 需要分段
    if (json.length > 8000) {
      var chunks = [];
      for (var i = 0; i < json.length; i += 8000) {
        chunks.push(json.substring(i, i + 8000));
      }
      props.setProperty('_snapshot_' + tabName, JSON.stringify({chunked: true, count: chunks.length}));
      chunks.forEach(function(chunk, idx) {
        props.setProperty('_snapshot_' + tabName + '_' + idx, chunk);
      });
      log.push(tabName + ': ' + lastRow + ' rows (' + chunks.length + ' chunks)');
    } else {
      props.setProperty('_snapshot_' + tabName, json);
      log.push(tabName + ': ' + lastRow + ' rows');
    }
  });

  // 也儲存設定值
  var settings = {};
  try {
    var settingsSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SETTINGS);
    if (settingsSheet) {
      var sData = settingsSheet.getDataRange().getValues();
      sData.forEach(function(row) { if (row[0]) settings[row[0]] = row[1]; });
    }
  } catch(e) {}
  props.setProperty('_snapshot_settings_kv', JSON.stringify(settings));

  // === Drive 快照：記錄所有檔案 {id, name, folderId} ===
  try {
    var driveFiles = _snapshotDriveFiles();
    var driveJson = JSON.stringify(driveFiles);
    if (driveJson.length > 8000) {
      var dChunks = [];
      for (var di = 0; di < driveJson.length; di += 8000) {
        dChunks.push(driveJson.substring(di, di + 8000));
      }
      props.setProperty('_snapshot_driveFiles', JSON.stringify({chunked: true, count: dChunks.length}));
      dChunks.forEach(function(chunk, idx) {
        props.setProperty('_snapshot_driveFiles_' + idx, chunk);
      });
      log.push('Drive: ' + driveFiles.length + ' files saved (' + dChunks.length + ' chunks)');
    } else {
      props.setProperty('_snapshot_driveFiles', driveJson);
      log.push('Drive: ' + driveFiles.length + ' files saved');
    }
  } catch(e) {
    log.push('Drive snapshot error: ' + e.message);
  }

  // === Gmail 快照：記錄 thread×label 對應 ===
  try {
    var gmailState = _snapshotGmailLabels();
    var gmailJson = JSON.stringify(gmailState.data);
    if (gmailJson.length > 8000) {
      var gChunks = [];
      for (var gi = 0; gi < gmailJson.length; gi += 8000) {
        gChunks.push(gmailJson.substring(gi, gi + 8000));
      }
      props.setProperty('_snapshot_gmailLabels', JSON.stringify({chunked: true, count: gChunks.length}));
      gChunks.forEach(function(chunk, idx) {
        props.setProperty('_snapshot_gmailLabels_' + idx, chunk);
      });
      log.push('Gmail: ' + gmailState.threadCount + ' threads × labels saved (' + gChunks.length + ' chunks)');
    } else {
      props.setProperty('_snapshot_gmailLabels', gmailJson);
      log.push('Gmail: ' + gmailState.threadCount + ' threads × labels saved');
    }
    if (gmailState.warning) log.push('Gmail WARNING: ' + gmailState.warning);
  } catch(e) {
    log.push('Gmail snapshot error: ' + e.message);
  }

  props.setProperty('_snapshot_timestamp', new Date().toISOString());
  log.push('Snapshot saved at ' + new Date().toISOString());

  return {status: 'snapshot saved', steps: log};
}

/**
 * Restore：完整還原到 snapshot 狀態（Sheet + Drive + Gmail）
 * - Sheet：只動 Row 2+ 的資料，保留 Row 1 標題和所有格式
 * - Drive：trash 快照之後新增的檔案（比對 file ID）
 * - Gmail：全清 AI/* 標籤 → 加回快照時的 thread×label 對應
 */
function _testRestore() {
  var ss = _getSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var tabNames = Object.values(CONFIG.SHEET_NAMES);
  var log = [];

  var timestamp = props.getProperty('_snapshot_timestamp');
  if (!timestamp) {
    return {error: 'No snapshot found. Run snapshot first.'};
  }
  log.push('Restoring from snapshot: ' + timestamp);

  tabNames.forEach(function(tabName) {
    var saved = props.getProperty('_snapshot_' + tabName);
    if (!saved) {
      log.push(tabName + ': no snapshot data, skipped');
      return;
    }

    var parsed = JSON.parse(saved);

    if (parsed.chunked) {
      // 重組分段資料
      var json = '';
      for (var i = 0; i < parsed.count; i++) {
        json += props.getProperty('_snapshot_' + tabName + '_' + i) || '';
      }
      parsed = JSON.parse(json);
    }

    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      log.push(tabName + ': sheet not found, skipped');
      return;
    }

    // 1. 刪除 Row 2+ 現有資料列（保留 Row 1 標題 + 所有格式設定）
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }

    // 2. 寫回快照中 Row 2+ 的資料
    if (parsed.data && parsed.data.length > 1) {
      var dataRows = parsed.data.slice(1); // 跳過 header row
      if (dataRows.length > 0 && dataRows[0].length > 0) {
        sheet.getRange(2, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
      }
      log.push(tabName + ': restored ' + dataRows.length + ' data rows (format preserved)');
    } else {
      log.push(tabName + ': restored (empty, header-only)');
    }

    // 3. 分類規則 tab 需要重新套用類別標題行的格式（合併儲存格 + 背景色）
    if (tabName === CONFIG.SHEET_NAMES.RULES) {
      _applyRulesFormatting(sheet);
      log.push(tabName + ': re-applied category formatting (merge + colors)');
    }
  });

  // === Drive 還原：trash 快照之後新增的檔案 ===
  var driveApiCalls = 0;
  try {
    var driveSnap = props.getProperty('_snapshot_driveFiles');
    if (driveSnap) {
      var dParsed = JSON.parse(driveSnap);
      var snapshotFileIds;
      if (dParsed.chunked) {
        var dJson = '';
        for (var di = 0; di < dParsed.count; di++) {
          dJson += props.getProperty('_snapshot_driveFiles_' + di) || '';
        }
        snapshotFileIds = JSON.parse(dJson);
      } else {
        snapshotFileIds = dParsed;
      }

      // 建立快照 map: { fileId → {name, folderId} }（向下相容舊格式 [id, id, ...]）
      var snapshotMap = {};
      var isNewFormat = snapshotFileIds.length > 0 && typeof snapshotFileIds[0] === 'object';
      snapshotFileIds.forEach(function(entry) {
        if (isNewFormat) {
          snapshotMap[entry.id] = { name: entry.name, folderId: entry.folderId };
        } else {
          snapshotMap[entry] = { name: null, folderId: null };  // 舊格式無名稱資訊
        }
      });

      // 掃描現在 Drive 的所有檔案
      var currentFiles = _snapshotDriveFiles();
      var trashedCount = 0;
      var renamedCount = 0;
      var movedCount = 0;
      currentFiles.forEach(function(cur) {
        var snap = snapshotMap[cur.id];
        if (!snap) {
          // 不在快照 → trash
          try {
            DriveApp.getFileById(cur.id).setTrashed(true);
            trashedCount++;
            driveApiCalls++;
          } catch(e) {
            log.push('Drive: skip file ' + cur.id + ' (' + e.message + ')');
          }
        } else if (isNewFormat) {
          // 在快照 → 檢查名稱和資料夾
          try {
            var file = DriveApp.getFileById(cur.id);
            if (snap.name && cur.name !== snap.name) {
              file.setName(snap.name);
              renamedCount++;
              driveApiCalls++;
            }
            if (snap.folderId && cur.folderId !== snap.folderId) {
              var targetFolder = DriveApp.getFolderById(snap.folderId);
              file.moveTo(targetFolder);
              movedCount++;
              driveApiCalls++;
            }
          } catch(e) {
            log.push('Drive: skip restore ' + cur.id + ' (' + e.message + ')');
          }
        }
      });
      var driveMsg = 'Drive: trashed ' + trashedCount + ' new files';
      if (isNewFormat) driveMsg += ', renamed ' + renamedCount + ', moved ' + movedCount;
      driveMsg += ' (snapshot: ' + snapshotFileIds.length + ' files)';
      log.push(driveMsg);
    } else {
      log.push('Drive: no snapshot data, skipped');
    }
  } catch(e) {
    log.push('Drive restore error: ' + e.message);
  }

  // === Gmail 還原：全清 AI/* 標籤 → 加回快照中的 thread×label ===
  var gmailApiCalls = 0;
  try {
    var gmailSnap = props.getProperty('_snapshot_gmailLabels');
    if (gmailSnap) {
      var gParsed = JSON.parse(gmailSnap);
      var snapshotGmail;
      if (gParsed.chunked) {
        var gJson = '';
        for (var gi = 0; gi < gParsed.count; gi++) {
          gJson += props.getProperty('_snapshot_gmailLabels_' + gi) || '';
        }
        snapshotGmail = JSON.parse(gJson);
      } else {
        snapshotGmail = gParsed;
      }

      // Step 1: 全清 — 移除所有 AI/* 標籤（重用 factoryReset 邏輯）
      var aiLabels = GmailApp.getUserLabels().filter(function(l) {
        return l.getName().startsWith(CONFIG.LABEL_PREFIX + '/');
      });
      var removedCount = 0;
      aiLabels.forEach(function(label) {
        var threads = label.getThreads(0, 500);
        if (threads.length > 0) {
          label.removeFromThreads(threads);
          removedCount += threads.length;
          gmailApiCalls++;
        }
      });
      log.push('Gmail: removed AI labels from ' + removedCount + ' thread-label pairs');

      // Step 2: 加回快照中的 thread×label
      // snapshotGmail 格式: {threadId: ["AI/收發碼/FC", "AI/狀態/待確認"], ...}
      var addedCount = 0;
      var threadIds = Object.keys(snapshotGmail);
      threadIds.forEach(function(threadId) {
        var labelNames = snapshotGmail[threadId];
        try {
          var thread = GmailApp.getThreadById(threadId);
          if (!thread) {
            log.push('Gmail: thread ' + threadId + ' not found, skipped');
            return;
          }
          labelNames.forEach(function(labelName) {
            var label = GmailApp.getUserLabelByName(labelName);
            if (label) {
              label.addToThread(thread);
              addedCount++;
              gmailApiCalls++;
            }
          });
        } catch(e) {
          log.push('Gmail: skip thread ' + threadId + ' (' + e.message + ')');
        }
      });
      log.push('Gmail: re-applied ' + addedCount + ' thread-label pairs from snapshot');

      if (gmailApiCalls > 190) {
        log.push('⚠️ Gmail API calls = ' + gmailApiCalls + ' — approaching 200, consider batch optimization');
      }
    } else {
      log.push('Gmail: no snapshot data, skipped');
    }
  } catch(e) {
    log.push('Gmail restore error: ' + e.message);
  }

  log.push('API calls — Drive: ' + driveApiCalls + ', Gmail: ' + gmailApiCalls);

  return {status: 'restored', steps: log};
}

/**
 * 分類規則 tab 專用：重新套用類別標題行格式
 * deleteRows 會刪掉合併儲存格和背景色，restore 後需要重建
 * 從 _setupRulesSheet 的 categoryConfig 提取顏色定義
 */
function _applyRulesFormatting(sheet) {
  // 類別標題與顏色設定（與 _setupRulesSheet 同步）
  var categoryConfig = {
    '案號結構':                 { bg: '#E8F0FE', titleBg: '#C5DAF0' },
    '專利/商標分類':            { bg: '#FCE8E6', titleBg: '#F5C6C2' },
    '收發碼判定':               { bg: '#FEF7E0', titleBg: '#F5E6A8' },
    '資料夾歸檔':               { bg: '#E6F4EA', titleBg: '#B7DFC4' },
    '檔名規則':                 { bg: '#F3E8FD', titleBg: '#D8C0F0' },
    '附件處理':                 { bg: '#E8F7FE', titleBg: '#B8DFF5' },
    '重跑保護':                 { bg: '#F1F3F4', titleBg: '#D2D6D9' },
    'LLM 回饋學習':             { bg: '#FFF8E1', titleBg: '#FFE082' },
    'LLM 語義名規則':           { bg: '#E8F5E9', titleBg: '#A5D6A7' },
    'LLM 期限選擇（結構化）':    { bg: '#FFF3E0', titleBg: '#FFCC80' },
  };

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var colA = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // A2:A{lastRow}
  var currentCfg = null;

  for (var i = 0; i < colA.length; i++) {
    var cellVal = String(colA[i][0]).trim();
    var rowNum = i + 2; // 實際 row number

    if (categoryConfig[cellVal]) {
      // 這是一個類別標題行
      currentCfg = categoryConfig[cellVal];
      var titleRange = sheet.getRange(rowNum, 1, 1, 5);
      titleRange.merge();
      titleRange.setFontWeight('bold');
      titleRange.setFontSize(11);
      titleRange.setBackground(currentCfg.titleBg);
      titleRange.setVerticalAlignment('middle');
    } else if (currentCfg && cellVal) {
      // 這是該類別下的規則行
      sheet.getRange(rowNum, 1, 1, 5).setBackground(currentCfg.bg);
      // 規則 ID 欄（A 欄）加粗體
      sheet.getRange(rowNum, 1).setFontWeight('bold');
    }
  }
}

/**
 * 取得目前執行狀態
 * 讀取 _execution_status from PropertiesService，附上 Sheet 處理紀錄的 row count
 */
function _testGetStatus() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('_execution_status');
  var execStatus = raw ? JSON.parse(raw) : {status: 'idle', note: 'No execution recorded'};

  // 附上 Sheet 處理紀錄 row count（獨立確認進度）
  try {
    var ss = _getSpreadsheet();
    var logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    execStatus.sheetRowCount = logSheet ? logSheet.getLastRow() - 1 : 0; // 扣掉 header
  } catch (e) {
    execStatus.sheetRowCount = -1;
  }

  execStatus.queriedAt = new Date().toISOString();
  return execStatus;
}

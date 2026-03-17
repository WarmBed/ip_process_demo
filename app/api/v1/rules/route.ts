import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

export interface Rule {
  id: string;
  category: string;
  categoryLabel: string;
  trigger: string;
  action: string;
  example: string;
  is_active: boolean;
  source: "system" | "learned";
}

export interface RuleGroup {
  category: string;
  label: string;
  color: string;
  titleColor: string;
  rules: Rule[];
}

const RULES: Rule[] = [
  // 案號格式
  { id:"C01", category:"case_format",   categoryLabel:"案號格式",     source:"system",  is_active:true, trigger:"案號結構：[4碼客戶號][2碼年份][3碼序號][1碼類型][2碼國碼][選填分案號]", action:"用正規表達式 /[A-Z0-9]{4}\\d{5}[PMDTABCW][A-Z]{2}\\d*/ 提取", example:"BRIT25710PUS1 → BRIT=客戶碼, 25=年份, 710=序號, P=專利, US=國碼, 1=分案號" },
  { id:"C02", category:"case_format",   categoryLabel:"案號格式",     source:"system",  is_active:true, trigger:"類型碼位於案號第10碼（index 9），固定位置取值", action:"用 charAt(9) 取類型碼，不用 regex search", example:"Bug教訓：BRIT 的 T 會被 regex 先匹配到，誤判為商標" },
  { id:"C03", category:"case_format",   categoryLabel:"案號格式",     source:"system",  is_active:true, trigger:"案號前後必須有邊界（非英數字元）", action:"正規表達式加 lookbehind/lookahead 避免從 base64 編碼誤匹配", example:"例：/(?<![A-Za-z0-9])...(?![A-Za-z0-9])/" },

  // 分類
  { id:"R01", category:"classification", categoryLabel:"專利/商標分類", source:"system", is_active:true, trigger:"案號第10碼為 P、M、D、A、C", action:"歸入「專利」資料夾 + 加上「專利」Gmail label", example:"P=Patent, M=Model, D=Design, A=Application, C=Continuation" },
  { id:"R02", category:"classification", categoryLabel:"專利/商標分類", source:"system", is_active:true, trigger:"案號第10碼為 T、B、W", action:"歸入「商標」資料夾 + 加上「商標」Gmail label", example:"T=Trademark, B=Brand, W=WIPO商標" },
  { id:"R03", category:"classification", categoryLabel:"專利/商標分類", source:"system", is_active:true, trigger:"同封信歸檔案號含專利+商標類型碼（混合）", action:"歸入「未分類」資料夾", example:"例：同封信有 PMDAC 和 TBW 的案號 → 未分類" },
  { id:"R04", category:"classification", categoryLabel:"專利/商標分類", source:"system", is_active:true, trigger:"主旨無案號（不論內文有無）", action:"歸入「未分類」資料夾，不加專利/商標 label", example:"因為無法從主旨判斷是專利還是商標" },

  // 收發碼
  { id:"S01", category:"direction_code", categoryLabel:"收發碼判定",   source:"system", is_active:true, trigger:"寄件人 domain 為自家（ipwinner.com）→ T（寄出）；否則 → F（收到）", action:"設定方向碼 F 或 T", example:"OWN_DOMAINS 可在設定中自訂" },
  { id:"S02", category:"direction_code", categoryLabel:"收發碼判定",   source:"system", is_active:true, trigger:"收到的信（F方向）：看寄件人 email 在 Sender 名單的角色", action:"決定角色碼 C=客戶 / A=代理人 / G=政府 / X=未知 → 組成 FC/FA/FG/FX", example:"例：bskb.com 在名單標為 Agent → FA" },
  { id:"S03", category:"direction_code", categoryLabel:"收發碼判定",   source:"system", is_active:true, trigger:"寄出的信（T方向）：看第一個外部收件人在 Sender 名單的角色", action:"決定角色碼 → 組成 TC/TA/TG/TX", example:"Bug教訓：T方向看寄件人（自己）永遠是 X → 全變 TX" },
  { id:"S04", category:"direction_code", categoryLabel:"收發碼判定",   source:"system", is_active:true, trigger:"寄件人 domain 含政府機構 domain（tipo.gov.tw, uspto.gov 等）", action:"角色 = G（政府）", example:"GOV_DOMAINS 可在設定中擴充" },
  { id:"S05", category:"direction_code", categoryLabel:"收發碼判定",   source:"system", is_active:true, trigger:"Sender 名單設計：私人 domain → 用 @domain；公共 email → 用完整 email", action:"避免 @gmail.com 代表所有 Gmail 用戶", example:"bskb.com → @bskb.com | john@gmail.com → john@gmail.com" },

  // 歸檔
  { id:"F01", category:"archiving",     categoryLabel:"資料夾歸檔",   source:"system", is_active:true, trigger:"主旨有案號 → 由 LLM 判斷 filing_case_numbers（實際歸檔案號）", action:"依歸檔案號建立資料夾存 EML 和附件", example:"LLM 區分「主要處理的案號」和「順便引用的案號」，只歸主案" },
  { id:"F02", category:"archiving",     categoryLabel:"資料夾歸檔",   source:"system", is_active:true, trigger:"主旨無案號但內文有案號", action:"歸入 未分類/{客戶碼前4碼}/ + 標記「無案號」", example:"例：主旨無案號但內文有 BRIT... → 未分類/BRIT/" },
  { id:"F03", category:"archiving",     categoryLabel:"資料夾歸檔",   source:"system", is_active:true, trigger:"完全無案號（主旨和內文都沒有）", action:"歸入 未分類/無案號/ + 標記「無案號」", example:"" },
  { id:"F04", category:"archiving",     categoryLabel:"資料夾歸檔",   source:"system", is_active:true, trigger:"主旨有 2 個以上不同案號", action:"每個歸檔案號各建一個資料夾存 EML + 標記「多案號」", example:"例：主旨有 BRIT25710PUS1 和 BRIT25711PUS2 → 各自資料夾都存一份 EML" },
  { id:"F05", category:"archiving",     categoryLabel:"資料夾歸檔",   source:"system", is_active:true, trigger:"主旨有 1 個案號 +「等」字（如 BRIT25710PUS1等3案）", action:"觸發多案號：去內文找其他案號，各建資料夾 + 標記「多案號」", example:"「～」「~」「、」不需額外判斷，主旨自然有 2+ 個案號" },

  // 檔名
  { id:"N01", category:"filename",      categoryLabel:"檔名規則",     source:"system", is_active:true, trigger:"EML 檔名格式", action:"{日期}-{收發碼}-{案號標記}-{AI語義名}.eml", example:"20260313-FA-BRIT25710PUS1-異議答辯期限0317.eml" },
  { id:"N02", category:"filename",      categoryLabel:"檔名規則",     source:"system", is_active:true, trigger:"附件檔名格式", action:"{EML基礎名}-附件N.{副檔名}，N 從 1 開始", example:"20260313-FA-BRIT25710PUS1-異議答辯期限0317-附件1.pdf" },
  { id:"N03", category:"filename",      categoryLabel:"檔名規則",     source:"system", is_active:true, trigger:"AI 語義名由 LLM 生成，25 字以內，含最關鍵的期限日期", action:"期限選擇：TA→我方要求代理人; TC→我方要求客戶; FA→代理人要求我方", example:"用「行動期限」而非「背景日期」" },
  { id:"N04", category:"filename",      categoryLabel:"檔名規則",     source:"system", is_active:true, trigger:"多案號的 EML 檔名案號標記帶「等N案」", action:"例：2案 → BRIT25710PUS1等2案", example:"每個資料夾的 EML 都帶「等N案」，方便辨識" },

  // 附件
  { id:"A01", category:"attachment",    categoryLabel:"附件處理",     source:"system", is_active:true, trigger:"TA/TC/TG（寄出的信）只存 EML，不存附件", action:"因為附件是我方自己寄出的，本地已有原始檔", example:"收到的信（FA/FC/FG/FX）才存附件" },
  { id:"A02", category:"attachment",    categoryLabel:"附件處理",     source:"system", is_active:true, trigger:"< 5KB 的圖片 → 跳過（通常是簽名檔圖片）", action:"檔名含 image00/logo/banner/signature 的也跳過", example:"另用 includeInlineImages:false 排除基本 inline 圖" },

  // 重跑保護
  { id:"D01", category:"dedup",         categoryLabel:"重跑保護",     source:"system", is_active:true, trigger:"同檔名 + 同大小（±100 bytes）的檔案", action:"跳過不重建（EML 和附件共用此邏輯）", example:"安全重跑：不需手動刪檔就能重跑處理" },
  { id:"D02", category:"dedup",         categoryLabel:"重跑保護",     source:"system", is_active:true, trigger:"訊息去重用 Message ID（記錄在處理紀錄）", action:"搜尋 Gmail 時不加 -label 排除條件", example:"Bug教訓：label 加在 thread 上，用 -label 排除會漏掉同 thread 新回覆" },

  // LLM 回饋
  { id:"L01", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"Sender 角色回授（方法A）：Gmail 移除「自動辨識來源」標籤", action:"執行回授偵測 → 偵測 Gmail label → 寫入 Sender 名單", example:"T 方向的回饋學習用收件人（非寄件人）作為學習對象" },
  { id:"L02", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"Sender 角色回授（方法B）：在 Sheet「最終收發碼」欄直接填寫正確收發碼", action:"執行回授偵測 → 比對 AI 碼 vs 最終碼 → 寫入 Sender 名單", example:"兩種方法擇一即可，修正來源分別記錄為 tag_change / sheet_code" },
  { id:"L03", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"檔名回授：在「修正後名稱」欄填寫正確語義名", action:"執行回授偵測 → 自動改名 Drive 裡的 EML 和附件 + 作為 LLM few-shot 範例", example:"例：「委託-提出商標異議-期限3/23」→「委託-提出商標異議-期限3/17」" },
  { id:"L04", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"在「修正原因」欄填寫原因（建議填寫）", action:"修正原因會傳給 LLM 作為 few-shot 範例，幫助 LLM 理解為什麼修改", example:"例：「應採用代理人要求的行動期限，非官方通知期限」" },
  { id:"L05", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"多種回授可同時進行，修正來源用「+」串接", action:"例：tag_change+name_change 代表同時修正了 sender 角色和語義名", example:"各項回授獨立判斷是否已處理，不會互相覆蓋" },
  { id:"L06", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"system", is_active:true, trigger:"修正紀錄用於 LLM few-shot learning（最近 20 筆）", action:"每次處理新信件時，把修正紀錄（含原因）注入 system prompt", example:"LLM 看到修正範例 + 原因，能逐漸學到命名偏好和判斷規則" },

  // LLM 語義名
  { id:"L07", category:"llm_semantic",  categoryLabel:"LLM 語義名規則", source:"system", is_active:true, trigger:"語義名描述文字中不可使用英文縮寫「OA」", action:"改用中文「審查意見」或「答辯」，「OA」只出現在括號事項碼如 -(OA1)", example:"✓ 確認收到-法國商標審查意見-(OA1)  ✗ 確認收到-法國商標OA-(OA1)" },

  // LLM 期限選擇
  { id:"L08", category:"llm_deadline",  categoryLabel:"LLM 期限選擇", source:"system", is_active:true, trigger:"期限由程式碼根據收發碼自動選擇（結構化期限提取）", action:"LLM 列出信中所有日期並分類為 4 種 type，程式碼用 _selectDeadline() 決定", example:"type: official_deadline / our_request / counterpart_eta / background" },
  { id:"L09", category:"llm_deadline",  categoryLabel:"LLM 期限選擇", source:"system", is_active:true, trigger:"TA 信件：永遠選我方要求代理人的期限（our_request），不選官方期限", action:"格式：期限M/DD | 無 our_request 時改用「通知官方期限M/DD」", example:"信中有 Opposition Deadline 3/23 和 for review by 3/17 → 期限3/17" },
  { id:"L10", category:"llm_deadline",  categoryLabel:"LLM 期限選擇", source:"system", is_active:true, trigger:"TC 信件：我方期限未過期用「建議M/DD前回覆」，已過期 fallback 官方期限", action:"已過期格式：通知官方期限M/DD | 前綴可能改為「提醒回覆指示-」", example:"回覆期限 2/23 已過 + 官方期限 3/23 → 通知官方期限3/23" },

  // Learned rule
  { id:"L11", category:"llm_feedback",  categoryLabel:"LLM 回饋學習", source:"learned", is_active:true, trigger:"案號前綴 KOI 的公司語義名", action:"統一使用 Cohorizon（原：国昊天诚 / 國昊）", example:"consolidateLearning 歸納自 3 筆修正紀錄（2026-03-16）" },
];

const CATEGORY_META: Record<string, { label: string; color: string; titleColor: string }> = {
  case_format:    { label: "案號格式",       color: "#E8F0FE", titleColor: "#C5DAF0" },
  classification: { label: "專利/商標分類",  color: "#FCE8E6", titleColor: "#F5C6C2" },
  direction_code: { label: "收發碼判定",     color: "#FEF7E0", titleColor: "#F5E6A8" },
  archiving:      { label: "資料夾歸檔",     color: "#E6F4EA", titleColor: "#B7DFC4" },
  filename:       { label: "檔名規則",       color: "#F3E8FD", titleColor: "#D8C0F0" },
  attachment:     { label: "附件處理",       color: "#E8F7FE", titleColor: "#B8DFF5" },
  dedup:          { label: "重跑保護",       color: "#F1F3F4", titleColor: "#D2D6D9" },
  llm_feedback:   { label: "LLM 回饋學習",  color: "#FFF8E1", titleColor: "#FFE082" },
  llm_semantic:   { label: "LLM 語義名規則", color: "#E8F5E9", titleColor: "#A5D6A7" },
  llm_deadline:   { label: "LLM 期限選擇",  color: "#FFF3E0", titleColor: "#FFCC80" },
};

export async function GET() {
  // Group rules by category preserving order
  const groupMap = new Map<string, RuleGroup>();
  for (const rule of RULES) {
    if (!groupMap.has(rule.category)) {
      const meta = CATEGORY_META[rule.category];
      groupMap.set(rule.category, {
        category:   rule.category,
        label:      meta?.label ?? rule.categoryLabel,
        color:      meta?.color ?? "#f9f9fb",
        titleColor: meta?.titleColor ?? "#e8e8ec",
        rules: [],
      });
    }
    groupMap.get(rule.category)!.rules.push(rule);
  }

  const response: ApiResponse<RuleGroup[]> = {
    data: Array.from(groupMap.values()),
    meta: { total: RULES.length, page: 1, limit: 100, total_pages: 1 },
  };
  return Response.json(response);
}

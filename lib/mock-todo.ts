export type Party = "我方" | "客戶" | "代理人" | "政府機關";
export type Priority = "urgent" | "normal" | "low";
export type TodoStatus = "pending" | "in_progress" | "done";

export interface TodoItem {
  id: string;
  case_number: string;
  client: string;
  action: string;
  detail?: string;
  who: Party;
  direction: "send" | "wait" | "review" | "internal";
  deadline?: string;
  source_email_id: string;
  source_subject: string;
  source_date: string;
  priority: Priority;
  status: TodoStatus;
  tags: string[];
  ai_suggestion?: string;
}

export const MOCK_TODOS: TodoItem[] = [
  {
    id: "todo-001",
    case_number: "BRIT25710PUS1",
    client: "BSKB LLP / John Smith",
    action: "審閱 BSKB 提交的 OA 答辯草稿 v1，確認 Claims 修正",
    detail: "John Smith 於 3/17 提交最終答辯草稿，含修正後 Claims 1–11 及測試數據附件。需確認 §103 非顯而易見論點是否充分，官方截止日 4/15，需留 2 週緩衝。",
    who: "我方",
    direction: "review",
    deadline: "2026-03-31",
    source_email_id: "e001",
    source_subject: "RE: BRIT25710PUS1 - Office Action Response",
    source_date: "2026-03-17",
    priority: "urgent",
    status: "pending",
    tags: ["OA答辯", "USPTO", "截止日臨近"],
    ai_suggestion: "建議：優先審閱 Claims 6–10 的非顯而易見論點，這是本次 OA 最主要拒絕理由。",
  },
  {
    id: "todo-002",
    case_number: "KOIT20004TUS7",
    client: "Korean IP Client",
    action: "確認 TA 委託方向是否正確，決定由哪位代理人草擬 OA2 答辯",
    detail: "AI 分類為 TA（寄出・代理人），信心度 94%，但 TC 特徵重疊。需人工確認後，才能正式委託 TA 草擬答辯草稿。OA2 截止日 2026-06-15。",
    who: "我方",
    direction: "internal",
    deadline: "2026-03-20",
    source_email_id: "e002",
    source_subject: "KOIT20004TUS7 - TA委託 Office Action Draft",
    source_date: "2026-03-17",
    priority: "urgent",
    status: "pending",
    tags: ["OA2", "方向碼待確認", "需人工審核"],
    ai_suggestion: "建議：先確認 TA/TC 再委託，避免後續流程錯誤。",
  },
  {
    id: "todo-003",
    case_number: "TWIP22301TW3",
    client: "台灣客戶 A",
    action: "催促客戶提供發明說明書中文版（已要求 2 週未回覆）",
    detail: "3/3 曾寄送請求，至今未收到回覆。若 3/20 前仍未提供，將影響 PCT 申請時程。",
    who: "客戶",
    direction: "wait",
    deadline: "2026-03-20",
    source_email_id: "e004",
    source_subject: "TWIP22301TW3 - 請提供發明說明書中文版",
    source_date: "2026-03-03",
    priority: "urgent",
    status: "in_progress",
    tags: ["催件", "PCT", "逾期風險"],
    ai_suggestion: "已等待 14 天，建議升級聯絡方式（電話或 Line）。",
  },
  {
    id: "todo-004",
    case_number: "USPA24501US2",
    client: "US Client B",
    action: "寄送年費繳納提醒給客戶，確認是否繼續維持",
    detail: "US Patent 年費截止日 2026-04-30，距今 44 天。需客戶書面確認是否繼續維持，若放棄需 3/31 前告知。",
    who: "客戶",
    direction: "send",
    deadline: "2026-03-31",
    source_email_id: "e005",
    source_subject: "USPA24501US2 - Maintenance Fee Reminder",
    source_date: "2026-03-10",
    priority: "normal",
    status: "pending",
    tags: ["年費", "維持確認"],
    ai_suggestion: "建議附上年費金額及放棄後果說明，提高回覆率。",
  },
  {
    id: "todo-005",
    case_number: "EPPA23801EP1",
    client: "European Client C",
    action: "等待 EPO 審查結果，預計 Q2 回覆",
    detail: "已於 2026-01-15 提交 Response to Rule 71(3)，EPO 預計 3 個月內發出 Notice of Grant 或 Communication。無需主動動作，注意收信。",
    who: "政府機關",
    direction: "wait",
    deadline: "2026-06-30",
    source_email_id: "e006",
    source_subject: "EPPA23801EP1 - Response to Rule 71(3) Filed",
    source_date: "2026-01-15",
    priority: "low",
    status: "pending",
    tags: ["EPO", "等待中", "授權程序"],
  },
  {
    id: "todo-006",
    case_number: "BRIT25710PUS1",
    client: "BSKB LLP / John Smith",
    action: "USPTO 回覆後通知 BSKB，同步更新案件狀態",
    detail: "OA 答辯提交後，需監控 USPTO PAIR 系統，有回覆立即通知代理人。預計回覆時間 3–6 個月。",
    who: "政府機關",
    direction: "wait",
    deadline: "2026-09-30",
    source_email_id: "e001",
    source_subject: "RE: BRIT25710PUS1 - Office Action Response",
    source_date: "2026-03-17",
    priority: "low",
    status: "pending",
    tags: ["USPTO", "等待回覆", "PAIR監控"],
  },
];

export const DIRECTION_CONFIG = {
  send:     { label: "我方發出",   color: "#1d4ed8", bg: "#eff6ff" },
  wait:     { label: "等待回覆",   color: "#6b7280", bg: "#f9fafb" },
  review:   { label: "我方審閱",   color: "#7c3aed", bg: "#f5f3ff" },
  internal: { label: "內部確認",   color: "#d97706", bg: "#fffbeb" },
};

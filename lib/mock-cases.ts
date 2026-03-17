// ── Patent Case Domain Types ──────────────────────────────────

export type CaseStatus =
  | "pending_filing"
  | "filed"
  | "under_examination"
  | "oa_issued"
  | "oa_responded"
  | "allowed"
  | "granted"
  | "rejected"
  | "abandoned"
  | "opposed"
  | "appealing";

export type PatentCaseType = "invention" | "utility_model" | "design" | "trademark" | "copyright";
export type Jurisdiction   = "TW" | "US" | "CN" | "JP" | "EP" | "KR" | "DE" | "GB";

export interface PatentCase {
  id:                 string;
  case_number:        string;    // Internal case number
  app_number?:        string;    // Official application number
  patent_number?:     string;    // Granted patent number
  title:              string;
  client_name:        string;
  client_id:          string;
  case_type:          PatentCaseType;
  jurisdiction:       Jurisdiction;
  status:             CaseStatus;
  filing_date?:       string;
  grant_date?:        string;
  expiry_date?:       string;
  next_deadline?:     string;
  next_action?:       string;
  assignee_id:        string;
  assignee_name:      string;
  created_at:         string;
  annuity_year?:      number;
}

export interface StaffMember {
  id:           string;
  name:         string;
  title:        string;
  role:         "attorney" | "paralegal" | "admin" | "intern";
  email:        string;
  specialties:  string[];
  active_cases: number;
  bar_number?:  string;
  joined_at:    string;
  avatar_initials: string;
}

export interface DeadlineItem {
  id:           string;
  case_id:      string;
  case_number:  string;
  case_title:   string;
  client_name:  string;
  type:         "oa_response" | "annuity" | "filing" | "grant_deadline" | "renewal" | "appeal" | "other";
  description:  string;
  due_date:     string;
  assignee_name: string;
  status:       "pending" | "completed" | "extended";
}

// ── Mock Staff ────────────────────────────────────────────────

export const MOCK_STAFF: StaffMember[] = [
  {
    id: "s001",
    name: "陳建志",
    title: "專利師 / 所長",
    role: "attorney",
    email: "james.chen@ipwinner.tw",
    specialties: ["半導體", "電子", "積體電路"],
    active_cases: 31,
    bar_number: "PRO-0583",
    joined_at: "2015-03-01",
    avatar_initials: "陳",
  },
  {
    id: "s002",
    name: "林雅婷",
    title: "專利師",
    role: "attorney",
    email: "ya.lin@ipwinner.tw",
    specialties: ["生技醫藥", "化學", "材料"],
    active_cases: 24,
    bar_number: "PRO-1124",
    joined_at: "2018-07-15",
    avatar_initials: "林",
  },
  {
    id: "s003",
    name: "吳柏翰",
    title: "專利工程師",
    role: "attorney",
    email: "bo.wu@ipwinner.tw",
    specialties: ["機械", "製造", "AI/ML"],
    active_cases: 18,
    bar_number: "PRO-1891",
    joined_at: "2021-02-01",
    avatar_initials: "吳",
  },
  {
    id: "s004",
    name: "黃怡君",
    title: "資深助理",
    role: "paralegal",
    email: "yi.huang@ipwinner.tw",
    specialties: ["商標", "著作權", "案件管理"],
    active_cases: 42,
    joined_at: "2017-09-01",
    avatar_initials: "黃",
  },
  {
    id: "s005",
    name: "張家豪",
    title: "行政助理",
    role: "admin",
    email: "jack.chang@ipwinner.tw",
    specialties: ["年費管理", "申請流程", "客戶聯絡"],
    active_cases: 0,
    joined_at: "2022-06-01",
    avatar_initials: "張",
  },
  {
    id: "s006",
    name: "蘇明達",
    title: "實習生",
    role: "intern",
    email: "ming.su@ipwinner.tw",
    specialties: ["電子", "通訊"],
    active_cases: 5,
    joined_at: "2026-01-10",
    avatar_initials: "蘇",
  },
];

// ── Mock Cases ────────────────────────────────────────────────

export const MOCK_CASES: PatentCase[] = [
  // ── TSMC ──
  {
    id: "c001",
    case_number: "TSMC22001PTW",
    app_number: "111135202",
    patent_number: "TW I812345",
    title: "半導體元件結構及其製造方法",
    client_name: "台積電",
    client_id: "cli001",
    case_type: "invention",
    jurisdiction: "TW",
    status: "granted",
    filing_date: "2022-11-15",
    grant_date: "2024-03-01",
    expiry_date: "2042-11-15",
    next_deadline: "2027-11-15",
    next_action: "第 5 年年費繳納",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2022-10-01",
    annuity_year: 5,
  },
  {
    id: "c002",
    case_number: "TSMC23014PUS",
    app_number: "18/234,701",
    title: "FinFET Gate Dielectric Structure and Method",
    client_name: "台積電",
    client_id: "cli001",
    case_type: "invention",
    jurisdiction: "US",
    status: "oa_issued",
    filing_date: "2023-06-20",
    next_deadline: "2026-04-20",
    next_action: "OA 答辯（Non-Final）截止",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2023-05-10",
  },
  {
    id: "c003",
    case_number: "TSMC24008PCN",
    app_number: "202410123456",
    title: "高電子遷移率薄膜電晶體製造方法",
    client_name: "台積電",
    client_id: "cli001",
    case_type: "invention",
    jurisdiction: "CN",
    status: "under_examination",
    filing_date: "2024-04-10",
    next_deadline: "2026-09-10",
    next_action: "等待實質審查",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2024-03-01",
  },
  // ── MediaTek ──
  {
    id: "c004",
    case_number: "MTKE23005PUS",
    app_number: "18/445,002",
    title: "Adaptive Beamforming with AI-Assisted Channel Prediction",
    client_name: "聯發科技",
    client_id: "cli002",
    case_type: "invention",
    jurisdiction: "US",
    status: "oa_issued",
    filing_date: "2023-10-05",
    next_deadline: "2026-03-31",
    next_action: "OA 答辯（最終）截止",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2023-09-01",
  },
  {
    id: "c005",
    case_number: "MTKE22009PTW",
    app_number: "111108732",
    patent_number: "TW I795678",
    title: "多核心處理器功耗動態管理系統",
    client_name: "聯發科技",
    client_id: "cli002",
    case_type: "invention",
    jurisdiction: "TW",
    status: "granted",
    filing_date: "2022-04-18",
    grant_date: "2024-01-15",
    expiry_date: "2042-04-18",
    next_deadline: "2026-04-18",
    next_action: "第 4 年年費繳納",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2022-03-10",
    annuity_year: 4,
  },
  {
    id: "c006",
    case_number: "MTKE24002PEP",
    app_number: "24701234.5",
    title: "Neuromorphic Computing Architecture for Edge AI Inference",
    client_name: "聯發科技",
    client_id: "cli002",
    case_type: "invention",
    jurisdiction: "EP",
    status: "filed",
    filing_date: "2024-02-28",
    next_deadline: "2026-08-28",
    next_action: "提交 EPO 請求審查",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2024-01-20",
  },
  // ── ADATA ──
  {
    id: "c007",
    case_number: "ADTA23003PTW",
    app_number: "112045521",
    title: "固態硬碟快取管理方法及裝置",
    client_name: "威剛科技",
    client_id: "cli003",
    case_type: "invention",
    jurisdiction: "TW",
    status: "under_examination",
    filing_date: "2023-09-20",
    next_deadline: "2026-05-20",
    next_action: "等待初審意見",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2023-08-15",
  },
  {
    id: "c008",
    case_number: "ADTA24001TTW",
    app_number: "113012345",
    title: "ADATA PRO 系列商標",
    client_name: "威剛科技",
    client_id: "cli003",
    case_type: "trademark",
    jurisdiction: "TW",
    status: "allowed",
    filing_date: "2024-01-10",
    next_deadline: "2026-04-10",
    next_action: "繳納核准費、公告期滿後領證",
    assignee_id: "s004",
    assignee_name: "黃怡君",
    created_at: "2023-12-20",
  },
  // ── Foxconn ──
  {
    id: "c009",
    case_number: "FOXC22018PUS",
    app_number: "17/893,411",
    patent_number: "US 11,892,101",
    title: "Robotic Assembly Line Vision System and Control Method",
    client_name: "鴻海精密",
    client_id: "cli005",
    case_type: "invention",
    jurisdiction: "US",
    status: "granted",
    filing_date: "2022-08-24",
    grant_date: "2024-06-04",
    expiry_date: "2042-08-24",
    next_deadline: "2026-08-24",
    next_action: "3.5 年年費（Maintenance Fee）",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2022-07-10",
    annuity_year: 4,
  },
  {
    id: "c010",
    case_number: "FOXC24003PCN",
    app_number: "202410456789",
    title: "工業機器人末端執行器柔性控制系統",
    client_name: "鴻海精密",
    client_id: "cli005",
    case_type: "invention",
    jurisdiction: "CN",
    status: "filed",
    filing_date: "2024-07-15",
    next_deadline: "2026-12-15",
    next_action: "等待受理通知",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2024-06-01",
  },
  // ── Korean IP Client ──
  {
    id: "c011",
    case_number: "KOIT20004TUS",
    app_number: "16/789,003",
    title: "Wireless Power Transfer Resonant Circuit",
    client_name: "韓國代理 / KOIT",
    client_id: "cli006",
    case_type: "invention",
    jurisdiction: "US",
    status: "oa_issued",
    filing_date: "2020-04-10",
    next_deadline: "2026-06-15",
    next_action: "OA2 答辯截止",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2020-03-01",
  },
  // ── BSKB ──
  {
    id: "c012",
    case_number: "BRIT25710PUS",
    app_number: "17/213,445",
    title: "Machine Learning Model Compression via Structured Pruning",
    client_name: "BSKB LLP",
    client_id: "cli007",
    case_type: "invention",
    jurisdiction: "US",
    status: "oa_responded",
    filing_date: "2021-03-22",
    next_deadline: "2026-09-30",
    next_action: "等待 USPTO 審查回覆",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2021-02-15",
  },
  // ── European Client ──
  {
    id: "c013",
    case_number: "EPPA23801EP",
    app_number: "23702381.4",
    title: "Biodegradable Polymer Composite for Medical Implants",
    client_name: "European Client C",
    client_id: "cli008",
    case_type: "invention",
    jurisdiction: "EP",
    status: "allowed",
    filing_date: "2023-04-20",
    next_deadline: "2026-04-30",
    next_action: "回覆 Rule 71(3) 繳規費",
    assignee_id: "s002",
    assignee_name: "林雅婷",
    created_at: "2023-03-10",
  },
  {
    id: "c014",
    case_number: "USPA24501US",
    app_number: "18/501,234",
    title: "Photovoltaic Cell with Self-Cleaning Nanocoating",
    client_name: "US Client B",
    client_id: "cli009",
    case_type: "invention",
    jurisdiction: "US",
    status: "under_examination",
    filing_date: "2024-05-08",
    next_deadline: "2026-11-08",
    next_action: "等待 USPTO 初審",
    assignee_id: "s002",
    assignee_name: "林雅婷",
    created_at: "2024-04-01",
  },
  // ── Individual / 張明宏 ──
  {
    id: "c015",
    case_number: "ZMHG24001PTW",
    app_number: "113023456",
    title: "智慧鎖具安全驗證方法",
    client_name: "張明宏",
    client_id: "cli004",
    case_type: "invention",
    jurisdiction: "TW",
    status: "filed",
    filing_date: "2024-08-05",
    next_deadline: "2027-08-05",
    next_action: "申請實質審查（3 年期限內）",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2024-07-20",
  },
  {
    id: "c016",
    case_number: "ZMHG24002DTW",
    app_number: "D113004561",
    title: "新式樣：智慧門鎖外觀設計",
    client_name: "張明宏",
    client_id: "cli004",
    case_type: "design",
    jurisdiction: "TW",
    status: "granted",
    filing_date: "2024-03-18",
    grant_date: "2024-11-20",
    expiry_date: "2036-03-18",
    next_deadline: "2027-03-18",
    next_action: "第 3 年年費繳納",
    assignee_id: "s004",
    assignee_name: "黃怡君",
    created_at: "2024-02-28",
    annuity_year: 3,
  },
  // ── Additional cases to fill out ──
  {
    id: "c017",
    case_number: "TSMC23022PJP",
    app_number: "2023-189234",
    title: "High-Density Memory Cell Structure",
    client_name: "台積電",
    client_id: "cli001",
    case_type: "invention",
    jurisdiction: "JP",
    status: "under_examination",
    filing_date: "2023-12-01",
    next_deadline: "2026-06-01",
    next_action: "等待 JPO 審查報告",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2023-11-10",
  },
  {
    id: "c018",
    case_number: "ADTA23007PUS",
    app_number: "18/324,567",
    title: "NAND Flash Wear Leveling Algorithm for Extended Lifespan",
    client_name: "威剛科技",
    client_id: "cli003",
    case_type: "invention",
    jurisdiction: "US",
    status: "abandoned",
    filing_date: "2023-07-25",
    next_action: "已放棄 — 客戶決定不繼續",
    assignee_id: "s003",
    assignee_name: "吳柏翰",
    created_at: "2023-06-10",
  },
  {
    id: "c019",
    case_number: "FOXC23012TTW",
    app_number: "112067890",
    title: "FOXLINK 商標（電子連接器類）",
    client_name: "鴻海精密",
    client_id: "cli005",
    case_type: "trademark",
    jurisdiction: "TW",
    status: "granted",
    filing_date: "2023-05-10",
    grant_date: "2024-09-25",
    expiry_date: "2034-05-10",
    next_deadline: "2029-05-10",
    next_action: "商標維護 / 5 年後續展",
    assignee_id: "s004",
    assignee_name: "黃怡君",
    created_at: "2023-04-15",
  },
  {
    id: "c020",
    case_number: "MTKE24011PKR",
    app_number: "10-2024-0087654",
    title: "Multiband 5G Antenna Array with Dynamic Beam Steering",
    client_name: "聯發科技",
    client_id: "cli002",
    case_type: "invention",
    jurisdiction: "KR",
    status: "filed",
    filing_date: "2024-09-15",
    next_deadline: "2026-09-15",
    next_action: "申請實質審查",
    assignee_id: "s001",
    assignee_name: "陳建志",
    created_at: "2024-08-20",
  },
];

// ── Mock Deadlines ─────────────────────────────────────────────

export const MOCK_DEADLINES: DeadlineItem[] = [
  {
    id: "d001",
    case_id: "c004",
    case_number: "MTKE23005PUS",
    case_title: "Adaptive Beamforming with AI-Assisted Channel Prediction",
    client_name: "聯發科技",
    type: "oa_response",
    description: "Non-Final OA 答辯截止（含 Extensions）",
    due_date: "2026-03-31",
    assignee_name: "陳建志",
    status: "pending",
  },
  {
    id: "d002",
    case_id: "c002",
    case_number: "TSMC23014PUS",
    case_title: "FinFET Gate Dielectric Structure and Method",
    client_name: "台積電",
    type: "oa_response",
    description: "OA 答辯截止（Non-Final）",
    due_date: "2026-04-20",
    assignee_name: "陳建志",
    status: "pending",
  },
  {
    id: "d003",
    case_id: "c013",
    case_number: "EPPA23801EP",
    case_title: "Biodegradable Polymer Composite for Medical Implants",
    client_name: "European Client C",
    type: "grant_deadline",
    description: "Rule 71(3) 回覆 / 繳納規費截止",
    due_date: "2026-04-30",
    assignee_name: "林雅婷",
    status: "pending",
  },
  {
    id: "d004",
    case_id: "c005",
    case_number: "MTKE22009PTW",
    case_title: "多核心處理器功耗動態管理系統",
    client_name: "聯發科技",
    type: "annuity",
    description: "第 4 年專利年費繳納（TW）",
    due_date: "2026-04-18",
    assignee_name: "黃怡君",
    status: "pending",
  },
  {
    id: "d005",
    case_id: "c008",
    case_number: "ADTA24001TTW",
    case_title: "ADATA PRO 系列商標",
    client_name: "威剛科技",
    type: "renewal",
    description: "商標核准費繳納及領證",
    due_date: "2026-04-10",
    assignee_name: "黃怡君",
    status: "pending",
  },
  {
    id: "d006",
    case_id: "c009",
    case_number: "FOXC22018PUS",
    case_title: "Robotic Assembly Line Vision System and Control Method",
    client_name: "鴻海精密",
    type: "annuity",
    description: "US Patent 3.5 年維護費（Maintenance Fee）",
    due_date: "2026-08-24",
    assignee_name: "陳建志",
    status: "pending",
  },
  {
    id: "d007",
    case_id: "c011",
    case_number: "KOIT20004TUS",
    case_title: "Wireless Power Transfer Resonant Circuit",
    client_name: "韓國代理 / KOIT",
    type: "oa_response",
    description: "OA2（Final）答辯截止",
    due_date: "2026-06-15",
    assignee_name: "陳建志",
    status: "pending",
  },
  {
    id: "d008",
    case_id: "c006",
    case_number: "MTKE24002PEP",
    case_title: "Neuromorphic Computing Architecture for Edge AI Inference",
    client_name: "聯發科技",
    type: "filing",
    description: "提交 EPO Request for Examination",
    due_date: "2026-08-28",
    assignee_name: "吳柏翰",
    status: "pending",
  },
  {
    id: "d009",
    case_id: "c016",
    case_number: "ZMHG24002DTW",
    case_title: "新式樣：智慧門鎖外觀設計",
    client_name: "張明宏",
    type: "annuity",
    description: "第 3 年設計專利年費",
    due_date: "2027-03-18",
    assignee_name: "黃怡君",
    status: "pending",
  },
  {
    id: "d010",
    case_id: "c001",
    case_number: "TSMC22001PTW",
    case_title: "半導體元件結構及其製造方法",
    client_name: "台積電",
    type: "annuity",
    description: "第 5 年年費繳納（TW）",
    due_date: "2027-11-15",
    assignee_name: "黃怡君",
    status: "pending",
  },
];

// ── Computed helpers ──────────────────────────────────────────

export const STATUS_LABELS: Record<CaseStatus, string> = {
  pending_filing:    "待申請",
  filed:             "已申請",
  under_examination: "審查中",
  oa_issued:         "OA 發出",
  oa_responded:      "OA 已答辯",
  allowed:           "核准中",
  granted:           "已獲證",
  rejected:          "駁回",
  abandoned:         "已放棄",
  opposed:           "異議中",
  appealing:         "申訴中",
};

export const STATUS_COLORS: Record<CaseStatus, { fg: string; bg: string; border: string }> = {
  pending_filing:    { fg: "#6b7280", bg: "#f9fafb",  border: "#e5e7eb" },
  filed:             { fg: "#1d4ed8", bg: "#eff6ff",  border: "#bfdbfe" },
  under_examination: { fg: "#1d4ed8", bg: "#eff6ff",  border: "#bfdbfe" },
  oa_issued:         { fg: "#92400e", bg: "#fffbeb",  border: "#fde68a" },
  oa_responded:      { fg: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
  allowed:           { fg: "#065f46", bg: "#ecfdf5",  border: "#a7f3d0" },
  granted:           { fg: "#166534", bg: "#f0fdf4",  border: "#bbf7d0" },
  rejected:          { fg: "#991b1b", bg: "#fef2f2",  border: "#fecaca" },
  abandoned:         { fg: "#6b7280", bg: "#f3f4f6",  border: "#e5e7eb" },
  opposed:           { fg: "#9a3412", bg: "#fff7ed",  border: "#fed7aa" },
  appealing:         { fg: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
};

export const TYPE_LABELS: Record<PatentCaseType, string> = {
  invention:     "發明",
  utility_model: "新型",
  design:        "設計",
  trademark:     "商標",
  copyright:     "著作權",
};

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  TW: "台灣", US: "美國", CN: "中國", JP: "日本",
  EP: "歐洲", KR: "韓國", DE: "德國", GB: "英國",
};

export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  oa_response:    "OA 答辯",
  annuity:        "年費",
  filing:         "申請期限",
  grant_deadline: "領證期限",
  renewal:        "續展",
  appeal:         "申訴",
  other:          "其他",
};

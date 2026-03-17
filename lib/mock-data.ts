import type { EmailListItem, Sender, BenefitsStat, Email, Classification, Attachment } from "./types";

export const MOCK_EMAILS: EmailListItem[] = [
  {
    id: "e001",
    message_id: "19ce4a93f5078d7b",
    subject: "RE: BRIT25710PUS1 - Office Action Response",
    sender_email: "john.smith@bskb.com",
    sender_name: "John Smith",
    received_at: "2026-03-17T08:23:00Z",
    has_attachments: true,
    direction_code: "FA",
    case_numbers: ["BRIT25710PUS1"],
    semantic_name: "提交答辯草稿-(OA1)-0317前",
    confidence: 0.97,
    status: "confirmed",
    case_type: "patent",
  },
  {
    id: "e002",
    message_id: "19ce4a93f5078d7c",
    subject: "KOIT20004TUS7 - TA委託 Office Action Draft",
    sender_email: "partner@ipwinner.com",
    sender_name: "IP Winner",
    received_at: "2026-03-17T07:45:00Z",
    has_attachments: false,
    direction_code: "TA",
    case_numbers: ["KOIT20004TUS7"],
    semantic_name: "委託答辯草稿-3/20前",
    confidence: 0.94,
    status: "pending",
    case_type: "patent",
  },
  {
    id: "e003",
    message_id: "19ce85ba8837ea27",
    subject: "Invoice #2026-031 - Patent Prosecution Services",
    sender_email: "billing@questel.com",
    sender_name: "Questel IP",
    received_at: "2026-03-16T15:10:00Z",
    has_attachments: true,
    direction_code: "FC",
    case_numbers: ["KOIS23004BGB5"],
    semantic_name: "收到代理人費用帳單",
    confidence: 0.88,
    status: "confirmed",
    case_type: "trademark",
  },
  {
    id: "e004",
    message_id: "19ce3f89e553f539",
    subject: "BRIT25710PUS1 / BRIT25711PUS1 - Status Update",
    sender_email: "sarah.chen@tilleke.com",
    sender_name: "Sarah Chen",
    received_at: "2026-03-16T11:30:00Z",
    has_attachments: false,
    direction_code: "FA",
    case_numbers: ["BRIT25710PUS1", "BRIT25711PUS1"],
    semantic_name: "代理人案件進度通知",
    confidence: 0.91,
    status: "corrected",
    case_type: "patent",
  },
  {
    id: "e005",
    message_id: "19cd9921ab334f11",
    subject: "TC: KOIS18001TFR1 - Client Instruction Needed",
    sender_email: "contact@ipwinner.com",
    sender_name: "IP Winner",
    received_at: "2026-03-16T09:15:00Z",
    has_attachments: false,
    direction_code: "TC",
    case_numbers: ["KOIS18001TFR1"],
    semantic_name: "通知客戶期限-官方期限4/15",
    confidence: 0.95,
    status: "confirmed",
    case_type: "trademark",
  },
  {
    id: "e006",
    message_id: "19cd1234ef567890",
    subject: "Newsletter: IP Law Updates March 2026",
    sender_email: "news@lexisnexis.com",
    sender_name: "LexisNexis",
    received_at: "2026-03-15T14:00:00Z",
    has_attachments: false,
    direction_code: "FX",
    case_numbers: [],
    semantic_name: "法律新聞通訊",
    confidence: 0.72,
    status: "confirmed",
    case_type: "unknown",
  },
  {
    id: "e007",
    message_id: "19cceab987654321",
    subject: "KOIT20004TUS7 - Government Office Action",
    sender_email: "noreply@uspto.gov",
    sender_name: "USPTO",
    received_at: "2026-03-15T10:22:00Z",
    has_attachments: true,
    direction_code: "FG",
    case_numbers: ["KOIT20004TUS7"],
    semantic_name: "收到官方審查意見-(OA2)-官方期限6/15",
    confidence: 0.99,
    status: "confirmed",
    case_type: "patent",
  },
  {
    id: "e008",
    message_id: "19ccabcdef123456",
    subject: "RE: BRIT25710PUS1 - Confirm Receipt",
    sender_email: "client@britishtech.com",
    sender_name: "British Tech Ltd",
    received_at: "2026-03-14T16:45:00Z",
    has_attachments: false,
    direction_code: null,
    case_numbers: [],
    semantic_name: null,
    confidence: null,
    status: "failed",
    case_type: null,
  },
  {
    id: "e009",
    message_id: "19cc123456789abc",
    subject: "KOIS23004BGB5 等 - 多案號進度報告",
    sender_email: "agent@eip-law.de",
    sender_name: "EIP Law",
    received_at: "2026-03-14T09:00:00Z",
    has_attachments: true,
    direction_code: "FA",
    case_numbers: ["KOIS23004BGB5", "KOIS23005TGB1"],
    semantic_name: "代理人多案件進度報告",
    confidence: 0.86,
    status: "pending",
    case_type: "mixed",
  },
  {
    id: "e010",
    message_id: "19cb987654321abc",
    subject: "TC: 請確認 KOIS18001TFR1 指示",
    sender_email: "contact@ipwinner.com",
    sender_name: "IP Winner",
    received_at: "2026-03-13T11:30:00Z",
    has_attachments: false,
    direction_code: "TC",
    case_numbers: ["KOIS18001TFR1"],
    semantic_name: "催促客戶回覆指示-3/20截止",
    confidence: 0.93,
    status: "confirmed",
    case_type: "trademark",
  },
];

export const MOCK_SENDERS: Sender[] = [
  {
    id: "s001",
    tenant_id: "t001",
    key: "@bskb.com",
    role: "A",
    display_name: "BSKB LLP",
    notes: "美國代理事務所",
    source: "manual",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "s002",
    tenant_id: "t001",
    key: "@tilleke.com",
    role: "A",
    display_name: "Tilleke & Gibbins",
    notes: "東南亞代理所，AI推斷確認",
    source: "ai_inferred",
    created_at: "2026-03-16T00:00:00Z",
    updated_at: "2026-03-16T00:00:00Z",
  },
  {
    id: "s003",
    tenant_id: "t001",
    key: "@lexisnexis.com",
    role: "S",
    display_name: "LexisNexis",
    notes: "廣告/電子報，標記為垃圾",
    source: "feedback",
    created_at: "2026-03-15T00:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
  },
  {
    id: "s004",
    tenant_id: "t001",
    key: "@questel.com",
    role: "A",
    display_name: "Questel IP",
    notes: "歐洲 IP 數據庫",
    source: "manual",
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
];

export const MOCK_STATS = {
  total_processed: 134,
  pending_review: 3,
  accuracy_rate: 0.975,
  hours_saved: 12.28,
  api_cost_usd: 0.11,
  this_week: 28,
};

export const MOCK_BENEFITS: BenefitsStat[] = [
  { date: "2026-03-13", emails_processed: 18, hours_saved: 1.64, api_cost_usd: 0.015, cumulative_emails: 18, cumulative_hours: 1.64 },
  { date: "2026-03-14", emails_processed: 32, hours_saved: 2.91, api_cost_usd: 0.026, cumulative_emails: 50, cumulative_hours: 4.55 },
  { date: "2026-03-15", emails_processed: 24, hours_saved: 2.18, api_cost_usd: 0.020, cumulative_emails: 74, cumulative_hours: 6.73 },
  { date: "2026-03-16", emails_processed: 41, hours_saved: 3.73, api_cost_usd: 0.034, cumulative_emails: 115, cumulative_hours: 10.46 },
  { date: "2026-03-17", emails_processed: 19, hours_saved: 1.73, api_cost_usd: 0.015, cumulative_emails: 134, cumulative_hours: 12.19 },
];

// ── Drive files mock (per case number) ───────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size_bytes: number;
  provider: "google_drive" | "onedrive" | "dropbox";
  path: string;
  url: string;
  case_number: string;
  direction_code: string;
  created_at: string;
  email_id?: string;   // 關聯的 email（若有）
}

export const MOCK_DRIVE_FILES: DriveFile[] = [
  // BRIT25710PUS1
  {
    id: "df001", name: "20260317-FA-BRIT25710PUS1-提交答辯草稿-(OA1)-0317前-附件1.pdf",
    mimeType: "application/pdf", size_bytes: 184320,
    provider: "google_drive",
    path: "Email自動整理v2/專利/BRIT25710PUS1",
    url: "https://drive.google.com/file/d/mock_id_1/view",
    case_number: "BRIT25710PUS1", direction_code: "FA",
    created_at: "2026-03-17T08:27:00Z", email_id: "e001",
  },
  {
    id: "df002", name: "20260317-FA-BRIT25710PUS1-提交答辯草稿-(OA1)-0317前-附件2.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size_bytes: 52480,
    provider: "google_drive",
    path: "Email自動整理v2/專利/BRIT25710PUS1",
    url: "https://drive.google.com/file/d/mock_id_2/view",
    case_number: "BRIT25710PUS1", direction_code: "FA",
    created_at: "2026-03-17T08:27:00Z", email_id: "e001",
  },
  {
    id: "df003", name: "20260316-FA-BRIT25710PUS1-代理人案件進度通知.eml",
    mimeType: "message/rfc822", size_bytes: 28000,
    provider: "google_drive",
    path: "Email自動整理v2/專利/BRIT25710PUS1",
    url: "https://drive.google.com/file/d/mock_id_3/view",
    case_number: "BRIT25710PUS1", direction_code: "FA",
    created_at: "2026-03-16T11:32:00Z", email_id: "e004",
  },
  {
    id: "df004", name: "20260301-TC-BRIT25710PUS1-通知客戶OA意見-附件1.pdf",
    mimeType: "application/pdf", size_bytes: 95000,
    provider: "google_drive",
    path: "Email自動整理v2/專利/BRIT25710PUS1",
    url: "https://drive.google.com/file/d/mock_id_4/view",
    case_number: "BRIT25710PUS1", direction_code: "TC",
    created_at: "2026-03-01T09:10:00Z", email_id: undefined,
  },
  // KOIT20004TUS7
  {
    id: "df005", name: "20260315-FG-KOIT20004TUS7-收到官方審查意見-(OA2)-官方期限6∕15-附件1.pdf",
    mimeType: "application/pdf", size_bytes: 312000,
    provider: "google_drive",
    path: "Email自動整理v2/專利/KOIT20004TUS7",
    url: "https://drive.google.com/file/d/mock_id_5/view",
    case_number: "KOIT20004TUS7", direction_code: "FG",
    created_at: "2026-03-15T10:27:00Z", email_id: "e007",
  },
  {
    id: "df006", name: "20260317-TA-KOIT20004TUS7-委託答辯草稿-3∕20前.eml",
    mimeType: "message/rfc822", size_bytes: 18000,
    provider: "google_drive",
    path: "Email自動整理v2/專利/KOIT20004TUS7",
    url: "https://drive.google.com/file/d/mock_id_6/view",
    case_number: "KOIT20004TUS7", direction_code: "TA",
    created_at: "2026-03-17T07:47:00Z", email_id: "e002",
  },
  {
    id: "df007", name: "20260210-FA-KOIT20004TUS7-收到官方審查意見-(OA1)-附件1.pdf",
    mimeType: "application/pdf", size_bytes: 278000,
    provider: "google_drive",
    path: "Email自動整理v2/專利/KOIT20004TUS7",
    url: "https://drive.google.com/file/d/mock_id_7/view",
    case_number: "KOIT20004TUS7", direction_code: "FG",
    created_at: "2026-02-10T09:00:00Z", email_id: undefined,
  },
  // KOIS23004BGB5
  {
    id: "df008", name: "20260316-FC-KOIS23004BGB5-收到代理人費用帳單-附件1.pdf",
    mimeType: "application/pdf", size_bytes: 64000,
    provider: "google_drive",
    path: "Email自動整理v2/商標/KOIS23004BGB5",
    url: "https://drive.google.com/file/d/mock_id_8/view",
    case_number: "KOIS23004BGB5", direction_code: "FC",
    created_at: "2026-03-16T15:12:00Z", email_id: "e003",
  },
];

// ── Email detail mock (by id) ─────────────────────────────────

export interface EmailDetail {
  email: Email;
  classification: Classification | null;
  attachments: Attachment[];
}

export const MOCK_EMAIL_DETAILS: Record<string, EmailDetail> = {
  e001: {
    email: {
      id: "e001",
      tenant_id: "t001",
      account_id: "acc001",
      message_id: "19ce4a93f5078d7b",
      thread_id: "thread_brit_oa1",
      subject: "RE: BRIT25710PUS1 - Office Action Response",
      sender_email: "john.smith@bskb.com",
      sender_name: "John Smith",
      recipients: [
        { email: "partner@ipwinner.com", name: "IP Winner", type: "to" },
        { email: "cc@ipwinner.com", name: "IP Winner CC", type: "cc" },
      ],
      received_at: "2026-03-17T08:23:00Z",
      body_text: "",
      body_html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c2024">
<p>Dear IP Winner Team,</p>
<p>Please find attached our response to the Office Action for <strong>BRIT25710PUS1</strong>.</p>
<p>We have prepared the draft response addressing all rejections under 35 U.S.C. §103.
Key points covered:</p>
<ul>
  <li>Claim 1-5: Amended to overcome prior art (Smith et al., US 9,123,456)</li>
  <li>Claim 6-10: Argued non-obviousness based on unexpected results</li>
  <li>New Claim 11: Added to further distinguish over prior art</li>
</ul>
<p><strong style="color:#dc2626">Please review and provide your approval by March 17, 2026.</strong>
The USPTO deadline is April 15, 2026.</p>
<p>The amended claims and arguments are in the attached PDF. Please let us know if you need any revisions.</p>
<p>Best regards,<br/>
John Smith<br/>
BSKB LLP | Patent Attorney<br/>
john.smith@bskb.com | +1 (703) 555-0192</p>
</div>`,
      raw_size_bytes: 245000,
      has_attachments: true,
      fetched_at: "2026-03-17T08:25:00Z",
    },
    classification: {
      id: "cls001",
      tenant_id: "t001",
      email_id: "e001",
      case_numbers: ["BRIT25710PUS1"],
      body_case_numbers: ["BRIT25710PUS1"],
      direction_code: "FA",
      case_type: "patent",
      semantic_name: "提交答辯草稿-(OA1)-0317前",
      confidence: 0.97,
      dates_found: [
        { date: "2026-03-17", type: "our_request", description: "Please review by March 17" },
        { date: "2026-04-15", type: "official_deadline", description: "USPTO deadline April 15" },
      ],
      selected_deadline: "2026-03-17",
      sender_role: "A",
      status: "confirmed",
      llm_model: "gemini-3-flash-preview",
      input_tokens: 2840,
      output_tokens: 312,
      classified_at: "2026-03-17T08:26:00Z",
    },
    attachments: [
      {
        id: "att001",
        tenant_id: "t001",
        email_id: "e001",
        filename: "BRIT25710PUS1_OA_Response_Draft_v1.pdf",
        content_type: "application/pdf",
        size_bytes: 184320,
        storage_provider: "google_drive",
        storage_path: "Email自動整理v2/專利/BRIT25710PUS1/20260317-FA-BRIT25710PUS1-提交答辯草稿-(OA1)-0317前-附件1.pdf",
        storage_url: "https://drive.google.com/file/d/mock_id_1/view",
        uploaded_at: "2026-03-17T08:27:00Z",
      },
      {
        id: "att002",
        tenant_id: "t001",
        email_id: "e001",
        filename: "Amended_Claims_BRIT25710PUS1.docx",
        content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size_bytes: 52480,
        storage_provider: "google_drive",
        storage_path: "Email自動整理v2/專利/BRIT25710PUS1/20260317-FA-BRIT25710PUS1-提交答辯草稿-(OA1)-0317前-附件2.docx",
        storage_url: "https://drive.google.com/file/d/mock_id_2/view",
        uploaded_at: "2026-03-17T08:27:00Z",
      },
    ],
  },

  e007: {
    email: {
      id: "e007",
      tenant_id: "t001",
      account_id: "acc001",
      message_id: "19cceab987654321",
      thread_id: "thread_koit_oa2",
      subject: "KOIT20004TUS7 - Government Office Action",
      sender_email: "noreply@uspto.gov",
      sender_name: "USPTO",
      recipients: [{ email: "partner@ipwinner.com", name: "IP Winner", type: "to" }],
      received_at: "2026-03-15T10:22:00Z",
      body_text: "",
      body_html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c2024">
<p><strong>UNITED STATES PATENT AND TRADEMARK OFFICE</strong></p>
<hr/>
<p>Application No.: <strong>KOIT20004TUS7</strong><br/>
Filing Date: 2020-04-15<br/>
Examiner: Dr. Robert Chen</p>
<p>This is a <strong>Non-Final Office Action</strong>. Please respond within 3 months from the mailing date of this action.</p>
<p><strong style="color:#dc2626">Statutory period for response: June 15, 2026</strong></p>
<p>Claims 1-20 are under examination. Claims 1, 5, and 12 are rejected under 35 U.S.C. §103 as being unpatentable over:</p>
<ul>
  <li>Johnson et al. (US 10,234,567) in view of</li>
  <li>Williams (US 2019/0123456)</li>
</ul>
<p>Please see the attached Office Action document for full details.</p>
<p>Sincerely,<br/>USPTO Patent Examining Corps</p>
</div>`,
      raw_size_bytes: 198000,
      has_attachments: true,
      fetched_at: "2026-03-15T10:25:00Z",
    },
    classification: {
      id: "cls007",
      tenant_id: "t001",
      email_id: "e007",
      case_numbers: ["KOIT20004TUS7"],
      body_case_numbers: ["KOIT20004TUS7"],
      direction_code: "FG",
      case_type: "patent",
      semantic_name: "收到官方審查意見-(OA2)-官方期限6/15",
      confidence: 0.99,
      dates_found: [
        { date: "2026-06-15", type: "official_deadline", description: "Statutory period June 15, 2026" },
      ],
      selected_deadline: "2026-06-15",
      sender_role: "G",
      status: "confirmed",
      llm_model: "gemini-3-flash-preview",
      input_tokens: 1920,
      output_tokens: 289,
      classified_at: "2026-03-15T10:26:00Z",
    },
    attachments: [
      {
        id: "att003",
        tenant_id: "t001",
        email_id: "e007",
        filename: "OfficeAction_KOIT20004TUS7_20260315.pdf",
        content_type: "application/pdf",
        size_bytes: 312000,
        storage_provider: "google_drive",
        storage_path: "Email自動整理v2/專利/KOIT20004TUS7/20260315-FG-KOIT20004TUS7-收到官方審查意見-(OA2)-官方期限6/15-附件1.pdf",
        storage_url: "https://drive.google.com/file/d/mock_id_3/view",
        uploaded_at: "2026-03-15T10:27:00Z",
      },
    ],
  },
};

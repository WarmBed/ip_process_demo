// ── Core domain types ──────────────────────────────────────────

export type DirectionCode = "FA" | "FC" | "TA" | "TC" | "FG" | "TG" | "FX" | "TX";
export type SenderRole = "C" | "A" | "G" | "S" | "X";
export type CaseType = "patent" | "trademark" | "mixed" | "unknown";
export type ClassificationStatus = "pending" | "confirmed" | "corrected" | "failed";
export type EmailProvider = "gmail" | "outlook" | "imap";
export type StorageProvider = "google_drive" | "dropbox" | "s3" | "r2";

// ── Tenant ────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  settings: TenantSettings;
  created_at: string;
}

export interface TenantSettings {
  case_number_regex?: string;
  own_domains: string[];
  llm_model: string;
  fetch_interval_minutes: number;
}

// ── Email Account ─────────────────────────────────────────────

export interface EmailAccount {
  id: string;
  tenant_id: string;
  provider: EmailProvider;
  email: string;
  display_name: string;
  last_fetched_at: string | null;
  fetch_interval_minutes: number;
  is_active: boolean;
  created_at: string;
}

// ── Email ─────────────────────────────────────────────────────

export interface Email {
  id: string;
  tenant_id: string;
  account_id: string;
  message_id: string;
  thread_id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  recipients: Recipient[];
  received_at: string;
  body_text?: string;
  body_html?: string;
  raw_size_bytes: number;
  has_attachments: boolean;
  fetched_at: string;
}

export interface Recipient {
  email: string;
  name: string;
  type: "to" | "cc" | "bcc";
}

// ── Attachment ────────────────────────────────────────────────

export interface Attachment {
  id: string;
  tenant_id: string;
  email_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_provider: StorageProvider;
  storage_path: string;
  storage_url?: string;
  uploaded_at: string;
}

// ── Classification ────────────────────────────────────────────

export interface Classification {
  id: string;
  tenant_id: string;
  email_id: string;
  case_numbers: string[];         // 歸檔案號
  body_case_numbers: string[];    // 內文案號（僅記錄）
  direction_code: DirectionCode;
  case_type: CaseType;
  semantic_name: string;          // AI 語義名
  confidence: number;             // 0.0 ~ 1.0
  dates_found: DateFound[];
  selected_deadline: string | null;
  sender_role: SenderRole;
  status: ClassificationStatus;
  llm_model: string;
  input_tokens: number;
  output_tokens: number;
  classified_at: string;
}

export interface DateFound {
  date: string;
  type: "official_deadline" | "our_request" | "counterpart_eta" | "background";
  description: string;
}

// ── Case Mapping ──────────────────────────────────────────────

export interface EmailCaseMapping {
  id: string;
  email_id: string;
  case_number: string;
  is_primary: boolean;
  folder_path: string | null;
  storage_provider: StorageProvider | null;
}

// ── Sender ────────────────────────────────────────────────────

export interface Sender {
  id: string;
  tenant_id: string;
  key: string;                    // '@domain.com' or 'full@email.com'
  role: SenderRole;
  display_name: string;
  notes: string;
  source: "manual" | "ai_inferred" | "feedback";
  created_at: string;
  updated_at: string;
}

// ── Correction ────────────────────────────────────────────────

export interface Correction {
  id: string;
  tenant_id: string;
  classification_id: string;
  corrected_by: string;
  field: "direction_code" | "semantic_name" | "sender_role";
  old_value: string;
  new_value: string;
  reason: string;
  created_at: string;
}

// ── API response format ───────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
}

// ── View models (API response shapes) ────────────────────────

/** 信件列表用（含分類結果）*/
export interface EmailListItem {
  id: string;
  message_id: string;
  subject: string;
  sender_email: string;
  sender_name: string;
  received_at: string;
  has_attachments: boolean;
  // classification
  direction_code: DirectionCode | null;
  case_numbers: string[];
  semantic_name: string | null;
  confidence: number | null;
  status: ClassificationStatus | null;
  case_type: CaseType | null;
}

/** 效益統計 */
export interface BenefitsStat {
  date: string;
  emails_processed: number;
  hours_saved: number;
  api_cost_usd: number;
  cumulative_emails: number;
  cumulative_hours: number;
}

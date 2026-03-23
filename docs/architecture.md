# Email Processor SaaS — 系統架構設計

> 版本：v0.1（討論稿）
> 日期：2026-03-17

---

## 一、系統目標

將 IP 事務所的 Email 分類、歸檔、回授學習流程，做成可多租戶的 SaaS 產品。

核心流程：
```
Email（Gmail / Outlook / 其他）
  → 撈信（OAuth per tenant）
  → 解析 & 存入 PostgreSQL
  → LLM 分類（Gemini / 可替換）
  → 結果寫回 DB
  → Web Dashboard 查看 / 修正
  → 回授學習 → 改善分類
```

---

## 二、Tech Stack

| 層級 | 技術 | 備註 |
|------|------|------|
| 前端 | Next.js 15 | App Router，React Server Components |
| 後端 API | Next.js API Routes / Route Handlers | 初期合併在同一 repo |
| 資料庫 | PostgreSQL（Supabase） | 初期 Docker self-hosted，後期上 Supabase Cloud |
| Auth | Supabase Auth | 內建 multi-tenant，支援 OAuth |
| Storage（metadata） | PostgreSQL | 附件位置記錄在 DB |
| Storage（實體檔案） | Google Drive / Dropbox / S3（per tenant 設定） | 不強制綁定單一服務 |
| 背景任務 | pg-boss（PostgreSQL-based job queue） | 利用現有 PQ，不需額外 Redis |
| LLM | Gemini Flash（可抽換） | 透過 provider interface 抽象 |
| 部署（初期） | Docker Compose | Supabase + App 一起跑 |
| 部署（後期） | Vercel + Supabase Cloud | 或 Railway / Zeabur |

### 關於 Rust
Next.js 內建 Turbopack（Rust bundler），不需要自己寫或安裝 Rust。

---

## 三、Multi-Tenant 設計

### 租戶隔離策略：Row-Level Security（RLS）

使用 PostgreSQL RLS，每張 table 加 `tenant_id`，透過 Supabase Auth 的 JWT 自動過濾。

```
tenant A 的 user → 只能看到 tenant_id = A 的資料
tenant B 的 user → 只能看到 tenant_id = B 的資料
```

優點：
- 資料在同一個 DB，運維簡單
- Supabase 原生支援 RLS policy
- 不需要 schema-per-tenant 的複雜度

### Tenant 層級
```
Tenant（事務所）
  └── User（事務所內的人，不同權限）
       └── Email Account（該 tenant 授權的信箱，可多個）
```

---

## 四、Email 接入層設計

### 4.1 支援的 Provider

| Provider | 協定 | OAuth |
|----------|------|-------|
| Gmail | Gmail REST API | Google OAuth 2.0 |
| Outlook / Microsoft 365 | Microsoft Graph API | Microsoft OAuth 2.0 |
| 未來：Yahoo / IMAP | IMAP over OAuth | 各自 OAuth |

### 4.2 Provider 抽象層

所有 email provider 統一實作同一個介面：

```typescript
interface EmailProvider {
  name: string                          // 'gmail' | 'outlook' | ...
  fetchNewMessages(account, since): Promise<RawMessage[]>
  fetchMessageDetail(account, messageId): Promise<RawMessage>
  fetchAttachment(account, attachmentId): Promise<Buffer>
  refreshToken(account): Promise<TokenSet>
}
```

新增 provider 只需實作這個介面，上層 pipeline 不需改動。

### 4.3 OAuth Token 管理

```
tenant 首次設定 → 授權頁面（Google / Microsoft OAuth）
→ access_token + refresh_token 加密存入 DB
→ 每次撈信前：若 access_token 快過期 → 自動 refresh
→ refresh 失敗 → 通知 tenant 重新授權
```

Token 加密：使用 AES-256，金鑰存在環境變數，不明文存 DB。

### 4.4 撈信機制（Polling）

- 預設每 60 分鐘一次（per tenant 可在後台設定，範圍 15min ~ 24hr）
- 使用 `pg-boss` job queue，每個 email account 一個獨立 job
- 每次撈信記錄 `last_fetched_at`，只撈這個時間點之後的新信

```
定時器（pg-boss scheduled job）
  → 找出所有 active email accounts
  → 每個 account 建立一個 fetch_emails job
  → job worker 執行撈信 → 存入 DB → 觸發 LLM 分類 job
```

---

## 五、資料庫 Schema（PostgreSQL）

### 5.1 核心 Tables

```sql
-- 租戶（事務所）
tenants
  id            uuid PK
  name          text
  slug          text UNIQUE         -- URL 用
  settings      jsonb               -- 自訂設定（案號格式、分類規則等）
  created_at    timestamptz

-- 使用者
users
  id            uuid PK             -- 對應 Supabase Auth user
  tenant_id     uuid FK tenants
  role          text                -- 'admin' | 'member' | 'viewer'
  created_at    timestamptz

-- Email 帳號（per tenant，可多個）
email_accounts
  id            uuid PK
  tenant_id     uuid FK tenants
  provider      text                -- 'gmail' | 'outlook'
  email         text
  display_name  text
  access_token  text (encrypted)
  refresh_token text (encrypted)
  token_expires_at timestamptz
  last_fetched_at  timestamptz
  fetch_interval_minutes int DEFAULT 60
  is_active     boolean DEFAULT true
  created_at    timestamptz

-- 原始信件
emails
  id            uuid PK
  tenant_id     uuid FK tenants
  account_id    uuid FK email_accounts
  message_id    text                -- provider 原始 message ID
  thread_id     text                -- Gmail thread / Outlook conversation
  subject       text
  sender_email  text
  sender_name   text
  recipients    jsonb               -- [{email, name, type: 'to'|'cc'|'bcc'}]
  received_at   timestamptz
  body_text     text                -- 純文字 body
  body_html     text                -- HTML body
  raw_size_bytes int
  has_attachments boolean
  fetched_at    timestamptz
  UNIQUE(tenant_id, account_id, message_id)

-- 附件（metadata only，實體檔案在外部 storage）
attachments
  id            uuid PK
  tenant_id     uuid FK tenants
  email_id      uuid FK emails
  filename      text
  content_type  text
  size_bytes    int
  storage_provider text            -- 'google_drive' | 'dropbox' | 's3'
  storage_path  text               -- 外部 storage 的路徑或 file ID
  storage_url   text               -- 可選：直連 URL（若 storage 支援）
  uploaded_at   timestamptz

-- LLM 分類結果（對應原本的「處理紀錄 Sheet」）
email_classifications
  id            uuid PK
  tenant_id     uuid FK tenants
  email_id      uuid FK emails
  case_numbers  text[]              -- 歸檔案號（可多個）
  body_case_numbers text[]          -- 內文案號（僅記錄）
  direction_code text              -- FA/FC/TA/TC/FG/TG/FX/TX
  case_type     text               -- 'patent' | 'trademark' | 'mixed' | 'unknown'
  semantic_name text               -- AI 語義名
  confidence    float              -- 0.0 ~ 1.0
  dates_found   jsonb              -- 結構化期限資料
  selected_deadline date
  sender_role   text               -- 'C' | 'A' | 'G' | 'S' | 'X'
  status        text               -- 'pending' | 'confirmed' | 'corrected' | 'failed'
  llm_model     text
  input_tokens  int
  output_tokens int
  classified_at timestamptz

-- 人工修正（回授）
corrections
  id            uuid PK
  tenant_id     uuid FK tenants
  classification_id uuid FK email_classifications
  corrected_by  uuid FK users
  field         text               -- 'direction_code' | 'semantic_name' | 'sender_role'
  old_value     text
  new_value     text
  reason        text
  created_at    timestamptz

-- Sender 名單（per tenant）
senders
  id            uuid PK
  tenant_id     uuid FK tenants
  key           text               -- '@domain.com' 或 'full@email.com'
  role          text               -- 'C' | 'A' | 'G' | 'S'
  display_name  text
  notes         text
  source        text               -- 'manual' | 'ai_inferred' | 'feedback'
  created_at    timestamptz
  updated_at    timestamptz
  UNIQUE(tenant_id, key)

-- 分類規則（per tenant，可自訂）
classification_rules
  id            uuid PK
  tenant_id     uuid FK tenants
  rule_id       text               -- 'L01', 'C01' 等
  category      text
  description   text
  is_active     boolean DEFAULT true
  created_at    timestamptz

-- 背景 Job 紀錄（pg-boss 管理，這裡只記 summary）
processing_jobs
  id            uuid PK
  tenant_id     uuid FK tenants
  job_type      text               -- 'fetch_emails' | 'classify' | 'consolidate_learning'
  status        text               -- 'pending' | 'running' | 'completed' | 'failed'
  payload       jsonb
  result        jsonb
  started_at    timestamptz
  completed_at  timestamptz

-- 效益統計（per tenant per day）
benefits_stats
  id            uuid PK
  tenant_id     uuid FK tenants
  date          date
  emails_processed int
  hours_saved   float
  api_cost_usd  float
  UNIQUE(tenant_id, date)
```

---

## 六、處理 Pipeline

```
[撈信 Job]
  1. 呼叫 EmailProvider.fetchNewMessages()
  2. 去重（message_id UNIQUE constraint）
  3. 存入 emails table
  4. 每封信 enqueue [分類 Job]

[分類 Job]
  1. 讀 email + 相關 thread emails
  2. 讀 tenant 的 senders / rules / corrections（few-shot）
  3. 組 LLM prompt → 呼叫 Gemini API
  4. 解析回應 → 寫入 email_classifications
  5. 若需要歸檔附件 → enqueue [附件歸檔 Job]

[附件歸檔 Job]
  1. 從 email provider 下載附件
  2. 上傳到 tenant 設定的 storage（Drive / Dropbox / S3）
  3. 記錄 storage_path 到 attachments table

[consolidateLearning Job]（每週一次）
  1. 讀近期 corrections
  2. LLM 歸納成規則
  3. 寫回 classification_rules
```

---

## 七、外部 Storage 策略

附件實體檔案不存在 PostgreSQL，使用 per-tenant 設定的外部 storage：

| Storage | 設定方式 | 記錄欄位 |
|---------|----------|----------|
| Google Drive | service account 或 user OAuth | folder_id + file_id |
| Dropbox | App OAuth token | path |
| AWS S3 / R2 | access key + bucket | bucket + key |

`attachments.storage_provider` + `attachments.storage_path` 足以重建任何 storage 的完整連結。

Dashboard 搜尋附件時，直接 query DB，找到後用 storage_path 生成臨時下載連結。

---

## 八、初期部署（Docker Compose）

```
services:
  app          # Next.js (前端 + API)
  supabase-db  # PostgreSQL
  supabase-auth
  supabase-storage  # 可選，若要存小型附件
  supabase-studio   # 開發時用
```

待系統穩定後，DB 遷移至 Supabase Cloud，app 部署至 Vercel / Zeabur。

---

## 九、頁面結構（確認版）

Layout：**Navbar（頂部）+ Agent Panel（左側常駐）+ Content（右側）**

```
┌─ Navbar: Logo │ 總覽 │ 信件 │ Senders │ 規則 │ 統計 │ 設定 │ [tenant] [user] ─┐
│ ┌─ Agent Panel (300px) ──────┐  ┌─ Content ──────────────────────────────┐  │
│ │  💬 AI 助理                │  │  各頁主內容                             │  │
│ │  支援圖片上傳               │  │                                        │  │
│ │  自然語言查詢 DB            │  │                                        │  │
│ └────────────────────────────┘  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

| # | 路徑 | 說明 |
|---|------|------|
| 1 | `/` | Landing（目前 redirect → /app）|
| 2 | `/login` | 登入 / 註冊 |
| 3 | `/pricing` | 定價 |
| 4 | `/app` | 總覽 widget |
| 5 | `/app/emails` | 信件列表（預設頁）|
| 6 | `/app/emails/[id]` | 單封信詳情 + 修正 |
| 7 | `/app/senders` | Sender 名單 |
| 8 | `/app/rules` | 分類規則 |
| 9 | `/app/stats` | 效益統計 |
| 10 | `/app/settings` | 設定（tabs：信箱/儲存/排程/一般）|
| 11 | `/admin` | 租戶 + 用戶管理 |

## 十、開發原則

### API-First
- 所有功能透過 `/api/v1/` REST API 存取
- UI 和 Agent 都是 API consumer，地位平等
- 標準 response: `{ data, meta?, error? }`

### TDD
- 先寫 API spec + unit test，再實作
- DB 測試用 transaction rollback 隔離
- 工具：Vitest + Testing Library + Playwright（E2E，Phase 2）

### Queue（pg-boss）
- 不需要 Redis，job queue 直接存在 PostgreSQL
- 適合 Supabase Docker self-hosted 架構

## 十一、Schema 補充（v2）

`email_case_mappings` 獨立 table（方案 B）：
```sql
email_case_mappings
  id              uuid PK
  email_id        uuid FK emails
  case_number     text
  is_primary      boolean
  folder_path     text
  storage_provider text
```
優點：可直接 query 「某案號的所有信件」，效能好。

---

*更新紀錄：2026-03-17 v0.2（確認技術決策，開始實作）*

"use client";

import { useState } from "react";
import { Button, Badge, IconButton, TextArea } from "@radix-ui/themes";
import { ExternalLink, X, FileText, Clock, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { MOCK_EMAIL_DETAILS, MOCK_EMAILS } from "@/lib/mock-data";

// ── Storage provider icon ──
export function StorageIcon({ provider }: { provider?: string }) {
  if (provider === "google_drive") return (
    <svg width="15" height="13" viewBox="0 0 87 78" style={{ flexShrink: 0 }}>
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#1967D2"/>
      <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#34A853"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z" fill="#EA4335"/>
      <path d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832D"/>
      <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#4285F4"/>
      <path d="M73.4 26.5L60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 27H87.3c0-1.55-.4-3.1-1.2-4.5z" fill="#FBBC04"/>
    </svg>
  );
  if (provider === "dropbox") return (
    <svg width="15" height="13" viewBox="0 0 528 444" style={{ flexShrink: 0 }}>
      <path d="M132 0L0 88l132 88 132-88zm264 0L264 88l132 88 132-88zM0 264l132 88 132-88-132-88zm264 0l132 88 132-88-132-88zM132 376l132 68 132-68-132-88z" fill="#0061FF"/>
    </svg>
  );
  if (provider === "onedrive") return (
    <svg width="15" height="13" viewBox="0 0 48 35" style={{ flexShrink: 0 }}>
      <path d="M29 13.5C27.7 7.8 22.7 3.5 16.8 3.5 11.5 3.5 7 6.7 5 11.3 2 12 0 14.7 0 18c0 3.9 3.1 7 7 7h21.5c3.6 0 6.5-2.9 6.5-6.5 0-2.8-1.8-5.2-4.5-6-.3-.3-.3-.7-.5-1z" fill="#0078D4"/>
      <path d="M30.5 10C28.2 10 26.1 11 24.5 12.7c2.8.8 5 2.8 6.1 5.3H38c3.3 0 6 2.7 6 6s-2.7 6-6 6H22l-1 .5H38c4.4 0 8-3.6 8-8 0-4.2-3.2-7.6-7.3-8C37.8 11.8 34.3 10 30.5 10z" fill="#1490DF"/>
    </svg>
  );
  return <FileText size={14} color="var(--gray-9)" style={{ flexShrink: 0 }} />;
}

// ── Constants ──
export const AI_ACTIONS = [
  { key: "confirm", label: "確認分類", color: "green" as const },
  { key: "archive", label: "歸檔",     color: "gray" as const },
  { key: "rule",    label: "加入規則",  color: "violet" as const },
  { key: "manual",  label: "人工審核",  color: "orange" as const },
];

export const MOCK_RELATED_DOCS = [
  { name: "BRIT25710PUS1_Original_OA.pdf", date: "2025-01-15", size: "245 KB", provider: "google_drive" },
  { name: "Draft_Response_v2.docx",         date: "2025-03-01", size: "88 KB",  provider: "google_drive" },
  { name: "Claims_Amended_v3.docx",         date: "2025-03-10", size: "42 KB",  provider: "dropbox" },
  { name: "IPO_Fee_Schedule_2025.pdf",       date: "2025-02-20", size: "120 KB", provider: "onedrive" },
];

const CODE_COLORS: Record<string, string> = {
  FA: "#2563eb", FC: "#7c3aed", TA: "#059669", TC: "#d97706",
  FG: "#dc2626", TG: "#9ca3af", FX: "#6b7280",
};

const MOCK_AI_SUMMARIES: Record<string, { text: string; count: number; span: string; action?: string }> = {
  e001: {
    count: 4, span: "3 個月",
    text: "BSKB (John Smith) 已於 **3/17** 提交最終 OA 答辯草稿，含修正後 Claims 1-11 及附件 PDF。本案歷經 USPTO 發出官方 OA → IP Winner 審閱建議 → BSKB 草稿 → 最終版本。",
    action: "建議行動：3/17 前審閱附件確認，官方截止 **4/15**。",
  },
  e002: {
    count: 3, span: "2 天",
    text: "USPTO 3/15 發出 OA2，IP Winner 3/16 轉知客戶並評估，3/17 委託代理人草擬答辯草稿。方向碼 **TA（寄出 / 代理人）**，待確認是否正確。",
    action: "待確認：TA 與 TC 收發方向相似，請人工審核確認後歸檔。",
  },
};

// ── Email detail panel ──
export function EmailDetailPanel({ emailId, onClose, onNavigate }: {
  emailId: string;
  onClose: () => void;
  onNavigate: (url: string) => void;
}) {
  const detail  = MOCK_EMAIL_DETAILS[emailId];
  const summary = MOCK_EMAILS.find(e => e.id === emailId);
  const email   = detail?.email ?? summary as any;
  const cls     = detail?.classification;
  const atts    = detail?.attachments ?? [];

  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [docsOpen, setDocsOpen]         = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [comment, setComment]           = useState("");
  const [commentSent, setCommentSent]   = useState(false);

  if (!email) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const code    = cls?.direction_code ?? summary?.direction_code ?? "";
  const codeClr = CODE_COLORS[code] ?? "#6b7280";

  const bodyText = email.body_html
    ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : email.body_text ?? "";

  const recipients = (email.recipients ?? []).filter((r: any) => r.type === "to");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", minWidth: 0 }}>

      {/* Header */}
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--gray-6)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gray-2)", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-11)" }}>信件詳情</span>
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="outline" size="1" color="gray" onClick={() => onNavigate(`/app/emails/${emailId}`)} style={{ gap: 4, fontSize: 11 }}>
            <ExternalLink size={10} /> 完整頁面
          </Button>
          <IconButton variant="ghost" size="1" color="gray" onClick={onClose}>
            <X size={13} />
          </IconButton>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {code && (
            <span style={{ fontSize: 12, fontWeight: 700, color: codeClr, background: `${codeClr}18`, padding: "3px 9px", borderRadius: 5, border: `1px solid ${codeClr}30` }}>
              {code}
            </span>
          )}
          {cls?.case_type && (
            <Badge variant="soft" color="gray" size="1">
              {cls.case_type === "patent" ? "專利" : "商標"}
            </Badge>
          )}
          {cls?.status && (
            <Badge
              variant="soft"
              size="1"
              color={cls.status === "confirmed" ? "green" : cls.status === "corrected" ? "blue" : cls.status === "failed" ? "red" : "orange"}
            >
              {{ pending: "待確認", confirmed: "已確認", corrected: "已修正", failed: "失敗" }[cls.status]}
            </Badge>
          )}
          {cls?.confidence && (
            <span style={{ fontSize: 10, color: "var(--gray-9)", marginLeft: "auto" }}>
              信心 {Math.round(cls.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Subject */}
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-12)", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
          {email.subject}
        </div>

        {/* AI Thread Summary */}
        {MOCK_AI_SUMMARIES[emailId] && (() => {
          const s = MOCK_AI_SUMMARIES[emailId];
          return (
            <div style={{ border: "1px solid var(--green-6)", borderRadius: 6, overflow: "hidden", background: "var(--green-2)" }}>
              <div style={{ padding: "7px 12px", background: "var(--green-3)", borderBottom: "1px solid var(--green-6)", display: "flex", alignItems: "center", gap: 6 }}>
                <Bot size={12} color="var(--green-11)" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-11)" }}>對話摘要</span>
                <span style={{ fontSize: 10, color: "var(--green-9)", marginLeft: 4 }}>
                  {s.count} 封信 · 跨越 {s.span}
                </span>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <p style={{ fontSize: 12, color: "var(--green-12)", lineHeight: 1.7, margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: s.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                />
                {s.action && (
                  <div style={{ marginTop: 7, padding: "5px 8px", background: "var(--green-3)", borderRadius: 5, borderLeft: "2px solid var(--green-9)", fontSize: 11, color: "var(--green-11)" }}
                    dangerouslySetInnerHTML={{ __html: s.action.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "var(--gray-2)", borderRadius: 6, border: "1px solid var(--gray-6)" }}>
          {[
            { label: "寄件人", value: `${email.sender_name} <${email.sender_email}>` },
            { label: "時間",   value: fmt(email.received_at) },
            ...(recipients.length > 0 ? [{ label: "收件人", value: recipients.map((r: any) => r.name || r.email).join(", ") }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--gray-9)", minWidth: 44, flexShrink: 0 }}>{label}</span>
              <span style={{ color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Case numbers */}
        {(cls?.case_numbers ?? summary?.case_numbers ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--gray-9)", marginBottom: 5, fontWeight: 600 }}>案號</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(cls?.case_numbers ?? summary?.case_numbers ?? []).map((cn: string) => (
                <Badge key={cn} variant="soft" color="blue" size="1" style={{ fontFamily: "monospace", fontWeight: 600 }}>
                  {cn}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deadline */}
        {cls?.selected_deadline && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "var(--red-2)", borderRadius: 6, border: "1px solid var(--red-6)" }}>
            <Clock size={13} color="var(--red-9)" />
            <div>
              <div style={{ fontSize: 10, color: "var(--red-9)", fontWeight: 600 }}>行動期限</div>
              <div style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: 500 }}>
                {new Date(cls.selected_deadline).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        )}

        {/* AI action suggestions */}
        <div style={{ padding: "10px 12px", background: "var(--gray-2)", borderRadius: 6, border: "1px solid var(--gray-6)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", marginBottom: 7 }}>建議動作</div>
          {cls?.status === "pending" && (
            <div style={{ fontSize: 11, color: "var(--green-11)", marginBottom: 8, padding: "5px 8px", background: "var(--green-2)", borderRadius: 5, borderLeft: "2px solid var(--green-9)" }}>
              建議確認為 {code} 分類，可直接歸檔或標記人工審核
            </div>
          )}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {AI_ACTIONS.map(a => (
              <Button
                key={a.key}
                variant={activeAction === a.key ? "solid" : "outline"}
                size="1"
                color={a.color}
                onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          {activeAction && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--gray-11)", padding: "5px 8px", background: "var(--gray-3)", borderRadius: 5 }}>
              已標記「{AI_ACTIONS.find(a => a.key === activeAction)?.label}」，點擊再次確認送出
            </div>
          )}
        </div>

        {/* AI semantic name */}
        {(cls?.semantic_name ?? summary?.semantic_name) && (
          <div style={{ padding: "8px 10px", background: "var(--gray-2)", borderRadius: 6, border: "1px solid var(--gray-6)" }}>
            <div style={{ fontSize: 10, color: "var(--gray-9)", marginBottom: 3, fontWeight: 600 }}>語義名</div>
            <div style={{ fontSize: 12, color: "var(--gray-12)", fontFamily: "monospace" }}>
              {cls?.semantic_name ?? summary?.semantic_name}
            </div>
          </div>
        )}

        {/* Body */}
        {bodyText && (
          <div>
            <div style={{ fontSize: 11, color: "var(--gray-9)", marginBottom: 6, fontWeight: 600 }}>信件內容</div>
            <div style={{
              fontSize: 12, color: "var(--gray-11)", lineHeight: 1.7,
              padding: "10px 12px", background: "var(--gray-2)", borderRadius: 6,
              border: "1px solid var(--gray-6)",
              maxHeight: bodyExpanded ? 9999 : 180, overflow: "hidden",
              position: "relative", transition: "max-height 0.2s",
            }}>
              {bodyText}
              {!bodyExpanded && bodyText.length > 300 && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, var(--gray-2))" }} />
              )}
            </div>
            {bodyText.length > 300 && (
              <button onClick={() => setBodyExpanded(!bodyExpanded)}
                style={{ marginTop: 4, fontSize: 11, color: "var(--gray-9)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {bodyExpanded ? "收起" : "顯示完整內容"}
              </button>
            )}
          </div>
        )}

        {/* Related docs */}
        <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
          <div onClick={() => setDocsOpen(!docsOpen)}
            style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: docsOpen ? "var(--gray-3)" : "var(--gray-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} color="var(--gray-9)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>相關案件文件</span>
              <Badge variant="soft" color="gray" size="1">{MOCK_RELATED_DOCS.length}</Badge>
            </div>
            {docsOpen ? <ChevronUp size={13} color="var(--gray-9)" /> : <ChevronDown size={13} color="var(--gray-9)" />}
          </div>
          {docsOpen && MOCK_RELATED_DOCS.map((doc, i) => (
            <div key={i} style={{ padding: "8px 12px", borderTop: "1px solid var(--gray-6)", display: "flex", alignItems: "center", gap: 8 }}>
              <StorageIcon provider={doc.provider} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>{doc.date} · {doc.size}</div>
              </div>
              <ExternalLink size={10} color="var(--gray-9)" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Attachments */}
        {atts.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--gray-9)", marginBottom: 6, fontWeight: 600 }}>附件（{atts.length}）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {atts.map((att: any) => (
                <a key={att.id} href={att.storage_url} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--gray-2)", border: "1px solid var(--gray-6)", borderRadius: 6, textDecoration: "none", transition: "background 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--gray-2)")}>
                  <StorageIcon provider={att.storage_provider} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.filename}</div>
                    <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>
                      {(att.size_bytes / 1024).toFixed(0)} KB ·{" "}
                      {{ google_drive: "Google Drive", dropbox: "Dropbox", onedrive: "OneDrive" }[att.storage_provider as string] ?? att.storage_provider}
                    </div>
                  </div>
                  <ExternalLink size={10} color="var(--gray-9)" style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div style={{ padding: "10px 12px", background: "var(--gray-2)", borderRadius: 6, border: "1px solid var(--gray-6)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", marginBottom: 6 }}>留言 · 協助學習規則</div>
          {commentSent ? (
            <div style={{ fontSize: 11, color: "var(--green-11)", padding: "4px 0" }}>已送出，系統將參考此意見更新分類規則</div>
          ) : (
            <>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="補充說明，例如：「這封應歸類為 FC，因為 Questel 是費用代理商」"
                rows={3}
                style={{ width: "100%", border: "1px solid var(--gray-6)", borderRadius: 6, padding: "7px 9px", fontSize: 11, lineHeight: 1.6, background: "var(--color-background)", color: "var(--gray-12)", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <Button
                variant={comment.trim() ? "solid" : "soft"}
                size="1"
                color={comment.trim() ? "green" : "gray"}
                onClick={() => { if (comment.trim()) setCommentSent(true); }}
                disabled={!comment.trim()}
                style={{ marginTop: 6 }}
              >
                送出
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--gray-6)", flexShrink: 0 }}>
        <Button
          variant="solid"
          size="2"
          color="green"
          onClick={() => onNavigate(`/app/emails/${emailId}`)}
          style={{ width: "100%", justifyContent: "center", gap: 6 }}
        >
          <ExternalLink size={13} /> 開啟完整信件頁面
        </Button>
      </div>
    </div>
  );
}

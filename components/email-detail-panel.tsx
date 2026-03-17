"use client";

import { useState } from "react";
import { ExternalLink, X, FileText, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { MOCK_EMAIL_DETAILS, MOCK_EMAILS } from "@/lib/mock-data";

// ── Storage provider icon ──────────────────────────────────────

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
  return <FileText size={14} color="var(--fg-muted)" style={{ flexShrink: 0 }} />;
}

// ── Constants ──────────────────────────────────────────────────

export const AI_ACTIONS = [
  { key: "confirm", label: "✓ 確認分類", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "archive", label: "🗃 歸檔",     color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  { key: "rule",    label: "+ 加入規則",  color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  { key: "manual",  label: "⚑ 人工審核",  color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
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

// ── Email detail panel ─────────────────────────────────────────

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
      <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sl2)", flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)" }}>信件詳情</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => onNavigate(`/app/emails/${emailId}`)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-muted)", background: "var(--sl3)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 8px", cursor: "pointer" }}>
            <ExternalLink size={10} /> 完整頁面
          </button>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "3px 5px" }}>
            <X size={13} />
          </button>
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
            <span style={{ fontSize: 11, background: "var(--sl3)", color: "var(--fg-muted)", padding: "3px 8px", borderRadius: 5, border: "1px solid var(--border)" }}>
              {cls.case_type === "patent" ? "專利" : "商標"}
            </span>
          )}
          {cls?.status && (
            <span className={`badge badge-${cls.status}`} style={{ fontSize: 10 }}>
              {{ pending: "待確認", confirmed: "已確認", corrected: "已修正", failed: "失敗" }[cls.status]}
            </span>
          )}
          {cls?.confidence && (
            <span style={{ fontSize: 10, color: "var(--fg-subtle)", marginLeft: "auto" }}>
              信心 {Math.round(cls.confidence * 100)}%
            </span>
          )}
        </div>

        {/* Subject */}
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", lineHeight: 1.4, letterSpacing: "-0.01em" }}>
          {email.subject}
        </div>

        {/* Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", background: "var(--sl2)", borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { label: "寄件人", value: `${email.sender_name} <${email.sender_email}>` },
            { label: "時間",   value: fmt(email.received_at) },
            ...(recipients.length > 0 ? [{ label: "收件人", value: recipients.map((r: any) => r.name || r.email).join(", ") }] : []),
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 8, fontSize: 12 }}>
              <span style={{ color: "var(--fg-subtle)", minWidth: 44, flexShrink: 0 }}>{label}</span>
              <span style={{ color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Case numbers */}
        {(cls?.case_numbers ?? summary?.case_numbers ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 5, fontWeight: 600 }}>案號</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(cls?.case_numbers ?? summary?.case_numbers ?? []).map(cn => (
                <span key={cn} style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 600, background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 4, border: "1px solid #bfdbfe" }}>
                  {cn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Deadline */}
        {cls?.selected_deadline && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "#fef2f2", borderRadius: 7, border: "1px solid #fca5a5" }}>
            <Clock size={13} color="#dc2626" />
            <div>
              <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 600 }}>行動期限</div>
              <div style={{ fontSize: 12, color: "var(--fg)", fontWeight: 500 }}>
                {new Date(cls.selected_deadline).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
              </div>
            </div>
          </div>
        )}

        {/* AI action suggestions */}
        <div style={{ padding: "10px 12px", background: "var(--sl2)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 7 }}>🤖 AI 建議動作</div>
          {cls?.status === "pending" && (
            <div style={{ fontSize: 11, color: "#1d4ed8", marginBottom: 8, padding: "5px 8px", background: "#eff6ff", borderRadius: 5, borderLeft: "2px solid #3b82f6" }}>
              建議確認為 {code} 分類，可直接歸檔或標記人工審核
            </div>
          )}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {AI_ACTIONS.map(a => (
              <button key={a.key}
                onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
                style={{
                  fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                  border: `1px solid ${activeAction === a.key ? a.color : a.border}`,
                  background: activeAction === a.key ? a.color : a.bg,
                  color: activeAction === a.key ? "white" : a.color,
                  fontWeight: activeAction === a.key ? 600 : 400, transition: "all 0.12s",
                }}>
                {a.label}
              </button>
            ))}
          </div>
          {activeAction && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--fg-muted)", padding: "5px 8px", background: "var(--sl3)", borderRadius: 5 }}>
              ✓ 已標記「{AI_ACTIONS.find(a => a.key === activeAction)?.label.replace(/^[^ ]+ /, "")}」，點擊再次確認送出
            </div>
          )}
        </div>

        {/* AI semantic name */}
        {(cls?.semantic_name ?? summary?.semantic_name) && (
          <div style={{ padding: "8px 10px", background: "var(--sl2)", borderRadius: 7, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginBottom: 3, fontWeight: 600 }}>AI 語義名</div>
            <div style={{ fontSize: 12, color: "var(--fg)", fontFamily: "monospace" }}>
              {cls?.semantic_name ?? summary?.semantic_name}
            </div>
          </div>
        )}

        {/* Body (expandable) */}
        {bodyText && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 6, fontWeight: 600 }}>信件內容</div>
            <div style={{
              fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.7,
              padding: "10px 12px", background: "var(--sl2)", borderRadius: 7,
              border: "1px solid var(--border)",
              maxHeight: bodyExpanded ? 9999 : 180, overflow: "hidden",
              position: "relative", transition: "max-height 0.2s",
            }}>
              {bodyText}
              {!bodyExpanded && bodyText.length > 300 && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, var(--sl2))" }} />
              )}
            </div>
            {bodyText.length > 300 && (
              <button onClick={() => setBodyExpanded(!bodyExpanded)}
                style={{ marginTop: 4, fontSize: 11, color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {bodyExpanded ? "↑ 收起" : "↓ 顯示完整內容"}
              </button>
            )}
          </div>
        )}

        {/* Related client docs (expandable) */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div onClick={() => setDocsOpen(!docsOpen)}
            style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: docsOpen ? "var(--sl3)" : "var(--sl2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={12} color="var(--fg-muted)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>相關案件文件</span>
              <span style={{ fontSize: 10, color: "var(--fg-subtle)", background: "var(--sl4)", padding: "0 5px", borderRadius: 4 }}>{MOCK_RELATED_DOCS.length}</span>
            </div>
            {docsOpen ? <ChevronUp size={13} color="var(--fg-muted)" /> : <ChevronDown size={13} color="var(--fg-muted)" />}
          </div>
          {docsOpen && MOCK_RELATED_DOCS.map((doc, i) => (
            <div key={i} style={{ padding: "8px 12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <StorageIcon provider={doc.provider} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{doc.date} · {doc.size}</div>
              </div>
              <ExternalLink size={10} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Attachments */}
        {atts.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 6, fontWeight: 600 }}>附件（{atts.length}）</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {atts.map((att: any) => (
                <a key={att.id} href={att.storage_url} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--sl2)", border: "1px solid var(--border)", borderRadius: 7, textDecoration: "none", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--sl3)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--sl2)")}>
                  <StorageIcon provider={att.storage_provider} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.filename}</div>
                    <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>
                      {(att.size_bytes / 1024).toFixed(0)} KB ·{" "}
                      {{ google_drive: "Google Drive", dropbox: "Dropbox", onedrive: "OneDrive" }[att.storage_provider as string] ?? att.storage_provider}
                    </div>
                  </div>
                  <ExternalLink size={10} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Comment / AI learning */}
        <div style={{ padding: "10px 12px", background: "var(--sl2)", borderRadius: 8, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 6 }}>💬 留言給 AI · 協助學習規則</div>
          {commentSent ? (
            <div style={{ fontSize: 11, color: "#16a34a", padding: "4px 0" }}>✓ 已送出，AI 將參考此意見更新分類規則</div>
          ) : (
            <>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="補充說明，例如：「這封應歸類為 FC，因為 Questel 是費用代理商」"
                rows={3}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 9px", fontSize: 11, lineHeight: 1.6, background: "var(--bg)", color: "var(--fg)", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <button onClick={() => { if (comment.trim()) setCommentSent(true); }} disabled={!comment.trim()}
                style={{ marginTop: 6, fontSize: 11, padding: "4px 12px", borderRadius: 5, border: "none", background: comment.trim() ? "var(--fg)" : "var(--sl4)", color: comment.trim() ? "var(--bg)" : "var(--fg-subtle)", cursor: comment.trim() ? "pointer" : "default" }}>
                送出 · AI 將學習
              </button>
            </>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={() => onNavigate(`/app/emails/${emailId}`)} className="btn-primary"
          style={{ width: "100%", justifyContent: "center", gap: 6 }}>
          <ExternalLink size={13} /> 開啟完整信件頁面
        </button>
      </div>
    </div>
  );
}

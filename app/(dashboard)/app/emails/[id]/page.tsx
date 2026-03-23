"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { Loading } from "@/components/loading";
import {
  ArrowLeft, Paperclip, ExternalLink, Clock, Hash,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  FileText, FileImage, File, UserCheck, RotateCcw, MessageSquare,
  Bot, ChevronRight,
} from "lucide-react";
import { Button, Badge, IconButton } from "@radix-ui/themes";
import type { ApiResponse, Classification, Attachment } from "@/lib/types";
import type { EmailDetail, DriveFile } from "@/lib/mock-data";

// ── Storage provider icons ─────────────────────────────────────

const STORAGE_ICONS: Record<string, React.ReactNode> = {
  google_drive: (
    <svg width="14" height="14" viewBox="0 0 87.3 78" fill="none">
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.35z" fill="#ea4335"/>
      <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
      <path d="M59.8 53H87.3L73.55 28.5 57.4 0 43.65 25 59.8 53z" fill="#2684fc"/>
      <path d="M27.5 53L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.8 53z" fill="#ffba00"/>
    </svg>
  ),
  onedrive: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M10.5 18.5H6a4 4 0 01-.5-7.97 5.5 5.5 0 0110.76-1.4A3.5 3.5 0 0118 15.5a3.5 3.5 0 01-3.5 3H10.5z" fill="#0078d4"/>
      <path d="M14 18.5H20a2.5 2.5 0 000-5h-.1a4 4 0 00-7.4-2.9" fill="#28a8e8"/>
    </svg>
  ),
};

const STORAGE_LABELS: Record<string, string> = {
  google_drive: "Google Drive", onedrive: "OneDrive",
  dropbox: "Dropbox", s3: "AWS S3", r2: "Cloudflare R2",
};

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.includes("pdf")) return <FileText size={16} color="var(--red-9)" />;
  if (contentType.includes("image")) return <FileImage size={16} color="var(--blue-9)" />;
  if (contentType.includes("word") || contentType.includes("document")) return <FileText size={16} color="var(--blue-9)" />;
  return <File size={16} color="var(--gray-11)" />;
}

function formatBytes(b: number) {
  return b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

const CODE_COLORS: Record<string, string> = {
  FA: "#1e40af", FC: "#166534", TA: "#7c3aed", TC: "#92400e",
  FG: "#0e7490", TG: "#0f766e", FX: "#57534e", TX: "#57534e",
};
const CODE_LABELS: Record<string, string> = {
  FA: "收到・代理人", FC: "收到・客戶", TA: "寄出・代理人", TC: "寄出・客戶",
  FG: "收到・政府",  TG: "寄出・政府", FX: "收到・未知",  TX: "寄出・未知",
};

// ── Mock thread data ───────────────────────────────────────────

interface ThreadMsg {
  id: string; from: string; from_email: string;
  date: string; subject: string; body: string;
  direction_code?: string; isCurrent?: boolean;
}

const MOCK_THREADS: Record<string, ThreadMsg[]> = {
  e001: [
    { id: "t001-1", from: "USPTO", from_email: "noreply@uspto.gov", date: "2025-12-15T18:30:00Z", subject: "BRIT25710PUS1 - Office Action Mailed", direction_code: "FG", body: "Dear Applicant,\n\nPlease find enclosed Office Action dated December 15, 2025 for application BRIT25710PUS1. Applicant is required to respond within three months. The application has been rejected under 35 U.S.C. §103 (Claims 1–11) and §112 (Claim 7). Please contact your representative for further instructions.\n\nUnited States Patent and Trademark Office" },
    { id: "t001-2", from: "IP Winner", from_email: "contact@ipwinner.com", date: "2025-12-22T09:15:00Z", subject: "RE: BRIT25710PUS1 - Office Action Review", direction_code: "TC", body: "Dear John,\n\nWe have reviewed the Office Action dated December 15 for BRIT25710PUS1. The examiner cited Smith et al. (US 9,123,456) as prior art for Claims 1–5 and applied §103 obviousness for Claims 6–10.\n\nWe recommend preparing a response addressing:\n1. Amend Claim 7 to overcome §112\n2. Argue non-obviousness for Claims 6–10 based on unexpected results\n3. Add Claim 11 to further distinguish\n\nPlease provide your draft response by February 28.\n\nBest regards,\nIP Winner Team" },
    { id: "t001-3", from: "John Smith", from_email: "john.smith@bskb.com", date: "2026-02-28T14:00:00Z", subject: "RE: BRIT25710PUS1 - Draft Response v1", direction_code: "FA", body: "Dear IP Winner,\n\nPlease find attached draft v1 of the Office Action response for BRIT25710PUS1. We have addressed all three rejection points:\n\n- Claims 1–5: Amended to overcome prior art (Smith et al.)\n- Claims 6–10: Argued non-obviousness with test data attached\n- New Claim 11: Added to further distinguish over prior art\n\nPlease review and provide feedback. We need final approval by March 15 to allow time for filing.\n\nBest,\nJohn Smith, BSKB LLP" },
    { id: "e001",   from: "John Smith", from_email: "john.smith@bskb.com", date: "2026-03-17T08:23:00Z", subject: "RE: BRIT25710PUS1 - Office Action Response", direction_code: "FA", isCurrent: true, body: "" },
  ],
  e002: [
    { id: "t002-1", from: "USPTO", from_email: "noreply@uspto.gov", date: "2026-03-15T10:22:00Z", subject: "KOIT20004TUS7 - Government Office Action (OA2)", direction_code: "FG", body: "Dear Applicant,\n\nOffice Action No. 2 has been mailed for application KOIT20004TUS7. The examiner has maintained the §103 rejection over Kim et al. (US 10,234,567). Response is due by June 15, 2026. Please contact your registered representative.\n\nUSPTO" },
    { id: "t002-2", from: "IP Winner", from_email: "partner@ipwinner.com", date: "2026-03-16T08:00:00Z", subject: "FW: KOIT20004TUS7 - OA2 Received", direction_code: "TC", body: "Dear Client,\n\nWe have received OA2 for KOIT20004TUS7 (forwarded above). The examiner maintained rejection over Kim et al. We recommend preparing a detailed response.\n\nWe will contact our TA attorney to draft the response. Please confirm if you would like us to proceed.\n\nIP Winner" },
    { id: "e002",   from: "IP Winner", from_email: "partner@ipwinner.com", date: "2026-03-17T07:45:00Z", subject: "KOIT20004TUS7 - TA委託 Office Action Draft", direction_code: "TA", isCurrent: true, body: "" },
  ],
};

const MOCK_AI_SUMMARIES: Record<string, { text: string; count: number; span: string; action?: string }> = {
  e001: {
    count: 4, span: "3 個月",
    text: "BSKB (John Smith) 已於 **3/17** 提交最終 OA 答辯草稿，含修正後 Claims 1–11 及附件 PDF。本案歷經 USPTO 發出官方 OA → IP Winner 審閱建議 → BSKB 草稿 → 最終版本。",
    action: "建議行動：3/17 前審閱附件確認，官方截止 **4/15**。",
  },
  e002: {
    count: 3, span: "2 天",
    text: "USPTO 3/15 發出 OA2，IP Winner 3/16 轉知客戶並評估，3/17 委託代理人草擬答辯草稿。方向碼 **TA（寄出・代理人）**，待確認是否正確。",
    action: "待確認：TA 與 TC 收發方向相似，請人工審核確認後歸檔。",
  },
};

const DEFAULT_THREAD = (id: string, email: any): ThreadMsg[] => [
  { id, from: email?.sender_name ?? "", from_email: email?.sender_email ?? "", date: email?.received_at ?? "", subject: email?.subject ?? "", direction_code: undefined, isCurrent: true, body: "" },
];

// ── Avatar ─────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  FG: "#0e7490", FA: "#1e40af", FC: "#166534", TA: "#7c3aed",
  TC: "#92400e", TG: "#0f766e", FX: "#57534e",
};

function Avatar({ name, code }: { name: string; code?: string }) {
  const bg = code ? (AVATAR_COLORS[code] ?? "var(--gray-9)") : "var(--gray-9)";
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg + "22", border: `1.5px solid ${bg}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: bg }}>{name[0]?.toUpperCase() ?? "?"}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail]               = useState<EmailDetail | null>(null);
  const [driveFiles, setDriveFiles]       = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading]   = useState(false);
  const [loading, setLoading]             = useState(true);
  const [clsExpanded, setClsExpanded]     = useState(true);
  const [driveExpanded, setDriveExpanded] = useState(true);
  const [reviewDone, setReviewDone]       = useState(false);
  const [expandedMsgs, setExpandedMsgs]   = useState<Set<string>>(new Set([id]));

  useEffect(() => {
    fetch(`/api/v1/emails/${id}`)
      .then(r => r.json())
      .then((d: ApiResponse<EmailDetail>) => {
        setDetail(d.data);
        setLoading(false);
        const caseNumbers = d.data?.classification?.case_numbers ?? [];
        if (caseNumbers.length > 0) {
          setDriveLoading(true);
          fetch(`/api/v1/drive/search?case_number=${caseNumbers.join(",")}`)
            .then(r => r.json())
            .then((dr: ApiResponse<DriveFile[]>) => { setDriveFiles(dr.data ?? []); setDriveLoading(false); })
            .catch(() => setDriveLoading(false));
        }
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading pad={60} />;
  if (!detail)  return <div style={{ padding: 40, textAlign: "center", color: "var(--gray-9)" }}>找不到此信件</div>;

  const { email, classification: cls, attachments } = detail;
  const thread    = MOCK_THREADS[id] ?? DEFAULT_THREAD(id, email);
  const aiSummary = MOCK_AI_SUMMARIES[id];

  const toggleMsg = (msgId: string) => {
    setExpandedMsgs(prev => {
      const n = new Set(prev);
      n.has(msgId) ? n.delete(msgId) : n.add(msgId);
      return n;
    });
  };

  return (
    <div style={{ padding: "20px 28px", maxWidth: 960 }}>

      {/* Back + subject */}
      <Link href="/app/emails" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--gray-11)", marginBottom: 14, textDecoration: "none" }}>
        <ArrowLeft size={14} /> 返回信件列表
      </Link>
      <h1 style={{ fontSize: 17, fontWeight: 600, color: "var(--gray-12)", margin: "0 0 16px", lineHeight: 1.4, letterSpacing: "-0.02em" }}>
        {email.subject}
      </h1>

      {/* ── AI Thread Summary ── */}
      {aiSummary && (
        <div style={{ marginBottom: 18, border: "1px solid var(--violet-6)", borderRadius: 6, overflow: "hidden", background: "var(--violet-2)" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--violet-6)", display: "flex", alignItems: "center", gap: 8, background: "var(--violet-3)" }}>
            <Bot size={14} color="var(--violet-11)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--violet-11)" }}>AI 對話摘要</span>
            <span style={{ fontSize: 11, color: "var(--violet-9)", marginLeft: 4 }}>
              {aiSummary.count} 封信 · 跨越 {aiSummary.span}
            </span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <p style={{ fontSize: 13, color: "var(--violet-12)", lineHeight: 1.7, margin: 0 }}
              dangerouslySetInnerHTML={{ __html: aiSummary.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
            />
            {aiSummary.action && (
              <div style={{ marginTop: 8, padding: "7px 10px", background: "var(--violet-3)", borderRadius: 6, borderLeft: "3px solid var(--violet-9)", fontSize: 12, color: "var(--violet-11)" }}
                dangerouslySetInnerHTML={{ __html: aiSummary.action.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 272px", gap: 14, alignItems: "start" }}>

        {/* ── Left: Thread ── */}
        <div>

          {/* Classification bar */}
          {cls && (
            <div style={{ padding: "8px 14px", background: "var(--gray-2)", border: "1px solid var(--gray-6)", borderRadius: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              {(() => {
                const color = CODE_COLORS[cls.direction_code] ?? "#57534e";
                return (
                  <span style={{ padding: "2px 10px", borderRadius: 5, fontSize: 12, fontWeight: 600, background: color + "15", color, border: `1px solid ${color}30` }}>
                    {cls.direction_code} · {CODE_LABELS[cls.direction_code]}
                  </span>
                );
              })()}
              {cls.case_numbers.map(c => (
                <span key={c} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--gray-11)" }}>
                  <Hash size={11} /><span style={{ fontFamily: "ui-monospace, monospace" }}>{c}</span>
                </span>
              ))}
              {cls.status === "confirmed" && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <Badge variant="soft" color="green" size="1"><CheckCircle size={10} style={{ marginRight: 2 }} /> 已確認</Badge>
                </span>
              )}
              {cls.status === "pending" && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <Badge variant="soft" color="orange" size="1"><AlertCircle size={10} style={{ marginRight: 2 }} /> 待確認</Badge>
                </span>
              )}
            </div>
          )}

          {/* Thread messages */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "9px 14px", background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)", display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={13} color="var(--gray-11)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>對話紀錄</span>
              <Badge variant="soft" color="gray" size="1">{thread.length} 封</Badge>
            </div>

            {thread.map((msg, idx) => {
              const isExpanded  = expandedMsgs.has(msg.id);
              const isCurrent   = msg.isCurrent;
              const isLast      = idx === thread.length - 1;
              const codeClr     = CODE_COLORS[msg.direction_code ?? ""] ?? "var(--gray-9)";
              const body        = isCurrent
                ? (email.body_html ? email.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : email.body_text ?? "")
                : msg.body;
              const fmt = (iso: string) => new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

              return (
                <div key={msg.id} style={{ borderBottom: isLast ? "none" : "1px solid var(--gray-6)", background: isCurrent ? "var(--color-background)" : "var(--gray-2)" }}>

                  {/* Message header - always visible */}
                  <div
                    onClick={() => toggleMsg(msg.id)}
                    style={{ padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={el => (el.currentTarget.style.background = "var(--gray-3)")}
                    onMouseLeave={el => (el.currentTarget.style.background = "transparent")}
                  >
                    <Avatar name={msg.from} code={msg.direction_code} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 500, color: "var(--gray-12)" }}>{msg.from}</span>
                        <span style={{ fontSize: 11, color: "var(--gray-9)" }}>&lt;{msg.from_email}&gt;</span>
                        {isCurrent && <Badge variant="soft" color="violet" size="1">本封</Badge>}
                      </div>
                      {!isExpanded && (
                        <div style={{ fontSize: 12, color: "var(--gray-9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {body.slice(0, 100)}{body.length > 100 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {msg.direction_code && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 3, color: codeClr, background: `${codeClr}15`, border: `1px solid ${codeClr}25` }}>
                          {msg.direction_code}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--gray-9)", minWidth: 80, textAlign: "right" }}>{fmt(msg.date)}</span>
                      {isExpanded ? <ChevronUp size={13} color="var(--gray-9)" /> : <ChevronDown size={13} color="var(--gray-9)" />}
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--gray-6)", background: "var(--color-background)" }}>
                      {/* Full headers */}
                      <div style={{ padding: "10px 16px 8px", display: "flex", flexDirection: "column", gap: 4, borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)" }}>
                        {[
                          { label: "寄件人", value: `${msg.from} <${msg.from_email}>` },
                          { label: "時間",   value: new Date(msg.date).toLocaleString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) },
                          ...(isCurrent && email.recipients?.length ? [{
                            label: "收件人",
                            value: email.recipients.filter((r: any) => r.type === "to").map((r: any) => r.email).join(", "),
                          }] : []),
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                            <span style={{ color: "var(--gray-9)", minWidth: 48, flexShrink: 0 }}>{label}</span>
                            <span style={{ color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Body */}
                      <div style={{ padding: "16px 18px", fontSize: 13, lineHeight: 1.75, color: "var(--gray-12)", whiteSpace: "pre-wrap" }}>
                        {isCurrent && email.body_html
                          ? <div dangerouslySetInnerHTML={{ __html: email.body_html }} />
                          : body || <span style={{ color: "var(--gray-9)" }}>(no content)</span>
                        }
                      </div>

                      {/* Attachments (current email only) */}
                      {isCurrent && attachments.length > 0 && (
                        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 600, marginBottom: 2 }}>
                            <Paperclip size={11} style={{ marginRight: 4 }} />附件（{attachments.length}）
                          </div>
                          {attachments.map(att => <AttachmentRow key={att.id} attachment={att} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Drive related files */}
          {(driveLoading || driveFiles.length > 0) && cls && (
            <div style={{ marginTop: 14 }}>
              <Section
                title={driveLoading ? `正在搜尋 ${cls.case_numbers.join(", ")} 相關檔案...` : `案號相關檔案（${driveFiles.length}）`}
                expanded={driveExpanded}
                onToggle={() => setDriveExpanded(v => !v)}
              >
                {driveLoading
                  ? <Loading pad={16} label="Searching" />
                  : <DriveFilesSection files={driveFiles} currentEmailId={id} />}
              </Section>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {cls && (cls.status === "pending" || reviewDone) && (
            <ReviewPanel emailId={id} currentCode={cls.direction_code} reviewDone={reviewDone} onReviewed={() => setReviewDone(true)} />
          )}

          {cls && (
            <Section title="AI 分類結果" expanded={clsExpanded} onToggle={() => setClsExpanded(v => !v)}>
              <ClassificationPanel cls={cls} />
            </Section>
          )}

          <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)", fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>EML 歸檔位置</div>
            <div style={{ padding: "12px 14px" }}>
              {attachments.length > 0
                ? <StoragePath provider={attachments[0].storage_provider} path={attachments[0].storage_path.replace(/[^/]+$/, "").replace(/\/$/, "")} url={attachments[0].storage_url} />
                : <span style={{ fontSize: 12, color: "var(--gray-9)" }}>尚未歸檔</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function Section({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--gray-2)", border: "none", borderBottom: expanded ? "1px solid var(--gray-6)" : "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>
        {title}
        {expanded ? <ChevronUp size={13} color="var(--gray-9)" /> : <ChevronDown size={13} color="var(--gray-9)" />}
      </button>
      {expanded && children}
    </div>
  );
}

function AttachmentRow({ attachment: att }: { attachment: Attachment }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: "1px solid var(--gray-6)", borderRadius: 6, background: "var(--gray-2)" }}>
      <FileIcon contentType={att.content_type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.filename}</div>
        <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{formatBytes(att.size_bytes)}</span>
          <span>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>{STORAGE_ICONS[att.storage_provider]}{STORAGE_LABELS[att.storage_provider] ?? att.storage_provider}</span>
        </div>
        <div style={{ marginTop: 3, fontSize: 10, color: "var(--gray-9)", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.storage_path}</div>
      </div>
      {att.storage_url && (
        <a href={att.storage_url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          <Button variant="outline" color="gray" size="1" style={{ gap: 4, flexShrink: 0, cursor: "pointer" }}>
            <ExternalLink size={11} /> 開啟
          </Button>
        </a>
      )}
    </div>
  );
}

function ClassificationPanel({ cls }: { cls: Classification }) {
  const color = CODE_COLORS[cls.direction_code] ?? "#57534e";
  const confidence = Math.round(cls.confidence * 100);
  const confColor = confidence >= 90 ? "var(--green-9)" : confidence >= 70 ? "var(--amber-9)" : "var(--red-9)";
  return (
    <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>語義名</div>
        <div style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 500 }}>{cls.semantic_name || "—"}</div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>收發碼</div>
        <span style={{ padding: "2px 10px", borderRadius: 5, fontSize: 12, fontWeight: 600, background: color + "15", color, border: `1px solid ${color}30` }}>
          {cls.direction_code} · {CODE_LABELS[cls.direction_code]}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>信心分數</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--gray-4)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${confidence}%`, height: "100%", background: confColor, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: confColor, minWidth: 32 }}>{confidence}%</span>
        </div>
      </div>
      {cls.selected_deadline && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>行動期限</div>
          <div style={{ fontSize: 13, color: "var(--gray-12)", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="var(--gray-9)" />
            {new Date(cls.selected_deadline).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      )}
      {cls.dates_found.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>偵測到的日期</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {cls.dates_found.map((d, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--gray-11)", display: "flex", gap: 6 }}>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--gray-12)" }}>{d.date}</span>
                <span style={{ color: "var(--gray-9)" }}>·</span>
                <span>{d.type === "official_deadline" ? "官方期限" : d.type === "our_request" ? "我方要求" : d.type === "counterpart_eta" ? "對方預計" : "背景日期"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoragePath({ provider, path, url }: { provider: string; path: string; url?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>{STORAGE_ICONS[provider]}<span style={{ fontSize: 12, fontWeight: 500, color: "var(--gray-12)" }}>{STORAGE_LABELS[provider]}</span></div>
      <div style={{ fontSize: 11, color: "var(--gray-9)", fontFamily: "ui-monospace, monospace", lineHeight: 1.5, wordBreak: "break-all" }}>{path}</div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none", width: "fit-content" }}>
          <Button variant="outline" color="gray" size="1" style={{ gap: 4, cursor: "pointer" }}>
            <ExternalLink size={11} />在 {STORAGE_LABELS[provider]} 中開啟
          </Button>
        </a>
      )}
    </div>
  );
}

const ALL_CODES = ["FA","FC","TA","TC","FG","TG","FX","TX"];

function ReviewPanel({ emailId, currentCode, reviewDone, onReviewed }: { emailId: string; currentCode: string; reviewDone: boolean; onReviewed: () => void }) {
  const [code, setCode] = useState(currentCode);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (reviewDone) return (
    <div style={{ border: "1px solid var(--green-6)", borderRadius: 6, overflow: "hidden", background: "var(--green-2)" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 7 }}>
        <CheckCircle size={14} color="var(--green-11)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green-11)" }}>已完成人工審核</span>
      </div>
    </div>
  );

  const handleSubmit = async (newStatus: "confirmed" | "corrected") => {
    setSaving(true);
    await fetch(`/api/v1/emails/${emailId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus, direction_code: code, reviewer_note: note }) });
    setSaving(false);
    onReviewed();
  };

  return (
    <div style={{ border: "1px solid var(--amber-6)", borderRadius: 6, overflow: "hidden", background: "var(--amber-2)" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--amber-6)", background: "var(--amber-3)", display: "flex", alignItems: "center", gap: 7 }}>
        <AlertCircle size={13} color="var(--orange-11)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--orange-11)" }}>待人工審核</span>
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--orange-11)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>收發碼</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {ALL_CODES.map(c => {
              const color = CODE_COLORS[c] ?? "#57534e";
              const active = c === code;
              return (
                <button key={c} onClick={() => setCode(c)} style={{ padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s", background: active ? color : color + "12", color: active ? "#fff" : color, border: `1px solid ${color}40` }}>
                  {c}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 5, fontSize: 11, color: "var(--orange-11)" }}>{CODE_LABELS[code]}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--orange-11)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <MessageSquare size={10} />人工評語
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="說明分類原因或補充備注（選填）..." rows={3}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--amber-6)", borderRadius: 6, padding: "7px 10px", fontSize: 12, lineHeight: 1.5, background: "var(--color-background)", color: "var(--gray-12)", resize: "vertical", outline: "none", fontFamily: "inherit" }} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="solid" color="green" onClick={() => handleSubmit("confirmed")} disabled={saving} style={{ flex: 1, gap: 5, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <UserCheck size={13} />確認歸檔
          </Button>
          <Button variant="outline" color="orange" onClick={() => handleSubmit("corrected")} disabled={saving || code === currentCode} style={{ flex: 1, gap: 5, cursor: (saving || code === currentCode) ? "not-allowed" : "pointer", opacity: (saving || code === currentCode) ? 0.5 : 1 }}>
            <RotateCcw size={12} />修正碼 → {code}
          </Button>
        </div>
      </div>
    </div>
  );
}

const MIME_ICON: Record<string, React.ReactNode> = {
  "application/pdf": <FileText size={15} color="var(--red-9)" />,
  "message/rfc822":  <FileText size={15} color="var(--violet-9)" />,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": <FileText size={15} color="var(--blue-9)" />,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": <FileText size={15} color="var(--green-9)" />,
};
const CODE_CHIP_COLORS: Record<string, string> = {
  FA: "#1e40af", FC: "#166534", TA: "#7c3aed", TC: "#92400e",
  FG: "#0e7490", TG: "#0f766e", FX: "#57534e", TX: "#57534e",
};

function DriveFilesSection({ files, currentEmailId }: { files: DriveFile[]; currentEmailId: string }) {
  const byCaseNumber = files.reduce<Record<string, DriveFile[]>>((acc, f) => { (acc[f.case_number] ??= []).push(f); return acc; }, {});
  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(byCaseNumber).map(([caseNum, caseFiles]) => (
        <div key={caseNum}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid var(--gray-6)" }}>
            <Hash size={12} color="var(--gray-9)" />
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "ui-monospace, monospace", color: "var(--gray-12)" }}>{caseNum}</span>
            <span style={{ fontSize: 11, color: "var(--gray-9)" }}>· {caseFiles.length} 個檔案</span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--gray-9)" }}>
              {STORAGE_ICONS[caseFiles[0].provider]}
              {STORAGE_LABELS[caseFiles[0].provider]}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {caseFiles.map(f => {
              const isCurrentEmail = f.email_id === currentEmailId;
              const codeColor = CODE_CHIP_COLORS[f.direction_code] ?? "#57534e";
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, border: `1px solid ${isCurrentEmail ? "var(--blue-6)" : "var(--gray-6)"}`, background: isCurrentEmail ? "var(--blue-2)" : "var(--gray-2)" }}>
                  {MIME_ICON[f.mimeType] ?? <File size={15} color="var(--gray-11)" />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: isCurrentEmail ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}{isCurrentEmail && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--blue-11)", fontWeight: 600 }}>← 本信件</span>}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{formatBytes(f.size_bytes)}</span><span>·</span>
                      <span>{new Date(f.created_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}</span>
                      {f.email_id && f.email_id !== currentEmailId && (<><span>·</span><Link href={`/app/emails/${f.email_id}`} style={{ color: "var(--gray-11)", textDecoration: "underline", fontSize: 10 }}>查看來源信件</Link></>)}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, flexShrink: 0, background: codeColor + "15", color: codeColor, border: `1px solid ${codeColor}25` }}>{f.direction_code}</span>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                    <Button variant="outline" color="gray" size="1" style={{ gap: 3, flexShrink: 0, cursor: "pointer" }}>
                      <ExternalLink size={10} />開啟
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

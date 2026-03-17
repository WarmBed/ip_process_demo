"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Paperclip, ExternalLink, Clock, Hash,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  FileText, FileImage, File,
} from "lucide-react";
import type { ApiResponse, Classification, Attachment } from "@/lib/types";
import type { EmailDetail, DriveFile } from "@/lib/mock-data";

// ── Storage provider icons ────────────────────────────────────

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
  google_drive: "Google Drive",
  onedrive: "OneDrive",
  dropbox: "Dropbox",
  s3: "AWS S3",
  r2: "Cloudflare R2",
};

// ── File icon by type ─────────────────────────────────────────

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.includes("pdf")) return <FileText size={16} color="#ef4444" />;
  if (contentType.includes("image")) return <FileImage size={16} color="#3b82f6" />;
  if (contentType.includes("word") || contentType.includes("document")) return <FileText size={16} color="#2563eb" />;
  return <File size={16} color="var(--fg-muted)" />;
}

function formatBytes(b: number) {
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
}

// ── Direction code badge ──────────────────────────────────────

const CODE_COLORS: Record<string, string> = {
  FA: "#1e40af", FC: "#166534", TA: "#7c3aed", TC: "#92400e",
  FG: "#0e7490", TG: "#0f766e", FX: "#57534e", TX: "#57534e",
};

const CODE_LABELS: Record<string, string> = {
  FA: "收到・代理人", FC: "收到・客戶", TA: "寄出・代理人", TC: "寄出・客戶",
  FG: "收到・政府",  TG: "寄出・政府", FX: "收到・未知",  TX: "寄出・未知",
};

// ── Main page ─────────────────────────────────────────────────

export default function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail]             = useState<EmailDetail | null>(null);
  const [driveFiles, setDriveFiles]     = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const [clsExpanded, setClsExpanded]   = useState(true);
  const [driveExpanded, setDriveExpanded] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/emails/${id}`)
      .then((r) => r.json())
      .then((d: ApiResponse<EmailDetail>) => {
        setDetail(d.data);
        setLoading(false);

        // 取得案號後自動搜尋 Drive 相關檔案
        const caseNumbers = d.data?.classification?.case_numbers ?? [];
        if (caseNumbers.length > 0) {
          setDriveLoading(true);
          fetch(`/api/v1/drive/search?case_number=${caseNumbers.join(",")}`)
            .then((r) => r.json())
            .then((dr: ApiResponse<DriveFile[]>) => {
              setDriveFiles(dr.data);
              setDriveLoading(false);
            });
        }
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-subtle)" }}>
        載入中...
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-subtle)" }}>
        找不到此信件
      </div>
    );
  }

  const { email, classification: cls, attachments } = detail;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 900 }}>

      {/* Back */}
      <Link href="/app/emails" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--fg-muted)", marginBottom: 16 }}>
        <ArrowLeft size={14} /> 返回信件列表
      </Link>

      {/* Email header card */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", background: "var(--sl1)" }}>

          {/* Subject */}
          <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", margin: "0 0 12px", lineHeight: 1.4 }}>
            {email.subject}
          </h1>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "6px 12px", fontSize: 13 }}>
            <span style={{ color: "var(--fg-subtle)", fontWeight: 500 }}>寄件人</span>
            <span style={{ color: "var(--fg)" }}>
              {email.sender_name} &lt;{email.sender_email}&gt;
            </span>

            <span style={{ color: "var(--fg-subtle)", fontWeight: 500 }}>收件人</span>
            <span style={{ color: "var(--fg)" }}>
              {email.recipients.filter((r) => r.type === "to").map((r) => r.email).join(", ")}
            </span>

            {email.recipients.some((r) => r.type === "cc") && (
              <>
                <span style={{ color: "var(--fg-subtle)", fontWeight: 500 }}>副本</span>
                <span style={{ color: "var(--fg)" }}>
                  {email.recipients.filter((r) => r.type === "cc").map((r) => r.email).join(", ")}
                </span>
              </>
            )}

            <span style={{ color: "var(--fg-subtle)", fontWeight: 500 }}>時間</span>
            <span style={{ color: "var(--fg)", display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={12} color="var(--fg-subtle)" />
              {new Date(email.received_at).toLocaleString("zh-TW", {
                year: "numeric", month: "2-digit", day: "2-digit",
                hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Classification summary bar */}
        {cls && (
          <div style={{
            padding: "10px 22px", background: "var(--sl2)",
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          }}>
            {/* Direction code */}
            {(() => {
              const color = CODE_COLORS[cls.direction_code] ?? "#57534e";
              return (
                <span style={{
                  padding: "2px 10px", borderRadius: 5, fontSize: 12, fontWeight: 600,
                  background: color + "15", color, border: `1px solid ${color}30`,
                }}>
                  {cls.direction_code} · {CODE_LABELS[cls.direction_code]}
                </span>
              );
            })()}

            {/* Case numbers */}
            {cls.case_numbers.map((c) => (
              <span key={c} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-muted)" }}>
                <Hash size={11} />
                <span style={{ fontFamily: "ui-monospace, monospace" }}>{c}</span>
              </span>
            ))}

            {/* Status */}
            {cls.status === "confirmed" && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#166534", marginLeft: "auto" }}>
                <CheckCircle size={12} /> 已確認
              </span>
            )}
            {cls.status === "pending" && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#854d0e", marginLeft: "auto" }}>
                <AlertCircle size={12} /> 待確認
              </span>
            )}
          </div>
        )}
      </div>

      {/* Two-column layout: body (left) + sidebar (right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "start" }}>

        {/* ── Left: Email body ── */}
        <div>
          <Section
            title="信件內容"
            expanded={bodyExpanded}
            onToggle={() => setBodyExpanded((v) => !v)}
          >
            {email.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html }}
                style={{ fontSize: 13, lineHeight: 1.7, color: "var(--fg)", padding: "16px 20px" }}
              />
            ) : (
              <div style={{ padding: "16px 20px", fontSize: 13, color: "var(--fg-subtle)" }}>
                {email.body_text || "（無內容）"}
              </div>
            )}
          </Section>

          {/* Email attachments */}
          {attachments.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Section title={`信件附件（${attachments.length}）`} expanded={true} onToggle={() => {}}>
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachments.map((att) => (
                    <AttachmentRow key={att.id} attachment={att} />
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Drive related files */}
          {(driveLoading || driveFiles.length > 0) && cls && (
            <div style={{ marginTop: 14 }}>
              <Section
                title={driveLoading
                  ? `正在搜尋 ${cls.case_numbers.join(", ")} 相關檔案...`
                  : `案號相關檔案（${driveFiles.length}）`}
                expanded={driveExpanded}
                onToggle={() => setDriveExpanded((v) => !v)}
              >
                {driveLoading ? (
                  <div style={{ padding: "20px", textAlign: "center", fontSize: 13, color: "var(--fg-subtle)" }}>
                    搜尋中...
                  </div>
                ) : (
                  <DriveFilesSection files={driveFiles} currentEmailId={id} />
                )}
              </Section>
            </div>
          )}
        </div>

        {/* ── Right: Classification detail ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {cls && (
            <Section
              title="AI 分類結果"
              expanded={clsExpanded}
              onToggle={() => setClsExpanded((v) => !v)}
            >
              <ClassificationPanel cls={cls} />
            </Section>
          )}

          {/* EML storage location */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--sl2)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>
              EML 歸檔位置
            </div>
            <div style={{ padding: "12px 14px" }}>
              {attachments.length > 0 ? (
                <StoragePath
                  provider={attachments[0].storage_provider}
                  path={attachments[0].storage_path.replace(/[^/]+$/, "").replace(/\/$/, "")}
                  url={attachments[0].storage_url}
                />
              ) : (
                <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>尚未歸檔</span>
              )}
            </div>
          </div>

          {/* Token usage */}
          {cls && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--sl2)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>
                Token 用量
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <TokenRow label="輸入" value={cls.input_tokens} />
                <TokenRow label="輸出" value={cls.output_tokens} />
                <TokenRow label="模型" value={cls.llm_model} isText />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Section({
  title, expanded, onToggle, children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "var(--sl2)", border: "none",
          borderBottom: expanded ? "1px solid var(--border)" : "none",
          cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--fg)",
        }}
      >
        {title}
        {expanded ? <ChevronUp size={13} color="var(--fg-subtle)" /> : <ChevronDown size={13} color="var(--fg-subtle)" />}
      </button>
      {expanded && children}
    </div>
  );
}

function AttachmentRow({ attachment: att }: { attachment: Attachment }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", border: "1px solid var(--border)",
      borderRadius: 7, background: "var(--sl1)",
    }}>
      <FileIcon contentType={att.content_type} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {att.filename}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{formatBytes(att.size_bytes)}</span>
          <span>·</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {STORAGE_ICONS[att.storage_provider]}
            {STORAGE_LABELS[att.storage_provider] ?? att.storage_provider}
          </span>
        </div>
        {/* Drive path */}
        <div style={{
          marginTop: 4, fontSize: 10, color: "var(--fg-subtle)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "ui-monospace, monospace",
        }}>
          {att.storage_path}
        </div>
      </div>

      {att.storage_url && (
        <a
          href={att.storage_url}
          target="_blank"
          rel="noreferrer"
          className="btn-outline"
          style={{ height: 28, padding: "0 10px", fontSize: 11, gap: 4, flexShrink: 0 }}
        >
          <ExternalLink size={11} />
          開啟
        </a>
      )}
    </div>
  );
}

function ClassificationPanel({ cls }: { cls: Classification }) {
  const color = CODE_COLORS[cls.direction_code] ?? "#57534e";
  const confidence = Math.round(cls.confidence * 100);
  const confColor = confidence >= 90 ? "var(--green)" : confidence >= 70 ? "var(--yellow)" : "var(--red)";

  return (
    <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Semantic name */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>語義名</div>
        <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>{cls.semantic_name || "—"}</div>
      </div>

      {/* Direction */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>收發碼</div>
        <span style={{
          padding: "2px 10px", borderRadius: 5, fontSize: 12, fontWeight: 600,
          background: color + "15", color, border: `1px solid ${color}30`,
        }}>
          {cls.direction_code} · {CODE_LABELS[cls.direction_code]}
        </span>
      </div>

      {/* Confidence */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>信心分數</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--sl4)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${confidence}%`, height: "100%", background: confColor, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: confColor, minWidth: 32 }}>{confidence}%</span>
        </div>
      </div>

      {/* Deadline */}
      {cls.selected_deadline && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>行動期限</div>
          <div style={{ fontSize: 13, color: "var(--fg)", display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="var(--fg-subtle)" />
            {new Date(cls.selected_deadline).toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      )}

      {/* All dates found */}
      {cls.dates_found.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>偵測到的日期</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {cls.dates_found.map((d, i) => (
              <div key={i} style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", gap: 6 }}>
                <span style={{ fontFamily: "ui-monospace, monospace", color: "var(--fg)" }}>{d.date}</span>
                <span style={{ color: "var(--fg-subtle)" }}>·</span>
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {STORAGE_ICONS[provider]}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)" }}>{STORAGE_LABELS[provider]}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-subtle)", fontFamily: "ui-monospace, monospace", lineHeight: 1.5, wordBreak: "break-all" }}>
        {path}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="btn-outline" style={{ height: 26, fontSize: 11, gap: 4, width: "fit-content" }}>
          <ExternalLink size={11} />
          在 {STORAGE_LABELS[provider]} 中開啟
        </a>
      )}
    </div>
  );
}

function TokenRow({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: "var(--fg-subtle)" }}>{label}</span>
      <span style={{ color: "var(--fg)", fontFamily: isText ? "inherit" : "ui-monospace, monospace" }}>
        {isText ? value : value.toLocaleString()}
      </span>
    </div>
  );
}

// ── Drive Files Section ───────────────────────────────────────

const MIME_ICON: Record<string, React.ReactNode> = {
  "application/pdf":    <FileText size={15} color="#ef4444" />,
  "message/rfc822":     <FileText size={15} color="#6366f1" />,  // .eml
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                        <FileText size={15} color="#2563eb" />,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                        <FileText size={15} color="#16a34a" />,
};

const CODE_CHIP_COLORS: Record<string, string> = {
  FA: "#1e40af", FC: "#166534", TA: "#7c3aed", TC: "#92400e",
  FG: "#0e7490", TG: "#0f766e", FX: "#57534e", TX: "#57534e",
};

function DriveFilesSection({ files, currentEmailId }: { files: DriveFile[]; currentEmailId: string }) {
  // Group by case number
  const byCaseNumber = files.reduce<Record<string, DriveFile[]>>((acc, f) => {
    (acc[f.case_number] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(byCaseNumber).map(([caseNum, caseFiles]) => (
        <div key={caseNum}>
          {/* Case number header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            paddingBottom: 6, borderBottom: "1px solid var(--border)",
          }}>
            <Hash size={12} color="var(--fg-subtle)" />
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "ui-monospace, monospace", color: "var(--fg)" }}>
              {caseNum}
            </span>
            <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
              · {caseFiles.length} 個檔案
            </span>
            {/* Storage provider icon */}
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-subtle)" }}>
              {STORAGE_ICONS[caseFiles[0].provider]}
              {STORAGE_LABELS[caseFiles[0].provider]}
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10 }}>
                / {caseFiles[0].path.split("/").slice(-1)[0]}
              </span>
            </span>
          </div>

          {/* File rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {caseFiles.map((f) => {
              const isCurrentEmail = f.email_id === currentEmailId;
              const codeColor = CODE_CHIP_COLORS[f.direction_code] ?? "#57534e";
              return (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 6,
                  border: `1px solid ${isCurrentEmail ? "var(--blue-border)" : "var(--border)"}`,
                  background: isCurrentEmail ? "var(--blue-bg)" : "var(--sl1)",
                }}>
                  {MIME_ICON[f.mimeType] ?? <File size={15} color="var(--fg-muted)" />}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, color: "var(--fg)", fontWeight: isCurrentEmail ? 500 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {f.name}
                      {isCurrentEmail && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: "var(--blue)", fontWeight: 600 }}>
                          ← 本信件
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2, display: "flex", gap: 8 }}>
                      <span>{formatBytes(f.size_bytes)}</span>
                      <span>·</span>
                      <span>{new Date(f.created_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}</span>
                      {f.email_id && f.email_id !== currentEmailId && (
                        <>
                          <span>·</span>
                          <Link href={`/app/emails/${f.email_id}`} style={{ color: "var(--fg-muted)", textDecoration: "underline", fontSize: 10 }}>
                            查看來源信件
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direction code badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, flexShrink: 0,
                    background: codeColor + "15", color: codeColor, border: `1px solid ${codeColor}25`,
                  }}>
                    {f.direction_code}
                  </span>

                  {/* Open link */}
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="btn-outline"
                    style={{ height: 26, padding: "0 8px", fontSize: 11, gap: 3, flexShrink: 0 }}
                  >
                    <ExternalLink size={10} />
                    開啟
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

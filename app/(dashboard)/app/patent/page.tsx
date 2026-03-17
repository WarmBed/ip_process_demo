"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock, Mail, AlertCircle, CheckSquare, Bot, X, ChevronRight,
  Check, FileText, User,
} from "lucide-react";
import {
  MOCK_DEADLINES, MOCK_STAFF, MOCK_CASES,
  DEADLINE_TYPE_LABELS, STATUS_LABELS, TYPE_LABELS, JURISDICTION_LABELS,
} from "@/lib/mock-cases";
import { MOCK_TODOS, DIRECTION_CONFIG } from "@/lib/mock-todo";

// ── Types ──────────────────────────────────────────────────────

type IncomingMail = {
  id: string; case_number: string; case_id: string; client_name: string;
  received_at: string; office: string; doc_title: string;
  ai_category: string; ai_deadline: string; ai_confidence: number;
  ai_suggestion: string; attachments: number;
};

type SelectedKind = "deadline" | "annuity" | "incoming" | "todo";
type SelectedItem = { id: string; kind: SelectedKind };

// ── Mock incoming official mail ────────────────────────────────

const MAIL_CAT_COLOR: Record<string, { fg: string; bg: string }> = {
  "OA答辯": { fg: "#92400e", bg: "#fffbeb" },
  "領證費":  { fg: "#065f46", bg: "#ecfdf5" },
  "領證":    { fg: "#065f46", bg: "#ecfdf5" },
  "年費":    { fg: "#1e40af", bg: "#eff6ff" },
  "其他":    { fg: "#374151", bg: "#f9fafb" },
};

const MOCK_INCOMING: IncomingMail[] = [
  {
    id: "mi001", case_number: "TSMC23014PUS", case_id: "c002", client_name: "台積電",
    received_at: "2026-03-18T09:23:00", office: "USPTO",
    doc_title: "Non-Final Office Action",
    ai_category: "OA答辯", ai_deadline: "2026-06-18", ai_confidence: 0.97,
    ai_suggestion: "建議指派陳建志處理（半導體專長）。Non-Final OA，可申請 3 個月延期（至 6 月底）。建議先與台積電工程師確認 Claim 1 的 §102 核駁理由後再草擬答辯。",
    attachments: 3,
  },
  {
    id: "mi002", case_number: "EPPA23801EP", case_id: "c013", client_name: "European Client C",
    received_at: "2026-03-18T08:15:00", office: "EPO",
    doc_title: "Rule 71(3) Communication",
    ai_category: "領證費", ai_deadline: "2026-04-30", ai_confidence: 0.99,
    ai_suggestion: "EPO 核准通知，需在 4/30 前回覆並繳納規費。建議林雅婷盡快聯繫 European Client C 確認繳費意願及是否需要翻譯聲明。",
    attachments: 2,
  },
  {
    id: "mi003", case_number: "MTKE24011PKR", case_id: "c020", client_name: "聯發科技",
    received_at: "2026-03-17T14:40:00", office: "KIPO",
    doc_title: "심사의견통지서",
    ai_category: "OA答辯", ai_deadline: "2026-06-17", ai_confidence: 0.93,
    ai_suggestion: "韓國 KIPO 審查意見（信心度 93%，建議人工確認）。建議陳建志評估答辯策略後，委託韓國代理所處理。注意韓文 OA 需翻譯評估。",
    attachments: 1,
  },
  {
    id: "mi004", case_number: "ADTA24001TTW", case_id: "c008", client_name: "威剛科技",
    received_at: "2026-03-17T11:05:00", office: "TIPO",
    doc_title: "商標核准處分書",
    ai_category: "領證", ai_deadline: "2026-04-10", ai_confidence: 0.99,
    ai_suggestion: "台灣商標核准！需在 4/10 前繳納核准費。建議黃怡君處理行政程序，並立即通知威剛科技客戶準備領取商標證書。",
    attachments: 1,
  },
];

// ── AI suggestions for deadlines ──────────────────────────────

const AI_SUGGESTIONS: Record<string, string> = {
  d001: "建議陳建志優先處理。此為 Non-Final OA，可申請延期，建議先確認 Claim 主要技術特徵，與聯發科工程師討論後再草擬答辯。",
  d002: "FinFET 相關案件，陳建志有充分背景。建議提前 2 週完成答辯稿，避免最後壓縮審閱時間。",
  d003: "Rule 71(3) 核准通知，林雅婷主責。建議立即聯繫 European Client C 確認繳費，以免錯過核准期限。",
  d004: "第 4 年年費繳納，金額約 NT$8,000。建議黃怡君透過智財局線上系統繳納，並通知聯發科確認。",
  d005: "商標核准費由黃怡君處理。同時請通知威剛科技準備領取商標證書，安排後續維護計畫。",
  d006: "US 3.5 年維護費（Maintenance Fee），需在期限前繳至 USPTO。建議陳建志確認鴻海精密繳費意願後委由美國事務所處理。",
  d007: "此為 Final OA，策略需謹慎。建議陳建志評估申請 RCE 或 Appeal，並諮詢韓國代理人意見後決策。",
  d008: "EPO 審查請求期限，吳柏翰主責。需繳審查費並確認 Claims 是否需修正，建議提前完成以避免臨近截止日。",
};

// ── Helpers ────────────────────────────────────────────────────

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function urgencyColor(days: number) {
  return days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "var(--fg-muted)";
}

function urgencyBorder(days: number) {
  return days <= 7 ? "#dc2626" : days <= 30 ? "#d97706" : "var(--border)";
}

function urgencyBg(days: number, selected: boolean) {
  if (selected) return "#eef2ff";
  return days <= 7 ? "#fef2f2" : "var(--bg)";
}

// ── StatCell ───────────────────────────────────────────────────

function StatCell({ label, value, sub, last = false }: {
  label: string; value: React.ReactNode; sub?: string; last?: boolean;
}) {
  return (
    <div style={{ flex: 1, padding: "14px 20px", borderRight: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ fontSize: 11, color: "var(--fg-subtle)", fontWeight: 500, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── BlockHeader ────────────────────────────────────────────────

function BlockHeader({ icon, title, badge, badgeColor, linkHref, count }: {
  icon: React.ReactNode; title: string; badge?: string; badgeColor?: string;
  linkHref?: string; count?: number;
}) {
  return (
    <div style={{
      padding: "9px 14px", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--sl2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{title}</span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
            color: badgeColor ?? "#dc2626", background: `${badgeColor ?? "#dc2626"}18`,
            border: `1px solid ${badgeColor ?? "#dc2626"}40`,
          }}>{badge}</span>
        )}
      </div>
      {linkHref && count !== undefined && (
        <Link href={linkHref} style={{ fontSize: 11, color: "var(--fg-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
          全部 {count} <ChevronRight size={10} />
        </Link>
      )}
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────

function DetailPanel({
  selected, assignees, onAssign,
  aiAdopted, onAdopt, feedbackInput, setFeedbackInput, feedbackDone, onFeedback,
  onClose,
}: {
  selected: SelectedItem;
  assignees: Record<string, string>; onAssign: (id: string, sid: string) => void;
  aiAdopted: Record<string, boolean>; onAdopt: (id: string, v: boolean) => void;
  feedbackInput: string; setFeedbackInput: (v: string) => void;
  feedbackDone: Set<string>; onFeedback: (id: string) => void;
  onClose: () => void;
}) {
  const { id, kind } = selected;

  const deadline = (kind === "deadline" || kind === "annuity")
    ? MOCK_DEADLINES.find(d => d.id === id) : null;
  const incoming = kind === "incoming"
    ? MOCK_INCOMING.find(m => m.id === id) : null;
  const todo = kind === "todo"
    ? MOCK_TODOS.find(t => t.id === id) : null;

  const caseNumber = deadline?.case_number ?? incoming?.case_number ?? todo?.case_number ?? "";
  const clientName = deadline?.client_name ?? incoming?.client_name ?? todo?.client ?? "";
  const patentCase = MOCK_CASES.find(c => c.case_number === caseNumber);

  const title = deadline?.description ?? incoming?.doc_title ?? todo?.action ?? "";
  const aiSuggestion = incoming?.ai_suggestion ?? todo?.ai_suggestion ?? AI_SUGGESTIONS[id];
  const dueDateStr = deadline?.due_date ?? incoming?.ai_deadline ?? todo?.deadline;
  const days = dueDateStr ? daysUntil(dueDateStr) : null;

  const adopted = aiAdopted[id];
  const hasFeedback = feedbackDone.has(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        background: "var(--sl2)", display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{
              fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 700,
              color: "var(--fg)", background: "var(--sl3)", border: "1px solid var(--border)",
              padding: "2px 7px", borderRadius: 3,
            }}>{caseNumber}</span>
            {patentCase && (
              <span style={{
                marginLeft: 6, fontSize: 10, color: "var(--fg-subtle)",
                background: "var(--sl3)", padding: "2px 6px", borderRadius: 3,
                border: "1px solid var(--border)",
              }}>
                {JURISDICTION_LABELS[patentCase.jurisdiction as keyof typeof JURISDICTION_LABELS]} ·{" "}
                {TYPE_LABELS[patentCase.case_type]}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", lineHeight: 1.4, marginBottom: 2 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{clientName}</div>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: 4, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>

        {/* Deadline strip */}
        {days !== null && (
          <div style={{
            marginBottom: 14, padding: "9px 12px", borderRadius: 4,
            border: `1px solid ${days <= 7 ? "#fecaca" : days <= 30 ? "#fde68a" : "var(--border)"}`,
            background: days <= 7 ? "#fef2f2" : days <= 30 ? "#fffbeb" : "var(--sl1)",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <Clock size={12} color={urgencyColor(days)} />
            <span style={{ fontSize: 12, fontWeight: 600, color: urgencyColor(days) }}>
              {dueDateStr} · {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `剩 ${days} 天`}
            </span>
          </div>
        )}

        {/* AI suggestion */}
        {aiSuggestion && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>AI 建議</div>
            <div style={{
              padding: "10px 12px", background: "#eef2ff",
              borderLeft: "3px solid #6366f1", borderRadius: "0 4px 4px 0",
              display: "flex", gap: 8, marginBottom: 8,
            }}>
              <Bot size={13} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: "#3730a3", margin: 0, lineHeight: 1.6 }}>{aiSuggestion}</p>
            </div>

            {adopted === undefined && !hasFeedback && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onAdopt(id, true)} style={{
                  flex: 1, padding: "6px 10px", fontSize: 11, fontWeight: 600,
                  borderRadius: 4, border: "1px solid #a5b4fc",
                  background: "#eef2ff", color: "#3730a3", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                  <Check size={11} /> 採納建議
                </button>
                <button onClick={() => onAdopt(id, false)} style={{
                  flex: 1, padding: "6px 10px", fontSize: 11,
                  borderRadius: 4, border: "1px solid var(--border)",
                  background: "var(--bg)", color: "var(--fg-muted)", cursor: "pointer",
                }}>
                  不採納
                </button>
              </div>
            )}

            {adopted === true && (
              <div style={{ fontSize: 11, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={11} /> 已採納 · AI 將記錄此決策
              </div>
            )}

            {adopted === false && !hasFeedback && (
              <div>
                <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginBottom: 6 }}>說明原因（幫助 AI 學習）</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={feedbackInput}
                    onChange={e => setFeedbackInput(e.target.value)}
                    placeholder="例：此案由林律師主責..."
                    style={{
                      flex: 1, fontSize: 11, padding: "5px 8px",
                      border: "1px solid var(--border)", borderRadius: 4,
                      background: "var(--bg)", color: "var(--fg)", outline: "none",
                    }}
                  />
                  <button onClick={() => onFeedback(id)} style={{
                    padding: "5px 12px", fontSize: 11, fontWeight: 600,
                    borderRadius: 4, border: "none",
                    background: "var(--fg)", color: "var(--bg)", cursor: "pointer",
                  }}>
                    送出
                  </button>
                </div>
              </div>
            )}

            {hasFeedback && (
              <div style={{ fontSize: 11, color: "var(--fg-subtle)", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={11} color="#059669" /> 感謝回饋 · AI 將持續優化
              </div>
            )}
          </div>
        )}

        {/* Assign staff */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>負責人員</div>
          <select
            value={assignees[id] ?? ""}
            onChange={e => onAssign(id, e.target.value)}
            style={{
              width: "100%", padding: "7px 10px", fontSize: 12,
              border: "1px solid var(--border)", borderRadius: 4,
              background: "var(--bg)", color: "var(--fg)", cursor: "pointer", outline: "none",
            }}
          >
            <option value="">— 未分配 —</option>
            {MOCK_STAFF.map(s => (
              <option key={s.id} value={s.id}>{s.name} · {s.title}</option>
            ))}
          </select>
          {assignees[id] && (() => {
            const s = MOCK_STAFF.find(x => x.id === assignees[id]);
            return s ? (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--fg-subtle)" }}>
                <User size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {s.specialties.join("、")} · 現有 {s.active_cases} 件
              </div>
            ) : null;
          })()}
        </div>

        {/* Case info */}
        {patentCase && (
          <div style={{
            marginBottom: 14, padding: "10px 12px",
            background: "var(--sl1)", border: "1px solid var(--border)", borderRadius: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>案件資訊</div>
            {[
              { label: "申請號",  value: patentCase.app_number ?? "—", mono: true },
              { label: "狀態",    value: STATUS_LABELS[patentCase.status] },
              { label: "申請日",  value: patentCase.filing_date ?? "—" },
              { label: "負責人",  value: patentCase.assignee_name },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: "flex", gap: 10, fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--fg-subtle)", minWidth: 48, flexShrink: 0 }}>{label}</span>
                <span style={{ color: "var(--fg)", fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Incoming: attachments */}
        {incoming && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>附件 ({incoming.attachments})</div>
            {Array.from({ length: incoming.attachments }, (_, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 10px",
                border: "1px solid var(--border)", borderRadius: 4, marginBottom: 4,
                background: "var(--bg)", cursor: "pointer",
              }}>
                <FileText size={11} color="var(--fg-muted)" />
                <span style={{ fontSize: 11, color: "var(--fg)", flex: 1 }}>
                  {incoming.office}_{incoming.case_number}_{i + 1}.pdf
                </span>
              </div>
            ))}
          </div>
        )}

        {/* AI confidence */}
        {incoming && (
          <div style={{ marginBottom: 14, fontSize: 11, color: "var(--fg-subtle)" }}>
            AI 分類信心度：
            <span style={{ fontWeight: 600, color: incoming.ai_confidence >= 0.95 ? "#059669" : "#d97706" }}>
              {(incoming.ai_confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Google Drive */}
        <button style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 4,
          background: "var(--bg)", cursor: "pointer", fontSize: 11, color: "var(--fg-muted)", textAlign: "left",
        }}>
          <svg width="11" height="11" viewBox="0 0 87.3 78" fill="none">
            <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5L6.6 66.85z" fill="#0066da"/>
            <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 000 53h27.5l16.15-28z" fill="#00ac47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8L73.55 76.8z" fill="#ea4335"/>
            <path d="M43.65 25L57.4 0c-1.55-.55-3.2-.85-4.95-.85H34.9c-1.75 0-3.4.3-4.95.85L43.65 25z" fill="#00832d"/>
            <path d="M59.8 53H27.5L13.75 76.8c1.55.55 3.2.85 4.95.85h47.6c1.75 0 3.4-.3 4.95-.85L59.8 53z" fill="#2684fc"/>
            <path d="M73.4 26.5l-12.75-22.2c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#ffba00"/>
          </svg>
          案件 Google Drive 資料夾
          <ChevronRight size={10} style={{ marginLeft: "auto" }} />
        </button>

      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function PatentDashboardPage() {
  const router = useRouter();
  const [selected, setSelected]           = useState<SelectedItem | null>(null);
  const [panelWidth, setPanelWidth]       = useState(380);
  const [assignees, setAssignees]         = useState<Record<string, string>>({});
  const [aiAdopted, setAiAdopted]         = useState<Record<string, boolean>>({});
  const [feedbackInput, setFeedbackInput] = useState("");
  const [feedbackDone, setFeedbackDone]   = useState<Set<string>>(new Set());

  const panelOpen      = selected !== null;
  const panelResizing  = useRef(false);
  const resizeStart    = useRef({ mx: 0, pw: 380 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizing.current) return;
      const w = Math.min(600, Math.max(300, resizeStart.current.pw - (e.clientX - resizeStart.current.mx)));
      setPanelWidth(w);
    };
    const onUp = () => {
      if (!panelResizing.current) return;
      panelResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    panelResizing.current = true;
    resizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  const select = (id: string, kind: SelectedKind) =>
    setSelected(prev => prev?.id === id ? null : { id, kind });

  const onAdopt = (id: string, v: boolean) => {
    setAiAdopted(prev => ({ ...prev, [id]: v }));
    if (v) setFeedbackInput("");
  };

  const onFeedback = (id: string) => {
    if (!feedbackInput.trim()) return;
    setFeedbackDone(prev => new Set(prev).add(id));
    setFeedbackInput("");
  };

  // ── Computed ──────────────────────────────────────────────────

  const today = "2026-03-18";
  const pendingDls = MOCK_DEADLINES
    .filter(d => d.status !== "completed" && d.type !== "annuity")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const annuityDls = MOCK_DEADLINES
    .filter(d => d.status !== "completed" && d.type === "annuity")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const urgent7  = pendingDls.filter(d => daysUntil(d.due_date) <= 7);
  const urgent30 = pendingDls.filter(d => daysUntil(d.due_date) <= 30);
  const oaCases  = MOCK_CASES.filter(c => c.status === "oa_issued");
  const active   = MOCK_CASES.filter(c => !["granted", "abandoned", "rejected"].includes(c.status));
  const todayIn  = MOCK_INCOMING.filter(m => m.received_at.startsWith(today));
  const annuity90 = annuityDls.filter(d => daysUntil(d.due_date) <= 90);
  const pendingTodos = MOCK_TODOS.filter(t => t.status !== "done");
  const urgentTodos  = pendingTodos.filter(t => t.priority === "urgent");

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", minWidth: 0 }}>

        {/* Stat strip */}
        <div style={{
          display: "flex", border: "1px solid var(--border)", borderRadius: 4,
          marginBottom: 20, overflow: "hidden", background: "var(--bg)",
        }}>
          <StatCell
            label="進行中案件"
            value={<span style={{ color: "#1d4ed8" }}>{active.length}</span>}
            sub={`共 ${MOCK_CASES.length} 件`}
          />
          <StatCell
            label="今日新收來文"
            value={<span style={{ color: todayIn.length > 0 ? "#d97706" : "var(--fg)" }}>{todayIn.length}</span>}
            sub={`AI 已分類 ${MOCK_INCOMING.length} 件`}
          />
          <StatCell
            label="7 天內截止"
            value={<span style={{ color: urgent7.length > 0 ? "#dc2626" : "#16a34a" }}>{urgent7.length}</span>}
            sub={urgent7.length > 0 ? "需立即處理" : "暫無緊急"}
          />
          <StatCell
            label="OA 待答辯"
            value={<span style={{ color: oaCases.length > 0 ? "#d97706" : "#16a34a" }}>{oaCases.length}</span>}
            sub="件案件"
          />
          <StatCell
            label="年費 90 天預警"
            value={<span style={{ color: annuity90.length > 0 ? "#7c3aed" : "#16a34a" }}>{annuity90.length}</span>}
            sub="件需注意"
            last
          />
        </div>

        {/* 2-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Block 1: 截止期限 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHeader
                icon={<Clock size={12} color="#dc2626" />}
                title="截止期限"
                badge={urgent7.length > 0 ? `${urgent7.length} 緊急` : undefined}
                badgeColor="#dc2626"
                linkHref="/app/deadlines"
                count={urgent30.length}
              />
              {pendingDls.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>目前無待處理期限</div>
              ) : (
                pendingDls.slice(0, 7).map((d, i, arr) => {
                  const days = daysUntil(d.due_date);
                  const isSel = selected?.id === d.id;
                  return (
                    <div key={d.id}
                      onClick={() => select(d.id, "deadline")}
                      style={{
                        display: "grid", gridTemplateColumns: "120px 1fr 64px 46px",
                        alignItems: "center", gap: 10, padding: "9px 14px",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        borderLeft: `3px solid ${isSel ? "#6366f1" : urgencyBorder(days)}`,
                        background: urgencyBg(days, isSel), cursor: "pointer",
                      }}
                      onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                      onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = urgencyBg(days, false); }}
                    >
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.case_number}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{d.client_name} · {d.assignee_name}</div>
                      </div>
                      <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "var(--sl3)", color: "var(--fg-muted)", textAlign: "center", whiteSpace: "nowrap" }}>
                        {DEADLINE_TYPE_LABELS[d.type] ?? d.type}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: urgencyColor(days), textAlign: "right" }}>
                        {days <= 0 ? `逾${Math.abs(days)}d` : `${days}d`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Block 3: 事務所待辦 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHeader
                icon={<CheckSquare size={12} color="var(--fg-muted)" />}
                title="事務所待辦"
                badge={urgentTodos.length > 0 ? `${urgentTodos.length} 急` : undefined}
                badgeColor="#d97706"
                linkHref="/app/todo"
                count={pendingTodos.length}
              />
              {pendingTodos.slice(0, 5).map((t, i, arr) => {
                const days = t.deadline ? daysUntil(t.deadline) : null;
                const dir  = DIRECTION_CONFIG[t.direction];
                const isSel = selected?.id === t.id;
                return (
                  <div key={t.id}
                    onClick={() => select(t.id, "todo")}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : t.priority === "urgent" ? "#dc2626" : "#d97706"}`,
                      background: isSel ? "#eef2ff" : "var(--bg)", cursor: "pointer",
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", background: "var(--sl3)", padding: "1px 4px", borderRadius: 2, border: "1px solid var(--border)" }}>
                          {t.case_number}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: dir.color, background: dir.bg, padding: "1px 4px", borderRadius: 2 }}>
                          {dir.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.action}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{t.client}</div>
                    </div>
                    {days !== null && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: urgencyColor(days), flexShrink: 0, marginTop: 2 }}>
                        {days <= 0 ? `逾${Math.abs(days)}d` : `${days}d`}
                      </span>
                    )}
                  </div>
                );
              })}
              {pendingTodos.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>目前無待辦事項</div>
              )}
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Block 2: 今日新收來文 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHeader
                icon={<Mail size={12} color="#2563eb" />}
                title="新收官方來文"
                badge={todayIn.length > 0 ? `今日 ${todayIn.length}` : undefined}
                badgeColor="#2563eb"
              />
              {MOCK_INCOMING.map((m, i, arr) => {
                const mc    = MAIL_CAT_COLOR[m.ai_category] ?? MAIL_CAT_COLOR["其他"];
                const days  = daysUntil(m.ai_deadline);
                const isSel = selected?.id === m.id;
                const isToday = m.received_at.startsWith(today);
                return (
                  <div key={m.id}
                    onClick={() => select(m.id, "incoming")}
                    style={{
                      padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSel ? "#eef2ff" : "var(--bg)", cursor: "pointer",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : "transparent"}`,
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", background: "var(--sl3)", padding: "1px 4px", borderRadius: 2 }}>
                            {m.case_number}
                          </span>
                          {isToday && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "0 4px", borderRadius: 2 }}>今日</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.doc_title}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{m.client_name} · {m.office}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3, color: mc.fg, background: mc.bg }}>
                          {m.ai_category}
                        </span>
                        <span style={{ fontSize: 10, color: urgencyColor(days) }}>{days}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Block 4: 年費 / 續展警示 */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <BlockHeader
                icon={<AlertCircle size={12} color="#7c3aed" />}
                title="年費 / 續展警示"
                badge={annuity90.length > 0 ? `${annuity90.length} 件` : undefined}
                badgeColor="#7c3aed"
                linkHref="/app/deadlines"
                count={annuityDls.length}
              />
              {annuityDls.slice(0, 5).map((d, i, arr) => {
                const days  = daysUntil(d.due_date);
                const isSel = selected?.id === d.id;
                return (
                  <div key={d.id}
                    onClick={() => select(d.id, "annuity")}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                      borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                      background: isSel ? "#eef2ff" : "var(--bg)", cursor: "pointer",
                      borderLeft: `3px solid ${isSel ? "#6366f1" : days <= 90 ? "#7c3aed" : "transparent"}`,
                    }}
                    onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--bg)"; }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 9, color: "var(--fg-muted)", marginBottom: 2 }}>{d.case_number}</div>
                      <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                      <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 1 }}>{d.client_name} · {d.assignee_name}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: days <= 90 ? "#7c3aed" : "var(--fg-muted)", flexShrink: 0 }}>
                      {days}d
                    </span>
                  </div>
                );
              })}
              {annuityDls.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>90 天內無年費到期</div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{
        width: panelOpen ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: panelOpen ? "1px solid var(--border)" : "none",
        background: "var(--bg)",
        flexShrink: 0, display: "flex", flexDirection: "column",
        position: "relative",
        transition: panelOpen ? "none" : "width 0.2s",
      }}>
        {panelOpen && (
          <>
            <div
              onMouseDown={onResizeDown}
              style={{
                position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
                cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
            </div>
            <DetailPanel
              selected={selected!}
              assignees={assignees}
              onAssign={(id, sid) => setAssignees(prev => ({ ...prev, [id]: sid }))}
              aiAdopted={aiAdopted}
              onAdopt={onAdopt}
              feedbackInput={feedbackInput}
              setFeedbackInput={setFeedbackInput}
              feedbackDone={feedbackDone}
              onFeedback={onFeedback}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </div>

    </div>
  );
}

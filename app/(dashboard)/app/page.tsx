"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail, TrendingUp, AlertCircle, CheckCircle, ChevronRight, HelpCircle,
  Clock, CheckSquare, X, Bot, CheckCircle2, Circle, ExternalLink, User, Scale, ArrowRight,
} from "lucide-react";
import type { ApiResponse, EmailListItem } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";
import { MOCK_TODOS, DIRECTION_CONFIG } from "@/lib/mock-todo";
import type { TodoItem } from "@/lib/mock-todo";
import { EmailDetailPanel } from "@/components/email-detail-panel";

const PENDING_REASONS: Record<string, { reason: string; detail: string; tag: string; tagColor: string }> = {
  e002: {
    reason: "方向碼不確定",
    detail: "TA 與 TC 特徵重疊，信心度 94%，請確認是委託發出還是客戶指示",
    tag: "信心不足",
    tagColor: "#d97706",
  },
};

const DEFAULT_REASON = {
  reason: "需人工確認",
  detail: "AI 無法完全確定分類，請人工審核後確認",
  tag: "待審核",
  tagColor: "#6b7280",
};

const codeColor: Record<string, string> = {
  FA: "#2563eb", FC: "#7c3aed", TA: "#059669", TC: "#d97706",
  FG: "#dc2626", TG: "#9ca3af", FX: "#6b7280",
};

function StatCard({ label, value, sub, accent = false, last = false }: {
  label: string; value: string | React.ReactNode; sub?: string | React.ReactNode; accent?: boolean; last?: boolean;
}) {
  return (
    <div style={{
      flex: 1, padding: "16px 24px",
      borderRight: last ? "none" : "1px solid var(--border)",
      background: accent ? "#fffbeb" : "transparent",
    }}>
      <div style={{ fontSize: 12, color: accent ? "#92400e" : "var(--fg-subtle)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ? "#92400e" : "var(--fg)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? "#b45309" : "var(--fg-subtle)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function daysUntil(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// ── Todo detail panel (overview inline) ──────────────────────────

const WHO_ICON: Record<string, React.ReactNode> = {
  "我方":    <User size={12} />,
  "客戶":    <User size={12} />,
  "代理人":  <Scale size={12} />,
  "政府機關": <Scale size={12} />,
};

const DIR_ICON: Record<string, React.ReactNode> = {
  send:     <ArrowRight size={12} />,
  wait:     <Clock size={12} />,
  review:   <Scale size={12} />,
  internal: <User size={12} />,
};

function TodoDetailPanel({ todo, onClose, onDone, isDone, onNavigate }: {
  todo: TodoItem;
  onClose: () => void;
  onDone: () => void;
  isDone: boolean;
  onNavigate: (url: string) => void;
}) {
  const days   = daysUntil(todo.deadline);
  const dir    = DIRECTION_CONFIG[todo.direction];
  const isUrg  = todo.priority === "urgent";
  const deadlineColor = days === null ? "var(--fg-subtle)" : days <= 7 ? "#dc2626" : days <= 21 ? "#d97706" : "var(--fg-subtle)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--sl2)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--fg)", background: "var(--sl3)", padding: "2px 7px", borderRadius: 4, border: "1px solid var(--border)" }}>
              {todo.case_number}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: dir.color, background: dir.bg, padding: "1px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
              {DIR_ICON[todo.direction]}{dir.label}
            </span>
            {isUrg && <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "1px 6px", borderRadius: 4, border: "1px solid #fecaca" }}>急</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 3 }}>{todo.client}</div>
        </div>
        <button onClick={onClose} className="btn-ghost" style={{ padding: "4px", flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Action */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>下一步動作</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", lineHeight: 1.5 }}>{todo.action}</div>
        </div>

        {/* Detail */}
        {todo.detail && (
          <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--sl2)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>狀況說明</div>
            <p style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.7, margin: 0 }}>{todo.detail}</p>
          </div>
        )}

        {/* AI suggestion */}
        {todo.ai_suggestion && (
          <div style={{ marginBottom: 16, padding: "10px 12px", background: "#eef2ff", borderRadius: 8, borderLeft: "3px solid #6366f1", display: "flex", gap: 8 }}>
            <Bot size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "#3730a3", margin: 0, lineHeight: 1.6 }}>{todo.ai_suggestion}</p>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, padding: "12px 14px", background: "var(--sl1)", borderRadius: 8, border: "1px solid var(--border)" }}>
          {[
            { label: "誰要動",  value: <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{WHO_ICON[todo.who]}{todo.who}</span> },
            { label: "動作類型", value: <span style={{ color: dir.color, display: "inline-flex", alignItems: "center", gap: 3 }}>{DIR_ICON[todo.direction]}{dir.label}</span> },
            { label: "截止日期", value: todo.deadline ? (
              <span style={{ color: deadlineColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock size={11} />
                {new Date(todo.deadline).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                {days !== null && <span style={{ fontSize: 10 }}>（{days <= 0 ? `逾期 ${Math.abs(days)} 天` : `${days} 天後`}）</span>}
              </span>
            ) : "—" },
            { label: "優先級",  value: todo.priority === "urgent" ? <span style={{ color: "#dc2626", fontWeight: 600 }}>急</span> : todo.priority === "normal" ? "一般" : "低" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 10, fontSize: 12 }}>
              <span style={{ color: "var(--fg-subtle)", minWidth: 56, flexShrink: 0 }}>{label}</span>
              <span style={{ color: "var(--fg)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {todo.tags.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {todo.tags.map(tag => (
              <span key={tag} style={{ fontSize: 11, color: "var(--fg-subtle)", background: "var(--sl3)", padding: "2px 7px", borderRadius: 4, border: "1px solid var(--border)" }}>{tag}</span>
            ))}
          </div>
        )}

        {/* Source email */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>來源信件</div>
          <button
            onClick={() => onNavigate(`/app/emails/${todo.source_email_id}`)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg)", cursor: "pointer", textAlign: "left" }}
          >
            <Mail size={13} color="var(--fg-muted)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{todo.source_subject}</div>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 1 }}>
                {new Date(todo.source_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
              </div>
            </div>
            <ExternalLink size={11} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Full todo link */}
        <Link href={`/app/todo`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fg-muted)", textDecoration: "none" }}>
          <CheckSquare size={12} />在待辦清單中查看 <ChevronRight size={11} />
        </Link>
      </div>

      {/* Footer action */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          onClick={onDone}
          style={{
            width: "100%", padding: "9px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: isDone ? "var(--sl3)" : "#166534", color: isDone ? "var(--fg-muted)" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {isDone ? <><Circle size={14} />取消完成</> : <><CheckCircle2 size={14} />標記完成</>}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function AppOverviewPage() {
  const router = useRouter();
  const [emails, setEmails]             = useState<EmailListItem[]>([]);
  const [doneTodos, setDoneTodos]       = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth]     = useState(400);

  const panelType = selectedId ? "email" : selectedTodoId ? "todo" : null;
  const panelOpen = panelType !== null;

  const selectEmail = (id: string | null) => { setSelectedId(id); setSelectedTodoId(null); };
  const selectTodo  = (id: string | null) => { setSelectedTodoId(id); setSelectedId(null); };

  const panelResizing    = useRef(false);
  const panelResizeStart = useRef({ mx: 0, pw: 400 });

  useEffect(() => {
    fetch("/api/v1/emails?limit=20")
      .then(r => r.json())
      .then((d: ApiResponse<EmailListItem[]>) => setEmails(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizing.current) return;
      const newW = Math.min(680, Math.max(300, panelResizeStart.current.pw - (e.clientX - panelResizeStart.current.mx)));
      setPanelWidth(newW);
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

  const onPanelResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    panelResizing.current = true;
    panelResizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  const todayStr   = new Date().toISOString().slice(0, 10);
  const todayMsgs  = emails.filter(e => e.received_at.startsWith(todayStr));
  const classified  = emails.filter(e => e.status !== "pending");
  const pending     = emails.filter(e => e.status === "pending");
  const recentEmails = [...emails].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()).slice(0, 5);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <div style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>總覽</h1>
            <p style={{ fontSize: 13, color: "var(--fg-subtle)", margin: "3px 0 0" }}>
              IP Winner · 今日 {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
            </p>
          </div>

          {/* Stat cards */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 24, overflow: "hidden", background: "var(--bg)" }}>
            <StatCard label="今日收到" value={`${todayMsgs.length} 封`} sub={`本週共 ${MOCK_STATS.this_week} 封`} />
            <StatCard label="AI 已歸類" value={`${classified.length} 封`} sub={`準確率 ${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%`} />
            <StatCard
              label="待人工確認"
              value={<span style={{ color: pending.length > 0 ? "#d97706" : "#16a34a" }}>{pending.length} 封</span>}
              sub={pending.length > 0 ? "需要審核" : "全部完成 ✓"}
              accent={pending.length > 0}
            />
            <StatCard label="分類準確率" value={<span style={{ color: "#16a34a" }}>{(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%</span>} sub="本週收發碼 100%" last />
          </div>

          {/* Todo summary bar */}
          {(() => {
            const urgentTodos = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.priority === "urgent");
            const totalPending = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done").length;
            const nextDeadline = MOCK_TODOS
              .filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.deadline)
              .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
            const days = nextDeadline ? Math.ceil((new Date(nextDeadline.deadline!).getTime() - Date.now()) / 86400000) : null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ padding: "9px 18px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckSquare size={13} color="var(--fg-subtle)" />
                  <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>案件待辦</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--fg)", marginLeft: 2 }}>{totalPending} 件</span>
                </div>
                {urgentTodos.length > 0 && (
                  <div style={{ padding: "9px 18px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{urgentTodos.length} 件急</span>
                  </div>
                )}
                {days !== null && (
                  <div style={{ padding: "9px 18px", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Clock size={12} color={days <= 7 ? "#dc2626" : "#d97706"} />
                    <span style={{ fontSize: 12, color: days <= 7 ? "#dc2626" : "#d97706" }}>
                      最近截止 {days <= 0 ? "已逾期" : `${days} 天後`}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Pending section */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 20, border: "1px solid #fde68a", borderRadius: 8, overflow: "hidden", background: "#fffbeb" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} color="#d97706" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{pending.length} 封需要人工確認</span>
                </div>
                <button onClick={() => router.push("/app/emails?status=pending")}
                  style={{ fontSize: 12, color: "#b45309", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  前往確認全部 <ChevronRight size={12} />
                </button>
              </div>
              {pending.map((e, i) => {
                const r = PENDING_REASONS[e.id] ?? DEFAULT_REASON;
                const isSelected = selectedId === e.id;
                return (
                  <div key={e.id}
                    onClick={() => selectEmail(isSelected ? null : e.id)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: i < pending.length - 1 ? "1px solid #fde68a" : "none",
                      cursor: "pointer", transition: "background 0.1s",
                      background: isSelected ? "#fef9c3" : "transparent",
                    }}
                    onMouseEnter={el => { if (!isSelected) el.currentTarget.style.background = "#fef9c3"; }}
                    onMouseLeave={el => { if (!isSelected) el.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 1, color: codeColor[e.direction_code ?? ""] ?? "#6b7280", background: `${codeColor[e.direction_code ?? ""] ?? "#6b7280"}18`, border: `1px solid ${codeColor[e.direction_code ?? ""] ?? "#6b7280"}30` }}>
                        {e.direction_code ?? "?"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                        <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                          {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
                          <HelpCircle size={11} color={r.tagColor} style={{ flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, marginRight: 6, color: r.tagColor, background: `${r.tagColor}18` }}>{r.tag}</span>
                            <span style={{ fontSize: 11, color: "#78716c" }}>{r.detail}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={13} color={isSelected ? "#d97706" : "#a8a29e"} style={{ flexShrink: 0, marginTop: 2, transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Two columns: recent emails + urgent todos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

            {/* Recent emails */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--sl2)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>最近信件</span>
                <button onClick={() => router.push("/app/emails")} style={{ fontSize: 12, color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer" }}>查看全部 →</button>
              </div>
              {recentEmails.map((e, i) => {
                const isSelected = selectedId === e.id;
                return (
                  <div key={e.id}
                    onClick={() => selectEmail(isSelected ? null : e.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                      borderBottom: i < recentEmails.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", transition: "background 0.1s",
                      background: isSelected ? "var(--sl3)" : "transparent",
                    }}
                    onMouseEnter={el => { if (!isSelected) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSelected) el.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, flexShrink: 0, color: codeColor[e.direction_code ?? ""] ?? "#6b7280", background: `${codeColor[e.direction_code ?? ""] ?? "#6b7280"}15` }}>
                      {e.direction_code ?? "?"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isSelected ? 600 : 400 }}>{e.subject}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 1 }}>
                        {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {e.status === "pending"   && <AlertCircle  size={13} color="#d97706" style={{ flexShrink: 0 }} />}
                    {e.status === "confirmed" && <CheckCircle  size={13} color="var(--green)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            {/* Right: urgent todos */}
            {(() => {
              const urgentTodos = MOCK_TODOS
                .filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.priority === "urgent")
                .slice(0, 4);
              const normalTodos = MOCK_TODOS
                .filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.priority === "normal")
                .slice(0, 2);
              const visibleTodos = [...urgentTodos, ...normalTodos].slice(0, 5);
              const totalPending = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done").length;

              return (
                <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--sl2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckSquare size={13} color="var(--fg-muted)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>案件待辦</span>
                      {urgentTodos.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "0 5px", borderRadius: 8, border: "1px solid #fecaca" }}>
                          {urgentTodos.length} 急
                        </span>
                      )}
                    </div>
                    <Link href="/app/todo" style={{ fontSize: 12, color: "var(--fg-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                      全部 {totalPending} 件 <ChevronRight size={11} />
                    </Link>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {visibleTodos.map((t, i) => {
                      const days       = daysUntil(t.deadline);
                      const dir        = DIRECTION_CONFIG[t.direction];
                      const isUrgent   = t.priority === "urgent";
                      const isSelected = selectedTodoId === t.id;
                      return (
                        <div
                          key={t.id}
                          onClick={() => selectTodo(isSelected ? null : t.id)}
                          style={{
                            padding: "10px 14px",
                            borderBottom: i < visibleTodos.length - 1 ? "1px solid var(--border)" : "none",
                            borderLeft: `3px solid ${isSelected ? "#6366f1" : isUrgent ? "#dc2626" : "#d97706"}`,
                            background: isSelected ? "#eef2ff" : isUrgent ? "#fff5f5" : "transparent",
                            display: "flex", alignItems: "flex-start", gap: 10,
                            cursor: "pointer", transition: "background 0.1s",
                          }}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setDoneTodos(prev => { const n = new Set(prev); n.add(t.id); return n; }); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: "var(--fg-subtle)" }}
                          >
                            <CheckSquare size={14} />
                          </button>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Case + direction badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--fg-muted)", background: "var(--sl3)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)" }}>
                                {t.case_number}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: dir.color, background: dir.bg, padding: "1px 5px", borderRadius: 3 }}>
                                {dir.label}
                              </span>
                            </div>
                            {/* Action */}
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--fg)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {t.action}
                            </div>
                            {/* Deadline */}
                            {days !== null && (
                              <div style={{ marginTop: 4, fontSize: 11, color: days <= 7 ? "#dc2626" : days <= 21 ? "#d97706" : "var(--fg-subtle)", display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={10} />
                                {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `${days} 天後截止`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {visibleTodos.length === 0 && (
                      <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 12, color: "var(--fg-subtle)" }}>
                        <CheckCircle size={20} color="#16a34a" style={{ marginBottom: 6 }} /><br />
                        目前無待辦事項
                      </div>
                    )}
                  </div>

                  <Link href="/app/todo" style={{
                    padding: "9px 14px", borderTop: "1px solid var(--border)",
                    fontSize: 12, color: "var(--fg-muted)", textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    background: "var(--sl1)", transition: "background 0.1s",
                  }}>
                    <CheckSquare size={12} />查看完整待辦清單
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{
        width: panelOpen ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: panelOpen ? "1px solid var(--border)" : "none",
        background: "var(--bg)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "relative",
        transition: panelOpen ? "none" : "width 0.2s",
      }}>
        {panelOpen && (
          <>
            <div onMouseDown={onPanelResizeDown} style={{
              position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
              cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
            </div>
            {panelType === "email" && selectedId && (
              <EmailDetailPanel
                emailId={selectedId}
                onClose={() => selectEmail(null)}
                onNavigate={(url) => router.push(url)}
              />
            )}
            {panelType === "todo" && selectedTodoId && (() => {
              const todo = MOCK_TODOS.find(t => t.id === selectedTodoId)!;
              return (
                <TodoDetailPanel
                  todo={todo}
                  onClose={() => selectTodo(null)}
                  isDone={doneTodos.has(todo.id)}
                  onDone={() => setDoneTodos(prev => { const n = new Set(prev); n.has(todo.id) ? n.delete(todo.id) : n.add(todo.id); return n; })}
                  onNavigate={(url) => router.push(url)}
                />
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

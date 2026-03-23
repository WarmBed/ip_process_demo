"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail, AlertCircle, CheckCircle, ChevronRight, HelpCircle,
  Clock, CheckSquare, X, Bot, CheckCircle2, Circle, ExternalLink, User, Scale, ArrowRight,
} from "lucide-react";
import { Badge, Button, IconButton, Separator } from "@radix-ui/themes";
import type { ApiResponse, EmailListItem } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";
import { MOCK_TODOS, DIRECTION_CONFIG } from "@/lib/mock-todo";
import type { TodoItem } from "@/lib/mock-todo";
import { EmailDetailPanel } from "@/components/email-detail-panel";
import { MOCK_CASES, MOCK_DEADLINES } from "@/lib/mock-cases";

const PENDING_REASONS: Record<string, { reason: string; detail: string; tag: string; tagColor: string }> = {
  e002: {
    reason: "方向碼不確定",
    detail: "TA 與 TC 特徵重疊，信心度 94%，請確認是委託發出還是客戶指示",
    tag: "信心不足",
    tagColor: "var(--orange-11)",
  },
};

const DEFAULT_REASON = {
  reason: "需人工確認",
  detail: "AI 無法完全確定分類，請人工審核後確認",
  tag: "待審核",
  tagColor: "var(--gray-9)",
};

const codeColor: Record<string, string> = {
  FA: "var(--blue-9)", FC: "var(--violet-9)", TA: "var(--green-9)", TC: "var(--orange-9)",
  FG: "var(--red-9)", TG: "var(--gray-8)", FX: "var(--gray-9)",
};

function StatCard({ label, value, sub, accent = false, last = false }: {
  label: string; value: string | React.ReactNode; sub?: string | React.ReactNode; accent?: boolean; last?: boolean;
}) {
  return (
    <div style={{
      flex: 1, padding: "16px 24px",
      borderRight: last ? "none" : "1px solid var(--gray-5)",
      background: accent ? "var(--orange-2)" : "transparent",
    }}>
      <div style={{ fontSize: 12, color: accent ? "var(--orange-11)" : "var(--gray-9)", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ? "var(--orange-11)" : "var(--gray-12)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? "var(--orange-10)" : "var(--gray-9)", marginTop: 4 }}>{sub}</div>}
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
  const deadlineColor = days === null ? "var(--gray-9)" : days <= 7 ? "var(--red-9)" : days <= 21 ? "var(--orange-9)" : "var(--gray-9)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gray-5)", background: "var(--gray-2)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Badge variant="outline" color="gray" style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 12 }}>
              {todo.case_number}
            </Badge>
            <Badge variant="soft" style={{ color: dir.color, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
              {DIR_ICON[todo.direction]}{dir.label}
            </Badge>
            {isUrg && <Badge variant="soft" color="red" style={{ fontSize: 10, fontWeight: 700 }}>急</Badge>}
          </div>
          <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 3 }}>{todo.client}</div>
        </div>
        <IconButton variant="ghost" color="gray" size="1" onClick={onClose}>
          <X size={14} />
        </IconButton>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Action */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>下一步動作</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-12)", lineHeight: 1.5 }}>{todo.action}</div>
        </div>

        {/* Detail */}
        {todo.detail && (
          <div style={{ marginBottom: 16, padding: "12px 14px", background: "var(--gray-2)", borderRadius: 4, border: "1px solid var(--gray-5)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>狀況說明</div>
            <p style={{ fontSize: 13, color: "var(--gray-12)", lineHeight: 1.7, margin: 0 }}>{todo.detail}</p>
          </div>
        )}

        {/* AI suggestion */}
        {todo.ai_suggestion && (
          <div style={{ marginBottom: 16, padding: "10px 12px", background: "var(--green-2)", borderRadius: 4, borderLeft: "3px solid var(--green-9)", display: "flex", gap: 8 }}>
            <Bot size={14} color="var(--green-9)" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: "var(--green-11)", margin: 0, lineHeight: 1.6 }}>{todo.ai_suggestion}</p>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, padding: "12px 14px", background: "var(--gray-2)", borderRadius: 4, border: "1px solid var(--gray-5)" }}>
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
            { label: "優先級",  value: todo.priority === "urgent" ? <span style={{ color: "var(--red-9)", fontWeight: 600 }}>急</span> : todo.priority === "normal" ? "一般" : "低" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 10, fontSize: 12 }}>
              <span style={{ color: "var(--gray-9)", minWidth: 56, flexShrink: 0 }}>{label}</span>
              <span style={{ color: "var(--gray-12)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {todo.tags.length > 0 && (
          <div style={{ marginBottom: 16, display: "flex", gap: 5, flexWrap: "wrap" }}>
            {todo.tags.map(tag => (
              <Badge key={tag} variant="soft" color="gray" style={{ fontSize: 11 }}>{tag}</Badge>
            ))}
          </div>
        )}

        {/* Source email */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>來源信件</div>
          <button
            onClick={() => onNavigate(`/app/emails/${todo.source_email_id}`)}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "9px 12px", border: "1px solid var(--gray-5)", borderRadius: 4, background: "var(--color-background)", cursor: "pointer", textAlign: "left" }}
          >
            <Mail size={13} color="var(--gray-8)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{todo.source_subject}</div>
              <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 1 }}>
                {new Date(todo.source_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
              </div>
            </div>
            <ExternalLink size={11} color="var(--gray-8)" style={{ flexShrink: 0 }} />
          </button>
        </div>

        {/* Full todo link */}
        <Link href={`/app/todo`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--gray-8)", textDecoration: "none" }}>
          <CheckSquare size={12} />在待辦清單中查看 <ChevronRight size={11} />
        </Link>
      </div>

      {/* Footer action */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--gray-5)", flexShrink: 0 }}>
        <Button
          onClick={onDone}
          variant={isDone ? "outline" : "solid"}
          color={isDone ? "gray" : "green"}
          style={{ width: "100%", cursor: "pointer" }}
          size="2"
        >
          {isDone ? <><Circle size={14} />取消完成</> : <><CheckCircle2 size={14} />標記完成</>}
        </Button>
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

  // Case stats
  const activeCases  = MOCK_CASES.filter(c => !["granted","abandoned","rejected"].includes(c.status)).length;
  const oaCases      = MOCK_CASES.filter(c => c.status === "oa_issued").length;
  const urgentDls    = MOCK_DEADLINES.filter(d => {
    const days = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
    return d.status !== "completed" && days <= 30;
  }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div className="page-pad" style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <div style={{ maxWidth: 900 }}>

          {/* Stat cards */}
          <div className="stat-row" style={{ display: "flex", border: "1px solid var(--gray-5)", borderRadius: 4, marginBottom: 24, overflow: "hidden", background: "var(--color-background)" }}>
            <StatCard label="進行中案件" value={<span style={{ color: "var(--blue-9)" }}>{activeCases} 件</span>} sub={`共 ${MOCK_CASES.length} 件`} />
            <StatCard
              label="OA 待答辯"
              value={<span style={{ color: oaCases > 0 ? "var(--orange-9)" : "var(--green-9)" }}>{oaCases} 件</span>}
              sub={oaCases > 0 ? "需提交答辯" : "無待辦答辯"}
              accent={oaCases > 0}
            />
            <StatCard
              label="30 天內期限"
              value={<span style={{ color: urgentDls.length > 0 ? "var(--red-9)" : "var(--green-9)" }}>{urgentDls.length} 個</span>}
              sub={urgentDls.length > 0 ? "請注意截止日" : "無緊急期限"}
              accent={urgentDls.length > 0}
            />
            <StatCard label="今日信件" value={`${todayMsgs.length} 封`} sub={pending.length > 0 ? `${pending.length} 封待確認` : "全部已歸類"} last />
          </div>

          {/* ── Two-domain layout ── */}
          <div className="two-domain" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

            {/* ─── LEFT: 案件追蹤 ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Domain label */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--green-9)", flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green-9)", textTransform: "uppercase", letterSpacing: "0.07em" }}>案件追蹤</span>
              </div>

              {/* Deadline docket */}
              <div style={{ border: "1px solid var(--gray-5)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--gray-5)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--green-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Clock size={12} color="var(--green-9)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green-11)" }}>截止期限</span>
                    {urgentDls.filter(d => Math.ceil((new Date(d.due_date).getTime()-Date.now())/86400000) <= 7).length > 0 && (
                      <Badge variant="soft" color="red" size="1" style={{ fontSize: 10, fontWeight: 700 }}>
                        {urgentDls.filter(d => Math.ceil((new Date(d.due_date).getTime()-Date.now())/86400000) <= 7).length} 緊急
                      </Badge>
                    )}
                  </div>
                  <Link href="/app/deadlines" style={{ fontSize: 11, color: "var(--green-9)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                    全部 {urgentDls.length} 個 <ChevronRight size={10} />
                  </Link>
                </div>
                {urgentDls.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "var(--gray-9)" }}>30 天內無截止期限</div>
                ) : (
                  urgentDls.slice(0, 5).map((d, i, arr) => {
                    const days   = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
                    const isRed  = days <= 7;
                    return (
                      <div key={d.id} style={{
                        display: "grid", gridTemplateColumns: "130px 1fr 60px",
                        alignItems: "center", gap: 10,
                        padding: "9px 14px",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--gray-5)" : "none",
                        borderLeft: `3px solid ${isRed ? "var(--red-9)" : "var(--orange-9)"}`,
                        background: isRed ? "var(--red-2)" : "var(--color-background)",
                      }}>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, fontWeight: 600, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.case_number}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                          <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>{d.client_name}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isRed ? "var(--red-9)" : "var(--orange-9)", textAlign: "right" }}>
                          {days <= 0 ? `逾期${Math.abs(days)}d` : `${days}d`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Case todos */}
              {(() => {
                const urgentTodos  = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.priority === "urgent");
                const normalTodos  = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done" && t.priority === "normal");
                const visibleTodos = [...urgentTodos, ...normalTodos].slice(0, 5);
                const totalPending = MOCK_TODOS.filter(t => !doneTodos.has(t.id) && t.status !== "done").length;
                return (
                  <div style={{ border: "1px solid var(--gray-5)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--gray-5)", background: "var(--gray-2)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckSquare size={12} color="var(--gray-8)" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>案件待辦</span>
                        {urgentTodos.length > 0 && (
                          <Badge variant="soft" color="red" size="1" style={{ fontSize: 10, fontWeight: 700 }}>
                            {urgentTodos.length} 急
                          </Badge>
                        )}
                      </div>
                      <Link href="/app/todo" style={{ fontSize: 11, color: "var(--gray-8)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                        全部 {totalPending} 件 <ChevronRight size={10} />
                      </Link>
                    </div>
                    {visibleTodos.map((t, i) => {
                      const days     = daysUntil(t.deadline);
                      const dir      = DIRECTION_CONFIG[t.direction];
                      const isUrgent = t.priority === "urgent";
                      const isSel    = selectedTodoId === t.id;
                      return (
                        <div key={t.id}
                          onClick={() => selectTodo(isSel ? null : t.id)}
                          style={{
                            padding: "9px 14px",
                            borderBottom: i < visibleTodos.length - 1 ? "1px solid var(--gray-5)" : "none",
                            borderLeft: `3px solid ${isSel ? "var(--green-9)" : isUrgent ? "var(--red-9)" : "var(--orange-9)"}`,
                            background: isSel ? "var(--green-2)" : isUrgent ? "var(--red-2)" : "var(--color-background)",
                            display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer",
                          }}
                        >
                          <button onClick={(e) => { e.stopPropagation(); setDoneTodos(prev => { const n = new Set(prev); n.add(t.id); return n; }); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: "var(--gray-9)" }}>
                            <CheckSquare size={13} />
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <Badge variant="outline" color="gray" style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 10, padding: "1px 5px" }}>
                                {t.case_number}
                              </Badge>
                              <Badge variant="soft" style={{ fontSize: 10, fontWeight: 600, color: dir.color, padding: "1px 5px" }}>
                                {dir.label}
                              </Badge>
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--gray-12)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                              {t.action}
                            </div>
                            {days !== null && (
                              <div style={{ marginTop: 3, fontSize: 10, color: days <= 7 ? "var(--red-9)" : days <= 21 ? "var(--orange-9)" : "var(--gray-9)", display: "flex", alignItems: "center", gap: 3 }}>
                                <Clock size={9} />
                                {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `${days} 天後截止`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {visibleTodos.length === 0 && (
                      <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: "var(--gray-9)" }}>目前無待辦事項</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ─── RIGHT: 信件收發 ─── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Domain label */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--gray-8)", flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-8)", textTransform: "uppercase", letterSpacing: "0.07em" }}>信件收發</span>
              </div>

              {/* Pending emails needing review */}
              {pending.length > 0 && (
                <div style={{ border: "1px solid var(--orange-6)", borderRadius: 4, overflow: "hidden", background: "var(--orange-2)" }}>
                  <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--orange-6)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <AlertCircle size={12} color="var(--orange-9)" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--orange-11)" }}>待人工確認</span>
                      <Badge variant="soft" color="orange" size="1" style={{ fontWeight: 700 }}>
                        {pending.length}
                      </Badge>
                    </div>
                    <Button variant="ghost" color="orange" size="1" onClick={() => router.push("/app/emails?status=pending")} style={{ cursor: "pointer" }}>
                      全部確認 <ChevronRight size={10} />
                    </Button>
                  </div>
                  {pending.map((e, i) => {
                    const r = PENDING_REASONS[e.id] ?? DEFAULT_REASON;
                    const isSel = selectedId === e.id;
                    return (
                      <div key={e.id}
                        onClick={() => selectEmail(isSel ? null : e.id)}
                        style={{
                          padding: "10px 14px",
                          borderBottom: i < pending.length - 1 ? "1px solid var(--orange-6)" : "none",
                          cursor: "pointer", background: isSel ? "var(--orange-3)" : "transparent",
                        }}
                        onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--orange-3)"; }}
                        onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge variant="outline" style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, color: codeColor[e.direction_code ?? ""] ?? "var(--gray-9)" }}>
                            {e.direction_code ?? "?"}
                          </Badge>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                            <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>
                              {e.sender_name} ·
                              <span style={{ marginLeft: 4, color: r.tagColor, fontWeight: 600 }}>{r.tag}</span>
                            </div>
                          </div>
                          <HelpCircle size={11} color={r.tagColor} style={{ flexShrink: 0 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recent emails */}
              <div style={{ border: "1px solid var(--gray-5)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--gray-5)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--gray-2)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)" }}>最近信件</span>
                  <Button variant="ghost" color="gray" size="1" onClick={() => router.push("/app/emails")} style={{ cursor: "pointer" }}>
                    查看全部 <ChevronRight size={10} />
                  </Button>
                </div>
                {recentEmails.map((e, i) => {
                  const isSel = selectedId === e.id;
                  return (
                    <div key={e.id}
                      onClick={() => selectEmail(isSel ? null : e.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                        borderBottom: i < recentEmails.length - 1 ? "1px solid var(--gray-5)" : "none",
                        cursor: "pointer", background: isSel ? "var(--gray-3)" : "var(--color-background)",
                      }}
                      onMouseEnter={el => { if (!isSel) el.currentTarget.style.background = "var(--gray-2)"; }}
                      onMouseLeave={el => { if (!isSel) el.currentTarget.style.background = "var(--color-background)"; }}
                    >
                      <Badge variant="soft" color="gray" style={{ fontSize: 9, fontWeight: 700, flexShrink: 0, color: codeColor[e.direction_code ?? ""] ?? "var(--gray-9)" }}>
                        {e.direction_code ?? "?"}
                      </Badge>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                        <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>
                          {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {e.status === "pending"   && <AlertCircle  size={11} color="var(--orange-9)" style={{ flexShrink: 0 }} />}
                      {e.status === "confirmed" && <CheckCircle  size={11} color="var(--green-9)" style={{ flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{
        width: panelOpen ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: panelOpen ? "1px solid var(--gray-5)" : "none",
        background: "var(--color-background)",
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
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--gray-7)", opacity: 0.5 }} />
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

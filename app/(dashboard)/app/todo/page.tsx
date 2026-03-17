"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Clock, Hash, Mail, AlertTriangle, ArrowRight,
  Bot, User, Building2, Scale, Filter, RotateCcw, ChevronRight,
} from "lucide-react";
import { MOCK_TODOS, DIRECTION_CONFIG as DIR_BASE } from "@/lib/mock-todo";
import type { TodoItem } from "@/lib/mock-todo";
import { EmailDetailPanel } from "@/components/email-detail-panel";

// ── Helpers ─────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  send:     { ...DIR_BASE.send,     icon: ArrowRight },
  wait:     { ...DIR_BASE.wait,     icon: Clock },
  review:   { ...DIR_BASE.review,   icon: Scale },
  internal: { ...DIR_BASE.internal, icon: User },
};

const PRIORITY_CONFIG = {
  urgent: { label: "急",   color: "#dc2626", bg: "#fef2f2" },
  normal: { label: "一般", color: "#d97706", bg: "#fffbeb" },
  low:    { label: "低",   color: "#6b7280", bg: "#f9fafb" },
};

type Party = "我方" | "客戶" | "代理人" | "政府機關";

const WHO_ICON: Record<Party, React.ReactNode> = {
  "我方":    <User size={11} />,
  "客戶":    <Building2 size={11} />,
  "代理人":  <Scale size={11} />,
  "政府機關": <Scale size={11} />,
};

function daysUntil(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function DeadlineBadge({ iso }: { iso?: string }) {
  const days = daysUntil(iso);
  if (days === null) return null;
  const color = days <= 7 ? "#dc2626" : days <= 21 ? "#d97706" : "#6b7280";
  const bg    = days <= 7 ? "#fef2f2" : days <= 21 ? "#fffbeb" : "var(--sl2)";
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "2px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
      {days <= 0 ? <AlertTriangle size={10} /> : <Clock size={10} />}
      {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `${days} 天後截止`}
    </span>
  );
}

// ── Main ────────────────────────────────────────────────────────

type FilterTab = "all" | "pending" | "in_progress" | "done";
type DirectionFilter = "all" | "send" | "wait" | "review" | "internal";

export default function TodoPage() {
  const router = useRouter();
  const [filter, setFilter]         = useState<FilterTab>("all");
  const [dirFilter, setDirFilter]   = useState<DirectionFilter>("all");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [done, setDone]             = useState<Set<string>>(new Set());
  const [emailPanelId, setEmailPanelId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(440);

  // ── Resize ──────────────────────────────────────────────────
  const resizing    = useRef(false);
  const resizeStart = useRef({ mx: 0, pw: 440 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const w = Math.min(720, Math.max(320, resizeStart.current.pw - (e.clientX - resizeStart.current.mx)));
      setPanelWidth(w);
    };
    const onUp = () => {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  // ── Data ────────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleDone = (id: string) => {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const openEmail = (emailId: string) => setEmailPanelId(prev => prev === emailId ? null : emailId);

  const items = MOCK_TODOS.filter(t => {
    const status = done.has(t.id) ? "done" : t.status;
    if (filter !== "all" && status !== filter) return false;
    if (dirFilter !== "all" && t.direction !== dirFilter) return false;
    return true;
  });

  const counts = {
    all:         MOCK_TODOS.length,
    pending:     MOCK_TODOS.filter(t => !done.has(t.id) && t.status === "pending").length,
    in_progress: MOCK_TODOS.filter(t => !done.has(t.id) && t.status === "in_progress").length,
    done:        MOCK_TODOS.filter(t => done.has(t.id) || t.status === "done").length,
  };

  const urgentCount = items.filter(t => t.priority === "urgent" && !done.has(t.id)).length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Left: todo list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        <div style={{ maxWidth: 860 }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
                案件待辦
              </h1>
              {urgentCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: 10, border: "1px solid #fecaca" }}>
                  {urgentCount} 件急
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--fg-subtle)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
                <Bot size={13} color="#6366f1" />AI 從信件自動抽取下一步
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0, lineHeight: 1.6 }}>
              每封收到或寄出的信件，AI 會自動分析「下一步誰要做什麼」，整合成這份案件待辦清單。
            </p>
          </div>

          {/* Status tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--border)" }}>
            {([
              ["all", "全部"],
              ["pending", "待處理"],
              ["in_progress", "進行中"],
              ["done", "已完成"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "7px 14px", fontSize: 13, fontWeight: filter === key ? 600 : 400,
                color: filter === key ? "var(--fg)" : "var(--fg-muted)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: filter === key ? "2px solid var(--fg)" : "2px solid transparent",
                marginBottom: -1, display: "flex", alignItems: "center", gap: 5,
              }}>
                {label}
                <span style={{
                  fontSize: 11, fontWeight: 600, minWidth: 18, textAlign: "center",
                  background: filter === key ? "var(--fg)" : "var(--sl4)",
                  color: filter === key ? "var(--bg)" : "var(--fg-muted)",
                  padding: "0 5px", borderRadius: 8,
                }}>{counts[key]}</span>
              </button>
            ))}
          </div>

          {/* Direction filter */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16, alignItems: "center" }}>
            <Filter size={12} color="var(--fg-subtle)" />
            <span style={{ fontSize: 12, color: "var(--fg-subtle)", marginRight: 4 }}>動作類型：</span>
            {([
              ["all", "全部"],
              ["review", "我方審閱"],
              ["send", "我方發出"],
              ["internal", "內部確認"],
              ["wait", "等待中"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setDirFilter(key)} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer",
                fontWeight: dirFilter === key ? 600 : 400,
                background: dirFilter === key ? "var(--fg)" : "var(--sl2)",
                color: dirFilter === key ? "var(--bg)" : "var(--fg-muted)",
                border: "1px solid var(--border)",
              }}>{label}</button>
            ))}
          </div>

          {/* Todo list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--fg-subtle)", fontSize: 13 }}>
                沒有符合條件的待辦事項
              </div>
            )}

            {items.map(item => {
              const isDone  = done.has(item.id);
              const isExp   = expanded.has(item.id);
              const dirConf = DIRECTION_CONFIG[item.direction];
              const priConf = PRIORITY_CONFIG[item.priority];
              const DirIcon = dirConf.icon;
              const emailOpen = emailPanelId === item.source_email_id;

              return (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${emailOpen ? "#a5b4fc" : isDone ? "var(--border)" : item.priority === "urgent" ? "#fca5a5" : "var(--border)"}`,
                    borderRadius: 10,
                    background: isDone ? "var(--sl1)" : "var(--bg)",
                    overflow: "hidden",
                    opacity: isDone ? 0.55 : 1,
                    transition: "opacity 0.2s, border-color 0.15s",
                  }}
                >
                  {/* Main row */}
                  <div style={{ padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleDone(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: isDone ? "#16a34a" : "var(--fg-subtle)" }}
                      title={isDone ? "標記未完成" : "標記完成"}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--fg)", background: "var(--sl2)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                          <Hash size={10} />{item.case_number}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{item.client}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: priConf.color, background: priConf.bg, padding: "1px 6px", borderRadius: 4 }}>{priConf.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: dirConf.color, background: dirConf.bg, padding: "2px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                          <DirIcon size={10} />{dirConf.label}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                          {WHO_ICON[item.who as Party]}{item.who}
                        </span>
                        <DeadlineBadge iso={item.deadline} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: isDone ? 400 : 600, color: isDone ? "var(--fg-muted)" : "var(--fg)", lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none", marginBottom: 5 }}>
                        {item.action}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {item.tags.map(tag => (
                          <span key={tag} style={{ fontSize: 10, color: "var(--fg-subtle)", background: "var(--sl3)", padding: "1px 6px", borderRadius: 3, border: "1px solid var(--border)" }}>{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Expand button */}
                    <button onClick={() => toggleExpand(item.id)} className="btn-ghost" style={{ padding: "4px 6px", flexShrink: 0, marginTop: 2 }}>
                      {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ borderTop: "1px solid var(--border)", background: "var(--sl1)" }}>
                      {item.detail && (
                        <div style={{ padding: "12px 16px 0" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>狀況說明</div>
                          <p style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.7, margin: 0 }}>{item.detail}</p>
                        </div>
                      )}

                      {item.ai_suggestion && (
                        <div style={{ margin: "12px 16px 0", padding: "8px 12px", background: "#eef2ff", borderRadius: 7, borderLeft: "3px solid #6366f1", display: "flex", gap: 7, alignItems: "flex-start" }}>
                          <Bot size={13} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
                          <p style={{ fontSize: 12, color: "#3730a3", margin: 0, lineHeight: 1.6 }}>{item.ai_suggestion}</p>
                        </div>
                      )}

                      {/* Source email row */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {/* 展開信件 button */}
                        <button
                          onClick={() => openEmail(item.source_email_id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                            color: emailOpen ? "#4338ca" : "var(--fg-muted)", textDecoration: "none",
                            border: `1px solid ${emailOpen ? "#a5b4fc" : "var(--border)"}`,
                            background: emailOpen ? "#eef2ff" : "var(--bg)",
                            padding: "5px 10px", borderRadius: 5, cursor: "pointer",
                            fontWeight: emailOpen ? 600 : 400,
                          }}
                        >
                          <Mail size={11} />
                          <span style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.source_subject}</span>
                          <ChevronRight size={11} style={{ transform: emailOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                        </button>

                        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                          {new Date(item.source_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                        </span>
                        {item.deadline && (
                          <span style={{ fontSize: 11, color: "var(--fg-subtle)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />截止：{new Date(item.deadline).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                          </span>
                        )}
                        <button
                          onClick={() => toggleDone(item.id)}
                          style={{
                            marginLeft: "auto", fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                            background: isDone ? "var(--sl3)" : "#166534", color: isDone ? "var(--fg-muted)" : "#fff",
                            border: isDone ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 5,
                          }}
                        >
                          {isDone ? <><RotateCcw size={11} />取消完成</> : <><CheckCircle2 size={11} />標記完成</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: email detail panel ── */}
      <div style={{
        width: emailPanelId ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: emailPanelId ? "1px solid var(--border)" : "none",
        background: "var(--bg)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "relative",
        transition: emailPanelId ? "none" : "width 0.2s",
      }}>
        {emailPanelId && (
          <>
            {/* Drag handle */}
            <div onMouseDown={onResizeDown} style={{
              position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
              cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
            </div>
            <EmailDetailPanel
              emailId={emailPanelId}
              onClose={() => setEmailPanelId(null)}
              onNavigate={(url) => router.push(url)}
            />
          </>
        )}
      </div>
    </div>
  );
}

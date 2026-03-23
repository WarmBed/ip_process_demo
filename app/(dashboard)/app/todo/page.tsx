"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Button, IconButton, Separator } from "@radix-ui/themes";
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
  urgent: { label: "急",   color: "red"   as const },
  normal: { label: "一般", color: "amber" as const },
  low:    { label: "低",   color: "gray"  as const },
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
  const badgeColor = days <= 7 ? "red" as const : days <= 21 ? "amber" as const : "gray" as const;
  return (
    <Badge variant="soft" color={badgeColor} size="1" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
      {days <= 0 ? <AlertTriangle size={10} /> : <Clock size={10} />}
      {days <= 0 ? `逾期 ${Math.abs(days)} 天` : `${days} 天後截止`}
    </Badge>
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

          {/* Header badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            {urgentCount > 0 && (
              <Badge variant="soft" color="red" size="1" style={{ fontWeight: 700 }}>
                {urgentCount} 件急
              </Badge>
            )}
            <span style={{ fontSize: 12, color: "var(--gray-11)", display: "flex", alignItems: "center", gap: 5 }}>
              <Bot size={13} color="var(--green-9)" />AI 從信件自動抽取下一步
            </span>
          </div>

          {/* Status tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--gray-6)" }}>
            {([
              ["all", "全部"],
              ["pending", "待處理"],
              ["in_progress", "進行中"],
              ["done", "已完成"],
            ] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "7px 14px", fontSize: 13, fontWeight: filter === key ? 600 : 400,
                color: filter === key ? "var(--gray-12)" : "var(--gray-11)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: filter === key ? "2px solid var(--gray-12)" : "2px solid transparent",
                marginBottom: -1, display: "flex", alignItems: "center", gap: 5,
                transition: "color 0.12s, border-color 0.12s",
              }}>
                {label}
                <span style={{
                  fontSize: 11, fontWeight: 600, minWidth: 18, textAlign: "center",
                  background: filter === key ? "var(--gray-12)" : "var(--gray-4)",
                  color: filter === key ? "var(--color-background)" : "var(--gray-11)",
                  padding: "0 5px", borderRadius: 8,
                }}>{counts[key]}</span>
              </button>
            ))}
          </div>

          {/* Direction filter */}
          <div style={{ display: "flex", gap: 5, marginBottom: 16, alignItems: "center" }}>
            <Filter size={12} color="var(--gray-9)" />
            <span style={{ fontSize: 12, color: "var(--gray-9)", marginRight: 4 }}>動作類型：</span>
            {([
              ["all", "全部"],
              ["review", "我方審閱"],
              ["send", "我方發出"],
              ["internal", "內部確認"],
              ["wait", "等待中"],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                variant={dirFilter === key ? "solid" : "outline"}
                color={dirFilter === key ? "green" : "gray"}
                size="1"
                onClick={() => setDirFilter(key)}
                style={{ fontSize: 11, cursor: "pointer" }}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Todo list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.length === 0 && (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
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
                    border: `1px solid ${emailOpen ? "var(--green-7)" : isDone ? "var(--gray-6)" : item.priority === "urgent" ? "var(--red-7)" : "var(--gray-6)"}`,
                    borderRadius: 10,
                    background: isDone ? "var(--gray-2)" : "var(--color-background)",
                    overflow: "hidden",
                    opacity: isDone ? 0.55 : 1,
                    transition: "opacity 0.2s, border-color 0.12s",
                  }}
                >
                  {/* Main row */}
                  <div style={{ padding: "13px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleDone(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: isDone ? "var(--green-9)" : "var(--gray-9)" }}
                      title={isDone ? "標記未完成" : "標記完成"}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--gray-12)", background: "var(--gray-3)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--gray-6)" }}>
                          <Hash size={10} />{item.case_number}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--gray-11)" }}>{item.client}</span>
                        <Badge variant="soft" color={priConf.color} size="1">{priConf.label}</Badge>
                        <Badge variant="soft" color="gray" size="1" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <DirIcon size={10} />{dirConf.label}
                        </Badge>
                        <span style={{ fontSize: 11, color: "var(--gray-11)", display: "flex", alignItems: "center", gap: 3 }}>
                          {WHO_ICON[item.who as Party]}{item.who}
                        </span>
                        <DeadlineBadge iso={item.deadline} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: isDone ? 400 : 600, color: isDone ? "var(--gray-11)" : "var(--gray-12)", lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none", marginBottom: 5 }}>
                        {item.action}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline" color="gray" size="1" style={{ fontSize: 10 }}>{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Expand button */}
                    <IconButton variant="ghost" color="gray" size="1" onClick={() => toggleExpand(item.id)} style={{ flexShrink: 0, marginTop: 2, cursor: "pointer" }}>
                      {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </IconButton>
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ borderTop: "1px solid var(--gray-6)", background: "var(--gray-2)" }}>
                      {item.detail && (
                        <div style={{ padding: "12px 16px 0" }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>狀況說明</div>
                          <p style={{ fontSize: 13, color: "var(--gray-12)", lineHeight: 1.7, margin: 0 }}>{item.detail}</p>
                        </div>
                      )}

                      {item.ai_suggestion && (
                        <div style={{ margin: "12px 16px 0", padding: "8px 12px", background: "var(--green-2)", borderRadius: 7, borderLeft: "3px solid var(--green-9)", display: "flex", gap: 7, alignItems: "flex-start" }}>
                          <Bot size={13} color="var(--green-9)" style={{ marginTop: 2, flexShrink: 0 }} />
                          <p style={{ fontSize: 12, color: "var(--green-11)", margin: 0, lineHeight: 1.6 }}>{item.ai_suggestion}</p>
                        </div>
                      )}

                      {/* Source email row */}
                      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        {/* 展開信件 button */}
                        <Button
                          variant={emailOpen ? "soft" : "outline"}
                          color={emailOpen ? "green" : "gray"}
                          size="1"
                          onClick={() => openEmail(item.source_email_id)}
                          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          <Mail size={11} />
                          <span style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.source_subject}</span>
                          <ChevronRight size={11} style={{ transform: emailOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                        </Button>

                        <span style={{ fontSize: 11, color: "var(--gray-9)" }}>
                          {new Date(item.source_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                        </span>
                        {item.deadline && (
                          <span style={{ fontSize: 11, color: "var(--gray-9)", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />截止：{new Date(item.deadline).toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                          </span>
                        )}
                        <Button
                          variant={isDone ? "outline" : "solid"}
                          color={isDone ? "gray" : "green"}
                          size="1"
                          onClick={() => toggleDone(item.id)}
                          style={{ marginLeft: "auto", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                        >
                          {isDone ? <><RotateCcw size={11} />取消完成</> : <><CheckCircle2 size={11} />標記完成</>}
                        </Button>
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
        borderLeft: emailPanelId ? "1px solid var(--gray-6)" : "none",
        background: "var(--color-background)",
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
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--gray-7)", opacity: 0.5 }} />
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

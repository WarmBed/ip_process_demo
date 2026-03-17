"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Clock, Hash, Mail, AlertTriangle, ArrowRight,
  Bot, User, Building2, Scale, Filter, RotateCcw,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────

type Party = "我方" | "客戶" | "代理人" | "政府機關";
type Priority = "urgent" | "normal" | "low";
type TodoStatus = "pending" | "in_progress" | "done";

interface TodoItem {
  id: string;
  case_number: string;
  client: string;
  action: string;           // 具體動作（一句話）
  detail?: string;          // AI 摘要說明
  who: Party;               // 誰要動
  direction: "send" | "wait" | "review" | "internal"; // 動作類型
  deadline?: string;        // ISO date
  source_email_id: string;
  source_subject: string;
  source_date: string;
  priority: Priority;
  status: TodoStatus;
  tags: string[];
  ai_suggestion?: string;   // AI 建議行動文字
}

// ── Mock data（模擬 AI 從信件自動抽取）──────────────────────────

const MOCK_TODOS: TodoItem[] = [
  {
    id: "todo-001",
    case_number: "BRIT25710PUS1",
    client: "BSKB LLP / John Smith",
    action: "審閱 BSKB 提交的 OA 答辯草稿 v1，確認 Claims 修正",
    detail: "John Smith 於 3/17 提交最終答辯草稿，含修正後 Claims 1–11 及測試數據附件。需確認 §103 非顯而易見論點是否充分，官方截止日 4/15，需留 2 週緩衝。",
    who: "我方",
    direction: "review",
    deadline: "2026-03-31",
    source_email_id: "e001",
    source_subject: "RE: BRIT25710PUS1 - Office Action Response",
    source_date: "2026-03-17",
    priority: "urgent",
    status: "pending",
    tags: ["OA答辯", "USPTO", "截止日臨近"],
    ai_suggestion: "建議：優先審閱 Claims 6–10 的非顯而易見論點，這是本次 OA 最主要拒絕理由。",
  },
  {
    id: "todo-002",
    case_number: "KOIT20004TUS7",
    client: "Korean IP Client",
    action: "確認 TA 委託方向是否正確，決定由哪位代理人草擬 OA2 答辯",
    detail: "AI 分類為 TA（寄出・代理人），信心度 94%，但 TC 特徵重疊。需人工確認後，才能正式委託 TA 草擬答辯草稿。OA2 截止日 2026-06-15。",
    who: "我方",
    direction: "internal",
    deadline: "2026-03-20",
    source_email_id: "e002",
    source_subject: "KOIT20004TUS7 - TA委託 Office Action Draft",
    source_date: "2026-03-17",
    priority: "urgent",
    status: "pending",
    tags: ["OA2", "方向碼待確認", "需人工審核"],
    ai_suggestion: "建議：先確認 TA/TC 再委託，避免後續流程錯誤。",
  },
  {
    id: "todo-003",
    case_number: "TWIP22301TW3",
    client: "台灣客戶 A",
    action: "催促客戶提供發明說明書中文版（已要求 2 週未回覆）",
    detail: "3/3 曾寄送請求，至今未收到回覆。若 3/20 前仍未提供，將影響 PCT 申請時程。",
    who: "客戶",
    direction: "wait",
    deadline: "2026-03-20",
    source_email_id: "e004",
    source_subject: "TWIP22301TW3 - 請提供發明說明書中文版",
    source_date: "2026-03-03",
    priority: "urgent",
    status: "in_progress",
    tags: ["催件", "PCT", "逾期風險"],
    ai_suggestion: "已等待 14 天，建議升級聯絡方式（電話或 Line）。",
  },
  {
    id: "todo-004",
    case_number: "USPA24501US2",
    client: "US Client B",
    action: "寄送年費繳納提醒給客戶，確認是否繼續維持",
    detail: "US Patent 年費截止日 2026-04-30，距今 44 天。需客戶書面確認是否繼續維持，若放棄需 3/31 前告知。",
    who: "客戶",
    direction: "send",
    deadline: "2026-03-31",
    source_email_id: "e005",
    source_subject: "USPA24501US2 - Maintenance Fee Reminder",
    source_date: "2026-03-10",
    priority: "normal",
    status: "pending",
    tags: ["年費", "維持確認"],
    ai_suggestion: "建議附上年費金額及放棄後果說明，提高回覆率。",
  },
  {
    id: "todo-005",
    case_number: "EPPA23801EP1",
    client: "European Client C",
    action: "等待 EPO 審查結果，預計 Q2 回覆",
    detail: "已於 2026-01-15 提交 Response to Rule 71(3)，EPO 預計 3 個月內發出 Notice of Grant 或 Communication。無需主動動作，注意收信。",
    who: "政府機關",
    direction: "wait",
    deadline: "2026-06-30",
    source_email_id: "e006",
    source_subject: "EPPA23801EP1 - Response to Rule 71(3) Filed",
    source_date: "2026-01-15",
    priority: "low",
    status: "pending",
    tags: ["EPO", "等待中", "授權程序"],
  },
  {
    id: "todo-006",
    case_number: "BRIT25710PUS1",
    client: "BSKB LLP / John Smith",
    action: "USPTO 回覆後通知 BSKB，同步更新案件狀態",
    detail: "OA 答辯提交後，需監控 USPTO PAIR 系統，有回覆立即通知代理人。預計回覆時間 3–6 個月。",
    who: "政府機關",
    direction: "wait",
    deadline: "2026-09-30",
    source_email_id: "e001",
    source_subject: "RE: BRIT25710PUS1 - Office Action Response",
    source_date: "2026-03-17",
    priority: "low",
    status: "pending",
    tags: ["USPTO", "等待回覆", "PAIR監控"],
  },
];

// ── Helpers ─────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  send:     { label: "我方發出",   color: "#1d4ed8", bg: "#eff6ff", icon: ArrowRight },
  wait:     { label: "等待回覆",   color: "#6b7280", bg: "#f9fafb", icon: Clock },
  review:   { label: "我方審閱",   color: "#7c3aed", bg: "#f5f3ff", icon: Scale },
  internal: { label: "內部確認",   color: "#d97706", bg: "#fffbeb", icon: User },
};

const PRIORITY_CONFIG = {
  urgent: { label: "急",   color: "#dc2626", bg: "#fef2f2" },
  normal: { label: "一般", color: "#d97706", bg: "#fffbeb" },
  low:    { label: "低",   color: "#6b7280", bg: "#f9fafb" },
};

const WHO_ICON: Record<Party, React.ReactNode> = {
  "我方":    <User size={11} />,
  "客戶":    <Building2 size={11} />,
  "代理人":  <Scale size={11} />,
  "政府機關": <Scale size={11} />,
};

function daysUntil(iso?: string) {
  if (!iso) return null;
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return diff;
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
  const [filter, setFilter]         = useState<FilterTab>("all");
  const [dirFilter, setDirFilter]   = useState<DirectionFilter>("all");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [done, setDone]             = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleDone = (id: string) => {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

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
    <div style={{ padding: "20px 28px", maxWidth: 880 }}>

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
      <div style={{ display: "flex", gap: 2, marginBottom: 14, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {([
          ["all", "全部"],
          ["pending", "待處理"],
          ["in_progress", "進行中"],
          ["done", "已完成"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: "7px 14px", fontSize: 13, fontWeight: filter === key ? 600 : 400,
              color: filter === key ? "var(--fg)" : "var(--fg-muted)",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: filter === key ? "2px solid var(--fg)" : "2px solid transparent",
              marginBottom: -1, display: "flex", alignItems: "center", gap: 5,
            }}
          >
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
          <button
            key={key}
            onClick={() => setDirFilter(key)}
            style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 5, cursor: "pointer",
              fontWeight: dirFilter === key ? 600 : 400,
              background: dirFilter === key ? "var(--fg)" : "var(--sl2)",
              color: dirFilter === key ? "var(--bg)" : "var(--fg-muted)",
              border: "1px solid var(--border)",
            }}
          >{label}</button>
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
          const isDone    = done.has(item.id);
          const isExp     = expanded.has(item.id);
          const dirConf   = DIRECTION_CONFIG[item.direction];
          const priConf   = PRIORITY_CONFIG[item.priority];
          const DirIcon   = dirConf.icon;

          return (
            <div
              key={item.id}
              style={{
                border: `1px solid ${isDone ? "var(--border)" : item.priority === "urgent" ? "#fca5a5" : "var(--border)"}`,
                borderRadius: 10,
                background: isDone ? "var(--sl1)" : "var(--bg)",
                overflow: "hidden",
                opacity: isDone ? 0.55 : 1,
                transition: "opacity 0.2s",
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
                  {/* Top row: case + client + badges */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: "var(--fg)", background: "var(--sl2)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
                      <Hash size={10} />{item.case_number}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{item.client}</span>

                    {/* Priority */}
                    <span style={{ fontSize: 10, fontWeight: 700, color: priConf.color, background: priConf.bg, padding: "1px 6px", borderRadius: 4 }}>
                      {priConf.label}
                    </span>

                    {/* Direction */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: dirConf.color, background: dirConf.bg, padding: "2px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                      <DirIcon size={10} />{dirConf.label}
                    </span>

                    {/* Who */}
                    <span style={{ fontSize: 11, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                      {WHO_ICON[item.who]}{item.who}
                    </span>

                    <DeadlineBadge iso={item.deadline} />
                  </div>

                  {/* Action text */}
                  <div style={{ fontSize: 14, fontWeight: isDone ? 400 : 600, color: isDone ? "var(--fg-muted)" : "var(--fg)", lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none", marginBottom: 5 }}>
                    {item.action}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, color: "var(--fg-subtle)", background: "var(--sl3)", padding: "1px 6px", borderRadius: 3, border: "1px solid var(--border)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="btn-ghost"
                  style={{ padding: "4px 6px", flexShrink: 0, marginTop: 2 }}
                >
                  {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--sl1)" }}>
                  {/* AI detail */}
                  {item.detail && (
                    <div style={{ padding: "12px 16px 0" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>狀況說明</div>
                      <p style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.7, margin: 0 }}>{item.detail}</p>
                    </div>
                  )}

                  {/* AI suggestion */}
                  {item.ai_suggestion && (
                    <div style={{ margin: "12px 16px 0", padding: "8px 12px", background: "#eef2ff", borderRadius: 7, borderLeft: "3px solid #6366f1", display: "flex", gap: 7, alignItems: "flex-start" }}>
                      <Bot size={13} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "#3730a3", margin: 0, lineHeight: 1.6 }}>{item.ai_suggestion}</p>
                    </div>
                  )}

                  {/* Source email + deadline */}
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <Link
                      href={`/app/emails/${item.source_email_id}`}
                      style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--fg-muted)", textDecoration: "none", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 5, background: "var(--bg)" }}
                    >
                      <Mail size={11} />
                      <span style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.source_subject}</span>
                      <span style={{ color: "var(--fg-subtle)", flexShrink: 0 }}>→</span>
                    </Link>
                    <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                      信件日期：{new Date(item.source_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
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
  );
}

"use client";

import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import {
  MOCK_DEADLINES,
  DEADLINE_TYPE_LABELS,
  type DeadlineItem,
} from "@/lib/mock-cases";

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function urgencyLevel(days: number): "overdue" | "critical" | "warning" | "normal" {
  if (days < 0)   return "overdue";
  if (days <= 7)  return "critical";
  if (days <= 30) return "warning";
  return "normal";
}

const URGENCY_STYLES = {
  overdue:  { fg: "#dc2626", bg: "#fef2f2",  border: "#fecaca",  labelFg: "#991b1b", label: "逾期" },
  critical: { fg: "#dc2626", bg: "#fff7ed",  border: "#fed7aa",  labelFg: "#9a3412", label: "緊急" },
  warning:  { fg: "#d97706", bg: "#fffbeb",  border: "#fde68a",  labelFg: "#92400e", label: "注意" },
  normal:   { fg: "#6b7280", bg: "var(--bg)", border: "transparent", labelFg: "#6b7280", label: "" },
};

const DEADLINE_TYPE_COLORS: Record<string, { fg: string; bg: string }> = {
  oa_response:    { fg: "#92400e", bg: "#fffbeb" },
  annuity:        { fg: "#1d4ed8", bg: "#eff6ff" },
  filing:         { fg: "#0e7490", bg: "#ecfeff" },
  grant_deadline: { fg: "#065f46", bg: "#ecfdf5" },
  renewal:        { fg: "#7c3aed", bg: "#f5f3ff" },
  appeal:         { fg: "#9a3412", bg: "#fff7ed" },
  other:          { fg: "#6b7280", bg: "#f9fafb" },
};

function DeadlineRow({ item, idx, total }: { item: DeadlineItem; idx: number; total: number }) {
  const days   = daysUntil(item.due_date);
  const level  = urgencyLevel(days);
  const urg    = URGENCY_STYLES[level];
  const tc     = DEADLINE_TYPE_COLORS[item.type] ?? DEADLINE_TYPE_COLORS.other;
  const isLast = idx === total - 1;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "140px 64px 1fr 100px 110px 90px 80px",
      padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
      borderLeft: `3px solid ${level === "normal" ? "transparent" : urg.fg}`,
      background: level === "normal" ? "var(--bg)" : urg.bg,
      alignItems: "center", gap: 10,
    }}>
      {/* Case number */}
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--fg)" }}>
        {item.case_number}
      </div>

      {/* Type badge */}
      <div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
          color: tc.fg, background: tc.bg,
        }}>
          {DEADLINE_TYPE_LABELS[item.type]}
        </span>
      </div>

      {/* Description */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.description}
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.client_name} — {item.case_title}
        </div>
      </div>

      {/* Client */}
      <div style={{ fontSize: 11, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.assignee_name}
      </div>

      {/* Due date */}
      <div>
        <div style={{ fontSize: 12, color: urg.fg, fontWeight: level !== "normal" ? 600 : 400 }}>
          {new Date(item.due_date).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit", year: "numeric" })}
        </div>
      </div>

      {/* Days counter */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {level !== "normal" && <Clock size={11} color={urg.fg} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: urg.fg }}>
          {days < 0 ? `逾期 ${Math.abs(days)} 天` : days === 0 ? "今天" : `${days} 天`}
        </span>
      </div>

      {/* Urgency badge */}
      <div>
        {level !== "normal" ? (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
            color: urg.labelFg, background: urg.bg, border: `1px solid ${urg.border}`,
          }}>
            {urg.label}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>—</span>
        )}
      </div>
    </div>
  );
}

export default function DeadlinesPage() {
  const [typeFilter, setType]       = useState("");
  const [assigneeFilter, setAssignee] = useState("");

  const sorted = [...MOCK_DEADLINES]
    .filter(d => d.status !== "completed")
    .filter(d => !typeFilter    || d.type          === typeFilter)
    .filter(d => !assigneeFilter || d.assignee_name === assigneeFilter)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const overdue  = sorted.filter(d => daysUntil(d.due_date) < 0).length;
  const critical = sorted.filter(d => { const x = daysUntil(d.due_date); return x >= 0 && x <= 7; }).length;
  const warning  = sorted.filter(d => { const x = daysUntil(d.due_date); return x > 7 && x <= 30; }).length;

  const assignees = Array.from(new Set(MOCK_DEADLINES.map(d => d.assignee_name)));

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Alert strip */}
      {(overdue > 0 || critical > 0) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 16px", marginBottom: 20,
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
        }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
            {overdue > 0 && `${overdue} 個期限已逾期`}
            {overdue > 0 && critical > 0 && " · "}
            {critical > 0 && `${critical} 個 7 天內到期`}
          </span>
          <span style={{ fontSize: 12, color: "#b91c1c", marginLeft: 4 }}>請立即處理</span>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg)" }}>
        {[
          { label: "已逾期",  value: overdue,       color: "#dc2626", bg: overdue  > 0 ? "#fef2f2" : "transparent" },
          { label: "7 天內",  value: critical,      color: "#d97706", bg: critical > 0 ? "#fffbeb" : "transparent" },
          { label: "30 天內", value: warning,       color: "#d97706", bg: "transparent" },
          { label: "全部待辦", value: sorted.length, color: "var(--fg)", bg: "transparent" },
        ].map(({ label, value, color, bg }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            background: bg,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <DeadlineFilterSelect
          value={typeFilter}
          onChange={setType}
          options={[
            { value: "", label: "所有類型" },
            { value: "oa_response",    label: "OA 答辯" },
            { value: "annuity",        label: "年費" },
            { value: "filing",         label: "申請期限" },
            { value: "grant_deadline", label: "領證期限" },
            { value: "renewal",        label: "續展" },
          ]}
        />
        <DeadlineFilterSelect
          value={assigneeFilter}
          onChange={setAssignee}
          options={[
            { value: "", label: "所有承辦人" },
            ...assignees.map(a => ({ value: a, label: a })),
          ]}
        />
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Column header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "140px 64px 1fr 100px 110px 90px 80px",
          padding: "7px 16px", gap: 10,
          background: "var(--sl2)", borderBottom: "1px solid var(--border)",
          fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)",
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <div>案號</div>
          <div>類型</div>
          <div>說明</div>
          <div>承辦人</div>
          <div>截止日</div>
          <div>剩餘時間</div>
          <div>緊急度</div>
        </div>

        {sorted.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <CheckCircle2 size={24} color="#16a34a" style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13, color: "var(--fg-subtle)" }}>目前無待處理期限</div>
          </div>
        ) : (
          sorted.map((item, i) => (
            <DeadlineRow key={item.id} item={item} idx={i} total={sorted.length} />
          ))
        )}
      </div>
    </div>
  );
}

function DeadlineFilterSelect({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", border: "1px solid var(--border)", borderRadius: 6,
          padding: "0 28px 0 10px", height: 32, fontSize: 12,
          background: "var(--bg)", color: "var(--fg)", cursor: "pointer",
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--fg-subtle)" }} />
    </div>
  );
}

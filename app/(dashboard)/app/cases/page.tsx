"use client";

import { useState } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import {
  MOCK_CASES,
  STATUS_LABELS, STATUS_COLORS,
  TYPE_LABELS, JURISDICTION_LABELS,
  type PatentCaseType, type Jurisdiction, type CaseStatus,
} from "@/lib/mock-cases";

const JURISDICTION_FLAGS: Record<string, string> = {
  TW: "🇹🇼", US: "🇺🇸", CN: "🇨🇳", JP: "🇯🇵",
  EP: "🇪🇺", KR: "🇰🇷", DE: "🇩🇪", GB: "🇬🇧",
};

function StatusBadge({ status }: { status: CaseStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600,
      padding: "2px 7px", borderRadius: 4,
      color: c.fg, background: c.bg, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: PatentCaseType }) {
  const colors: Record<PatentCaseType, { fg: string; bg: string }> = {
    invention:     { fg: "#1d4ed8", bg: "#eff6ff" },
    utility_model: { fg: "#0e7490", bg: "#ecfeff" },
    design:        { fg: "#7c3aed", bg: "#f5f3ff" },
    trademark:     { fg: "#9a3412", bg: "#fff7ed" },
    copyright:     { fg: "#6b7280", bg: "#f9fafb" },
  };
  const c = colors[type];
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 600,
      padding: "1px 6px", borderRadius: 3,
      color: c.fg, background: c.bg,
    }}>
      {TYPE_LABELS[type]}
    </span>
  );
}

function daysUntil(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function CasesPage() {
  const [search, setSearch]     = useState("");
  const [typeFilter, setType]   = useState<PatentCaseType | "">("");
  const [juriFilter, setJuri]   = useState<Jurisdiction | "">("");
  const [statusFilter, setStatus] = useState<CaseStatus | "">("");

  const filtered = MOCK_CASES.filter((c) => {
    if (typeFilter   && c.case_type    !== typeFilter)   return false;
    if (juriFilter   && c.jurisdiction !== juriFilter)   return false;
    if (statusFilter && c.status       !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.case_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        (c.app_number ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount  = MOCK_CASES.filter(c => !["granted","abandoned","rejected"].includes(c.status)).length;
  const grantedCount = MOCK_CASES.filter(c => c.status === "granted").length;
  const oaCount      = MOCK_CASES.filter(c => c.status === "oa_issued").length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200 }}>

      {/* Summary bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg)" }}>
        {[
          { label: "進行中",  value: activeCount,             color: "#1d4ed8" },
          { label: "OA 待答辯", value: oaCount,               color: "#92400e" },
          { label: "已獲證",  value: grantedCount,            color: "#166534" },
          { label: "總案件",  value: MOCK_CASES.length,       color: "var(--fg)" },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 11, color: "var(--fg-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 14,
        padding: "10px 12px", background: "var(--sl2)",
        border: "1px solid var(--border)", borderRadius: 8,
        alignItems: "center", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{
          flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 7,
          border: "1px solid var(--border)", borderRadius: 6,
          background: "var(--bg)", padding: "0 10px", height: 32,
        }}>
          <Search size={13} color="var(--fg-subtle)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋案號、名稱、客戶…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--fg)" }}
          />
        </div>

        {/* Type filter */}
        <FilterSelect
          value={typeFilter}
          onChange={(v) => setType(v as PatentCaseType | "")}
          options={[
            { value: "", label: "所有類型" },
            { value: "invention",     label: "發明專利" },
            { value: "utility_model", label: "新型專利" },
            { value: "design",        label: "設計專利" },
            { value: "trademark",     label: "商標" },
            { value: "copyright",     label: "著作權" },
          ]}
        />

        {/* Jurisdiction filter */}
        <FilterSelect
          value={juriFilter}
          onChange={(v) => setJuri(v as Jurisdiction | "")}
          options={[
            { value: "", label: "所有國家" },
            { value: "TW", label: "🇹🇼 台灣" },
            { value: "US", label: "🇺🇸 美國" },
            { value: "CN", label: "🇨🇳 中國" },
            { value: "JP", label: "🇯🇵 日本" },
            { value: "EP", label: "🇪🇺 歐洲" },
            { value: "KR", label: "🇰🇷 韓國" },
          ]}
        />

        {/* Status filter */}
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatus(v as CaseStatus | "")}
          options={[
            { value: "", label: "所有狀態" },
            { value: "oa_issued",         label: "OA 發出" },
            { value: "under_examination", label: "審查中" },
            { value: "granted",           label: "已獲證" },
            { value: "allowed",           label: "核准中" },
            { value: "filed",             label: "已申請" },
            { value: "abandoned",         label: "已放棄" },
          ]}
        />

        <span style={{ fontSize: 12, color: "var(--fg-subtle)", marginLeft: "auto" }}>{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 100px 90px 80px 130px 120px 100px",
          padding: "7px 16px",
          background: "var(--sl2)", borderBottom: "1px solid var(--border)",
          fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)",
          letterSpacing: "0.04em", textTransform: "uppercase", gap: 10,
        }}>
          <div>案號</div>
          <div>案件名稱</div>
          <div>客戶</div>
          <div>類型</div>
          <div>國家</div>
          <div>狀態</div>
          <div>下一截止</div>
          <div>承辦人</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-subtle)", fontSize: 13 }}>
            沒有符合條件的案件
          </div>
        ) : (
          filtered.map((c, i) => {
            const days = daysUntil(c.next_deadline);
            const deadlineColor = days === null ? "var(--fg-subtle)" : days < 0 ? "#dc2626" : days <= 14 ? "#dc2626" : days <= 30 ? "#d97706" : "var(--fg-muted)";
            return (
              <div key={c.id} className="table-row" style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 100px 90px 80px 130px 120px 100px",
                padding: "11px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center", gap: 10,
                background: "var(--bg)",
              }}>
                {/* Case number */}
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--fg)", letterSpacing: 0.3 }}>
                  {c.case_number}
                </div>

                {/* Title */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.title}
                  </div>
                  {c.app_number && (
                    <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>
                      {c.app_number}
                    </div>
                  )}
                </div>

                {/* Client */}
                <div style={{ fontSize: 12, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.client_name}
                </div>

                {/* Type */}
                <div><TypeBadge type={c.case_type} /></div>

                {/* Jurisdiction */}
                <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  <span style={{ marginRight: 4 }}>{JURISDICTION_FLAGS[c.jurisdiction] ?? ""}</span>
                  {c.jurisdiction}
                </div>

                {/* Status */}
                <div><StatusBadge status={c.status} /></div>

                {/* Deadline */}
                <div>
                  {c.next_deadline ? (
                    <div>
                      <div style={{ fontSize: 11, color: deadlineColor, fontWeight: days !== null && days <= 30 ? 600 : 400 }}>
                        {new Date(c.next_deadline).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                        {days !== null && days <= 30 && (
                          <span style={{ marginLeft: 4, fontSize: 10 }}>
                            ({days < 0 ? `逾期${Math.abs(days)}d` : `${days}d`})
                          </span>
                        )}
                      </div>
                      {c.next_action && (
                        <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.next_action}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "var(--fg-subtle)", fontSize: 12 }}>—</span>
                  )}
                </div>

                {/* Assignee */}
                <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  {c.assignee_name}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterSelect({
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

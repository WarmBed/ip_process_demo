"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, FileText, DollarSign, CheckCircle2 } from "lucide-react";
import { MOCK_CASES, MOCK_STAFF, type CaseStatus } from "@/lib/mock-cases";
import { Button, Badge } from "@radix-ui/themes";

// ── Mock monthly data ──────────────────────────────────────────

interface MonthlyStats {
  month: string;           // "2026-01"
  new_cases:       number;
  closed_cases:    number;
  oa_filed:        number;
  granted:         number;
  emails_processed: number;
  official_fees:   number; // NTD
  attorney_hours:  number;
}

const MONTHLY_DATA: MonthlyStats[] = [
  { month: "2025-09", new_cases: 3,  closed_cases: 1, oa_filed: 2, granted: 1, emails_processed: 214, official_fees: 42000,  attorney_hours: 68 },
  { month: "2025-10", new_cases: 4,  closed_cases: 2, oa_filed: 3, granted: 0, emails_processed: 241, official_fees: 58000,  attorney_hours: 74 },
  { month: "2025-11", new_cases: 2,  closed_cases: 1, oa_filed: 1, granted: 2, emails_processed: 197, official_fees: 31000,  attorney_hours: 55 },
  { month: "2025-12", new_cases: 5,  closed_cases: 3, oa_filed: 4, granted: 1, emails_processed: 188, official_fees: 76000,  attorney_hours: 82 },
  { month: "2026-01", new_cases: 3,  closed_cases: 2, oa_filed: 2, granted: 3, emails_processed: 203, official_fees: 53000,  attorney_hours: 61 },
  { month: "2026-02", new_cases: 4,  closed_cases: 1, oa_filed: 3, granted: 1, emails_processed: 175, official_fees: 45000,  attorney_hours: 58 },
  { month: "2026-03", new_cases: 2,  closed_cases: 2, oa_filed: 2, granted: 0, emails_processed: 162, official_fees: 28000,  attorney_hours: 41 },
];

function fmtMonth(iso: string) {
  const [y, m] = iso.split("-");
  return `${y} 年 ${parseInt(m)} 月`;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 80, height: 5, borderRadius: 3, background: "var(--gray-5)", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--gray-11)", minWidth: 20 }}>{value}</span>
    </div>
  );
}

// ── Case status distribution ───────────────────────────────────

const STATUS_GROUPS: { label: string; statuses: CaseStatus[]; color: string }[] = [
  { label: "進行中",  statuses: ["filed","under_examination","oa_issued","oa_responded"], color: "var(--green-9)" },
  { label: "核准/獲證", statuses: ["allowed","granted"],                                 color: "var(--green-11)" },
  { label: "駁回/放棄", statuses: ["rejected","abandoned"],                              color: "var(--gray-8)" },
  { label: "異議/申訴", statuses: ["opposed","appealing"],                               color: "var(--gray-11)" },
];

export default function ReportsPage() {
  const [monthIdx, setMonthIdx] = useState(MONTHLY_DATA.length - 1);
  const current = MONTHLY_DATA[monthIdx];
  const prev    = MONTHLY_DATA[monthIdx - 1];

  function delta(cur: number, pre?: number) {
    if (pre === undefined) return null;
    const d = cur - pre;
    return { value: Math.abs(d), up: d >= 0 };
  }

  // Case type distribution
  const byType: Record<string, number> = {};
  MOCK_CASES.forEach(c => { byType[c.case_type] = (byType[c.case_type] ?? 0) + 1; });
  const typeLabels: Record<string, string> = {
    invention: "發明", utility_model: "新型", design: "設計",
    trademark: "商標", copyright: "著作權",
  };
  const typeColors: Record<string, string> = {
    invention: "var(--green-9)", utility_model: "var(--green-7)", design: "var(--green-11)",
    trademark: "var(--gray-10)", copyright: "var(--gray-8)",
  };

  // Status distribution
  const byStatus: Record<string, number> = {};
  MOCK_CASES.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });

  // Jurisdiction distribution
  const byJuri: Record<string, number> = {};
  MOCK_CASES.forEach(c => { byJuri[c.jurisdiction] = (byJuri[c.jurisdiction] ?? 0) + 1; });
  const juriLabels: Record<string, string> = {
    TW: "台灣", US: "美國", CN: "中國", JP: "日本",
    EP: "歐洲", KR: "韓國",
  };
  const juriColors: Record<string, string> = {
    TW: "var(--green-9)", US: "var(--gray-10)", CN: "var(--gray-8)", JP: "var(--green-11)", EP: "var(--green-7)", KR: "var(--gray-9)",
  };

  const maxJuri = Math.max(...Object.values(byJuri));

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Month picker */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Button
          variant="ghost"
          color="gray"
          size="1"
          onClick={() => setMonthIdx(i => Math.max(0, i - 1))}
          disabled={monthIdx === 0}
          style={{ cursor: monthIdx === 0 ? "default" : "pointer" }}
        >
          <ChevronLeft size={15} />
        </Button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--gray-12)", minWidth: 140, textAlign: "center" }}>
          {fmtMonth(current.month)}
        </span>
        <Button
          variant="ghost"
          color="gray"
          size="1"
          onClick={() => setMonthIdx(i => Math.min(MONTHLY_DATA.length - 1, i + 1))}
          disabled={monthIdx === MONTHLY_DATA.length - 1}
          style={{ cursor: monthIdx === MONTHLY_DATA.length - 1 ? "default" : "pointer" }}
        >
          <ChevronRight size={15} />
        </Button>
        {monthIdx === MONTHLY_DATA.length - 1 && (
          <Badge variant="soft" color="green" size="1">最新</Badge>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          {
            icon: <FileText size={14} color="var(--green-9)" />,
            label: "新增案件", value: current.new_cases,
            d: delta(current.new_cases, prev?.new_cases),
            accent: "var(--green-9)",
          },
          {
            icon: <CheckCircle2 size={14} color="var(--green-11)" />,
            label: "獲證 / 結案", value: current.granted,
            d: delta(current.granted, prev?.granted),
            accent: "var(--green-11)",
          },
          {
            icon: <DollarSign size={14} color="var(--gray-10)" />,
            label: "官費支出",
            value: `NT$ ${(current.official_fees / 1000).toFixed(0)}K`,
            d: delta(current.official_fees, prev?.official_fees),
            accent: "var(--gray-11)",
            invertDelta: true,
          },
          {
            icon: <TrendingUp size={14} color="var(--green-7)" />,
            label: "律師工時",
            value: `${current.attorney_hours} hrs`,
            d: delta(current.attorney_hours, prev?.attorney_hours),
            accent: "var(--gray-11)",
          },
        ].map(({ icon, label, value, d, accent, invertDelta }) => (
          <div key={label} style={{
            padding: "16px 20px", border: "1px solid var(--gray-6)", borderRadius: 10,
            background: "var(--color-background)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: accent, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {value}
            </div>
            {d && (
              <div style={{ fontSize: 11, marginTop: 6, color: (d.up !== !!invertDelta) ? "var(--green-9)" : "var(--gray-10)" }}>
                {d.up ? "▲" : "▼"} {d.value} vs 上月
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trend table: recent 6 months */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)", display: "flex", alignItems: "center", gap: 6 }}>
          <TrendingUp size={13} color="var(--gray-11)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>近 6 個月趨勢</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--gray-2)" }}>
                {["月份","新案","答辯","獲證","信件","官費","工時"].map(h => (
                  <th key={h} style={{ padding: "7px 14px", textAlign: "left", color: "var(--gray-9)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--gray-6)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHLY_DATA.slice(-6).map((m, i) => {
                const isCurrent = m.month === current.month;
                return (
                  <tr key={m.month} style={{
                    background: isCurrent ? "var(--gray-3)" : i % 2 === 0 ? "var(--color-background)" : "var(--gray-2)",
                    borderBottom: "1px solid var(--gray-6)",
                  }}>
                    <td style={{ padding: "9px 14px", fontWeight: isCurrent ? 700 : 400, color: isCurrent ? "var(--gray-12)" : "var(--gray-11)", whiteSpace: "nowrap" }}>
                      {fmtMonth(m.month)}
                      {isCurrent && <span style={{ fontSize: 10, marginLeft: 5, color: "var(--green-9)" }}>▶</span>}
                    </td>
                    <td style={{ padding: "9px 14px", color: "var(--gray-12)" }}>{m.new_cases}</td>
                    <td style={{ padding: "9px 14px", color: "var(--gray-12)" }}>{m.oa_filed}</td>
                    <td style={{ padding: "9px 14px", color: m.granted > 0 ? "var(--green-9)" : "var(--gray-11)", fontWeight: m.granted > 0 ? 600 : 400 }}>{m.granted}</td>
                    <td style={{ padding: "9px 14px", color: "var(--gray-11)" }}>{m.emails_processed}</td>
                    <td style={{ padding: "9px 14px", color: "var(--gray-11)", fontFamily: "ui-monospace, monospace" }}>
                      {(m.official_fees / 1000).toFixed(0)}K
                    </td>
                    <td style={{ padding: "9px 14px", color: "var(--gray-11)" }}>{m.attorney_hours}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: case type dist + jurisdiction dist */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Case type distribution */}
        <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>案件類型分佈</span>
          </div>
          <div style={{ padding: "16px" }}>
            {Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => {
              const pct = Math.round((count / MOCK_CASES.length) * 100);
              return (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: 500 }}>{typeLabels[type] ?? type}</span>
                    <span style={{ fontSize: 11, color: "var(--gray-9)" }}>{count} 件 ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: typeColors[type] ?? "var(--gray-8)", borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jurisdiction distribution */}
        <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>申請國家分佈</span>
          </div>
          <div style={{ padding: "16px" }}>
            {Object.entries(byJuri).sort((a,b) => b[1]-a[1]).map(([j, count]) => (
              <div key={j} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--gray-12)", fontWeight: 500 }}>{juriLabels[j] ?? j}</span>
                  <span style={{ fontSize: 11, color: "var(--gray-9)" }}>{count} 件</span>
                </div>
                <MiniBar value={count} max={maxJuri} color={juriColors[j] ?? "var(--gray-8)"} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status distribution */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--gray-6)", background: "var(--gray-2)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>案件狀態總覽</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "16px", gap: 16 }}>
          {STATUS_GROUPS.map(({ label, statuses, color }) => {
            const count = statuses.reduce((s, st) => s + (byStatus[st] ?? 0), 0);
            const pct   = Math.round((count / MOCK_CASES.length) * 100);
            return (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{count}</div>
                <div style={{ fontSize: 12, color: "var(--gray-12)", marginTop: 3 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 2 }}>{pct}%</div>
                <div style={{ height: 4, borderRadius: 2, background: "var(--gray-4)", overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

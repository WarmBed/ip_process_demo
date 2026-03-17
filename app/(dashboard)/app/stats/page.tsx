"use client";

import { useEffect, useState } from "react";
import type { ApiResponse, BenefitsStat } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";

export default function StatsPage() {
  const [benefits, setBenefits] = useState<BenefitsStat[]>([]);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then((r) => r.json())
      .then((d: ApiResponse<typeof MOCK_STATS & { benefits: BenefitsStat[] }>) =>
        setBenefits(d.data.benefits)
      );
  }, []);

  const maxEmails = Math.max(...benefits.map((b) => b.emails_processed), 1);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        效益統計
      </h1>
      <p style={{ fontSize: 13, color: "var(--fg-subtle)", margin: "0 0 24px" }}>
        累計處理 {MOCK_STATS.total_processed} 封 · 省下 {MOCK_STATS.hours_saved.toFixed(1)} 小時 · API 成本 ${MOCK_STATS.api_cost_usd.toFixed(2)} USD
      </p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "累計處理信件", value: String(MOCK_STATS.total_processed), unit: "封" },
          { label: "累計省下工時", value: MOCK_STATS.hours_saved.toFixed(1), unit: "hr" },
          { label: "累計 API 成本", value: `$${MOCK_STATS.api_cost_usd.toFixed(2)}`, unit: "USD" },
        ].map((c) => (
          <div key={c.label} style={{
            padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 8,
          }}>
            <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.03em" }}>
              {c.value} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--fg-muted)" }}>{c.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--border)",
          background: "var(--sl2)", fontSize: 13, fontWeight: 600, color: "var(--fg)",
        }}>
          每日處理量
        </div>
        {benefits.map((b, i) => (
          <div key={b.date} style={{
            display: "grid", gridTemplateColumns: "70px 1fr 50px 80px 90px",
            alignItems: "center", gap: 14, padding: "10px 16px",
            borderBottom: i < benefits.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{b.date.slice(5)}</span>
            <div style={{ height: 8, background: "var(--sl4)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${Math.round((b.emails_processed / maxEmails) * 100)}%`,
                height: "100%", background: "var(--fg)", borderRadius: 4,
              }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--fg)", textAlign: "right" }}>{b.emails_processed} 封</span>
            <span style={{ fontSize: 12, color: "var(--fg-muted)", textAlign: "right" }}>{b.hours_saved.toFixed(1)} hr</span>
            <span style={{ fontSize: 12, color: "var(--fg-subtle)", textAlign: "right" }}>${b.api_cost_usd.toFixed(3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

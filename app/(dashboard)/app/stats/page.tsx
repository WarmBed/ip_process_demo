"use client";

import { useEffect, useState } from "react";
import type { ApiResponse, BenefitsStat } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";
import { Separator } from "@radix-ui/themes";

export default function StatsPage() {
  const [benefits, setBenefits] = useState<BenefitsStat[]>([]);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then((r) => r.json())
      .then((d: ApiResponse<typeof MOCK_STATS & { benefits: BenefitsStat[] }>) =>
        setBenefits(d.data.benefits)
      )
      .catch(() => {});
  }, []);

  const maxEmails = Math.max(...benefits.map((b) => b.emails_processed), 1);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>

      {/* Summary cards */}
      <div style={{ display: "flex", border: "1px solid var(--gray-6)", borderRadius: 10, marginBottom: 28, overflow: "hidden", background: "var(--color-background)" }}>
        {[
          { label: "累計處理信件", value: String(MOCK_STATS.total_processed), unit: "封" },
          { label: "本週處理",     value: String(MOCK_STATS.this_week),        unit: "封" },
          { label: "分類準確率",   value: `${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%`, unit: "" },
        ].map((c, i, arr) => (
          <div key={c.label} style={{
            flex: 1, padding: "16px 24px",
            borderRight: i < arr.length - 1 ? "1px solid var(--gray-6)" : "none",
          }}>
            <div style={{ fontSize: 12, color: "var(--gray-9)", fontWeight: 500, marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gray-12)", letterSpacing: "-0.02em" }}>
              {c.value}{c.unit && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--gray-11)", marginLeft: 3 }}>{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid var(--gray-6)",
          background: "var(--gray-2)", fontSize: 13, fontWeight: 600, color: "var(--gray-12)",
        }}>
          每日處理量
        </div>
        {benefits.map((b, i) => (
          <div key={b.date} style={{
            display: "grid", gridTemplateColumns: "70px 1fr 60px",
            alignItems: "center", gap: 14, padding: "10px 16px",
            borderBottom: i < benefits.length - 1 ? "1px solid var(--gray-6)" : "none",
          }}>
            <span style={{ fontSize: 12, color: "var(--gray-11)" }}>{b.date.slice(5)}</span>
            <div style={{ height: 8, background: "var(--gray-4)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${Math.round((b.emails_processed / maxEmails) * 100)}%`,
                height: "100%", background: "var(--green-9)", borderRadius: 4,
              }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--gray-12)", textAlign: "right" }}>{b.emails_processed} 封</span>
          </div>
        ))}
      </div>
    </div>
  );
}

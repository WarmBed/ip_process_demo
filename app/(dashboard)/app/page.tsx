"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Clock, DollarSign, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import type { ApiResponse, EmailListItem, BenefitsStat } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ label, value, sub, icon, color = "var(--fg)" }: StatCardProps) {
  return (
    <div style={{
      padding: "18px 20px",
      border: "1px solid var(--border)", borderRadius: 8,
      background: "var(--bg)",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "var(--fg-subtle)", fontWeight: 500 }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.03em" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AppOverviewPage() {
  const [recentEmails, setRecentEmails] = useState<EmailListItem[]>([]);
  const [benefits, setBenefits] = useState<BenefitsStat[]>([]);

  useEffect(() => {
    fetch("/api/v1/emails?limit=5")
      .then((r) => r.json())
      .then((d: ApiResponse<EmailListItem[]>) => setRecentEmails(d.data));

    fetch("/api/v1/stats")
      .then((r) => r.json())
      .then((d: ApiResponse<typeof MOCK_STATS & { benefits: BenefitsStat[] }>) =>
        setBenefits(d.data.benefits)
      );
  }, []);

  const pending = recentEmails.filter((e) => e.status === "pending").length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 960 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
          總覽
        </h1>
        <p style={{ fontSize: 13, color: "var(--fg-subtle)", margin: "3px 0 0" }}>
          IP Winner · 今日 {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        <StatCard
          label="累計處理信件"
          value={String(MOCK_STATS.total_processed)}
          sub="本週 +28 封"
          icon={<Mail size={16} />}
        />
        <StatCard
          label="省下工時"
          value={`${MOCK_STATS.hours_saved.toFixed(1)} hr`}
          sub="每封約 5.5 分鐘"
          icon={<Clock size={16} />}
          color="var(--blue)"
        />
        <StatCard
          label="分類準確率"
          value={`${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%`}
          sub="收發碼 100%"
          icon={<TrendingUp size={16} />}
          color="var(--green)"
        />
        <StatCard
          label="API 成本"
          value={`$${MOCK_STATS.api_cost_usd.toFixed(2)}`}
          sub="USD，Gemini Flash"
          icon={<DollarSign size={16} />}
          color="var(--fg-muted)"
        />
      </div>

      {/* Two columns: recent emails + mini chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

        {/* Recent emails */}
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "var(--sl2)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>最近信件</span>
            <Link href="/app/emails" style={{ fontSize: 12, color: "var(--fg-muted)" }}>查看全部 →</Link>
          </div>
          {recentEmails.map((e, i) => (
            <Link key={e.id} href={`/app/emails/${e.id}`} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              borderBottom: i < recentEmails.length - 1 ? "1px solid var(--border)" : "none",
              textDecoration: "none", transition: "background 0.1s",
            }}
              className="table-row"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.subject}
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>
                  {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {e.status === "pending" && <AlertCircle size={14} color="var(--yellow)" />}
              {e.status === "confirmed" && <CheckCircle size={14} color="var(--green)" />}
            </Link>
          ))}
        </div>

        {/* Side panel: alerts + stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Pending alert */}
          {pending > 0 && (
            <div style={{
              padding: "14px 16px", borderRadius: 8,
              background: "var(--yellow-bg)", border: "1px solid var(--yellow-border)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#854d0e", marginBottom: 4 }}>
                {pending} 封待確認
              </div>
              <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                AI 自動辨識的信件需要人工確認
              </div>
              <Link href="/app/emails?status=pending" className="btn-outline" style={{ fontSize: 12, height: 28 }}>
                前往確認
              </Link>
            </div>
          )}

          {/* Last 5 days */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid var(--border)",
              background: "var(--sl2)", fontSize: 12, fontWeight: 600, color: "var(--fg)",
            }}>
              近 5 日處理量
            </div>
            {benefits.slice(-5).map((b) => {
              const maxVal = Math.max(...benefits.map((x) => x.emails_processed));
              const pct = Math.round((b.emails_processed / maxVal) * 100);
              return (
                <div key={b.date} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 14px", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 11, color: "var(--fg-subtle)", minWidth: 32 }}>
                    {b.date.slice(5)}
                  </span>
                  <div style={{ flex: 1, height: 6, background: "var(--sl4)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--fg)", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)", minWidth: 20, textAlign: "right" }}>
                    {b.emails_processed}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

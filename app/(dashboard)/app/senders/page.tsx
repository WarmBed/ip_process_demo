"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Sender, ApiResponse } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  C: "客戶",
  A: "代理人",
  G: "政府",
  S: "垃圾",
  X: "未知",
};

const ROLE_COLORS: Record<string, string> = {
  C: "#166534",
  A: "#1e40af",
  G: "#0e7490",
  S: "#6b7280",
  X: "#92400e",
};

const SOURCE_LABELS: Record<string, string> = {
  manual:      "手動",
  ai_inferred: "AI 推斷",
  feedback:    "回授學習",
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLORS[role] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: color + "15", color, border: `1px solid ${color}30`,
    }}>
      {role} · {ROLE_LABELS[role] ?? role}
    </span>
  );
}

export default function SendersPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/senders")
      .then((r) => r.json())
      .then((d: ApiResponse<Sender[]>) => {
        setSenders(d.data);
        setLoading(false);
      });
  }, []);

  const filtered = senders.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.key.toLowerCase().includes(q) ||
      s.display_name.toLowerCase().includes(q) ||
      s.notes.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>
            Sender 名單
          </h1>
          <p style={{ fontSize: 13, color: "var(--fg-subtle)", margin: "3px 0 0" }}>
            共 {senders.length} 筆 · 自動學習寄件者角色
          </p>
        </div>
        <button className="btn-primary" style={{ gap: 6 }}>
          <Plus size={13} />
          新增
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        border: "1px solid var(--border)", borderRadius: 7,
        background: "var(--bg)", padding: "0 12px", height: 36,
        marginBottom: 16, maxWidth: 360,
      }}>
        <Search size={13} color="var(--fg-subtle)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋 domain、公司名..."
          style={{
            flex: 1, border: "none", outline: "none",
            fontSize: 13, background: "transparent", color: "var(--fg)",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "220px 100px 1fr 100px 110px",
          padding: "8px 16px",
          background: "var(--sl2)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)",
          letterSpacing: "0.04em", textTransform: "uppercase", gap: 12,
        }}>
          <div>Domain / Email</div>
          <div>角色</div>
          <div>公司名 / 備註</div>
          <div>來源</div>
          <div>更新時間</div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-subtle)", fontSize: 13 }}>
            載入中...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-subtle)", fontSize: 13 }}>
            沒有找到符合條件的 Sender
          </div>
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.id}
              className="table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "220px 100px 1fr 100px 110px",
                padding: "10px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center", gap: 12,
                background: "var(--bg)",
              }}
            >
              {/* Key */}
              <div style={{
                fontFamily: "ui-monospace, monospace", fontSize: 12,
                color: "var(--fg)", fontWeight: 500,
              }}>
                {s.key}
              </div>

              {/* Role */}
              <div><RoleBadge role={s.role} /></div>

              {/* Name + notes */}
              <div>
                <div style={{ fontSize: 13, color: "var(--fg)", fontWeight: 450 }}>{s.display_name}</div>
                {s.notes && (
                  <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 2 }}>{s.notes}</div>
                )}
              </div>

              {/* Source */}
              <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                {SOURCE_LABELS[s.source] ?? s.source}
              </div>

              {/* Updated at */}
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>
                {new Date(s.updated_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

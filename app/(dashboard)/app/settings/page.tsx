"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "accounts", label: "信箱帳號" },
  { id: "storage",  label: "儲存空間" },
  { id: "schedule", label: "排程" },
  { id: "general",  label: "一般設定" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("accounts");
  const router = useRouter();

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: "0 0 20px", letterSpacing: "-0.02em" }}>
        設定
      </h1>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        padding: 4, background: "var(--sl3)", borderRadius: 8,
        width: "fit-content",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-link${tab === t.id ? " active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {tab === "accounts" && (
          <div style={{ padding: "24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>連接信箱</div>
            <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 20 }}>
              授權 Gmail 或 Outlook，系統會定時撈取新信件並自動分類。
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-outline" style={{ gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                連接 Gmail
              </button>
              <button className="btn-outline" style={{ gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0078d4"><path d="M0 0h11.5v11.5H0zm12.5 0H24v11.5H12.5zM0 12.5h11.5V24H0zm12.5 0H24V24H12.5z"/></svg>
                連接 Outlook
              </button>
            </div>
            <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--sl2)", borderRadius: 7, border: "1px solid var(--border)", fontSize: 12, color: "var(--fg-subtle)" }}>
              🚧 OAuth 流程將在 Phase 2 實作
            </div>
          </div>
        )}

        {tab === "storage" && (
          <div style={{ padding: "24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>附件儲存空間</div>
            <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 20 }}>
              選擇附件要存到哪裡。系統只記錄位置，不佔用 MailFlow 自身儲存空間。
            </p>
            <button className="btn-primary" onClick={() => router.push("/app/settings/storage")}>
              管理儲存空間 →
            </button>
          </div>
        )}

        {tab === "schedule" && (
          <div style={{ padding: "24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>撈信排程</div>
            <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 20 }}>
              設定自動撈信的頻率（per 信箱帳號）。
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>每</span>
              <input
                type="number"
                defaultValue={60}
                min={15}
                max={1440}
                style={{
                  width: 72, padding: "6px 10px", border: "1px solid var(--border)",
                  borderRadius: 6, fontSize: 13, color: "var(--fg)", background: "var(--bg)",
                }}
              />
              <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>分鐘撈一次（15–1440）</span>
            </div>
            <button className="btn-primary" style={{ marginTop: 16 }}>儲存</button>
          </div>
        )}

        {tab === "general" && (
          <div style={{ padding: "24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>一般設定</div>
            <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 20 }}>
              案號格式、自有 domain、LLM 模型設定。
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "自有 Domain", value: "ipwinner.com, ipwinner.com.tw" },
                { label: "LLM 模型", value: "gemini-3-flash-preview" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-subtle)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                  <input
                    defaultValue={value}
                    style={{
                      width: "100%", padding: "7px 12px",
                      border: "1px solid var(--border)", borderRadius: 6,
                      fontSize: 13, color: "var(--fg)", background: "var(--bg)",
                    }}
                  />
                </div>
              ))}
            </div>
            <button className="btn-primary" style={{ marginTop: 20 }}>儲存</button>
          </div>
        )}
      </div>
    </div>
  );
}

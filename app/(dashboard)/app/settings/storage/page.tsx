"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, ExternalLink, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";

type ConnectionStatus = "connected" | "disconnected" | "error";

interface StorageProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: ConnectionStatus;
  account?: string;
  folder?: string;
  usedBytes?: number;
  description: string;
}

const GB_DRIVE_ICON = (
  <svg width="22" height="22" viewBox="0 0 87.3 78" fill="none">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25L29.9 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.35z" fill="#ea4335"/>
    <path d="M43.65 25L57.4 0H29.9z" fill="#00832d"/>
    <path d="M59.8 53H87.3L73.55 28.5 57.4 0 43.65 25 59.8 53z" fill="#2684fc"/>
    <path d="M27.5 53L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.8 53z" fill="#ffba00"/>
  </svg>
);

const ONEDRIVE_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M10.5 18.5H6a4 4 0 01-.5-7.97 5.5 5.5 0 0110.76-1.4A3.5 3.5 0 0118 15.5a3.5 3.5 0 01-3.5 3H10.5z" fill="#0078d4"/>
    <path d="M14 18.5H20a2.5 2.5 0 000-5h-.1a4 4 0 00-7.4-2.9" fill="#28a8e8"/>
  </svg>
);

const DROPBOX_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#0061ff">
    <path d="M12 2L6 6.5l6 4.5-6 4.5 6 4.5 6-4.5-6-4.5 6-4.5L12 2zM6 17.5L12 22l6-4.5-6-4.5-6 4.5z"/>
  </svg>
);

const INITIAL_PROVIDERS: StorageProvider[] = [
  {
    id: "google_drive",
    name: "Google Drive",
    icon: GB_DRIVE_ICON,
    status: "connected",
    account: "admin@ipwinner.com",
    folder: "Email自動整理v2",
    usedBytes: 2.3 * 1024 * 1024 * 1024,
    description: "將 EML 和附件存入 Google Drive 指定資料夾，依案號自動建立子資料夾。",
  },
  {
    id: "onedrive",
    name: "OneDrive / SharePoint",
    icon: ONEDRIVE_ICON,
    status: "disconnected",
    description: "連接 Microsoft OneDrive 或 SharePoint，適合 Microsoft 365 用戶。",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    icon: DROPBOX_ICON,
    status: "disconnected",
    description: "使用 Dropbox 儲存附件，支援 Business 和 Personal 帳號。",
  },
];

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === "connected") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "2px 8px", borderRadius: 5 }}>
      <CheckCircle size={11} /> 已連接
    </span>
  );
  if (status === "error") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 5 }}>
      <AlertCircle size={11} /> 連接錯誤
    </span>
  );
  return (
    <span style={{ fontSize: 12, color: "var(--fg-subtle)", background: "var(--sl3)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: 5 }}>
      未連接
    </span>
  );
}

export default function StoragePage() {
  const [providers, setProviders] = useState<StorageProvider[]>(INITIAL_PROVIDERS);

  const disconnect = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: "disconnected", account: undefined, folder: undefined } : p)
    );
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-subtle)", marginBottom: 16 }}>
        <Link href="/app/settings" style={{ color: "var(--fg-muted)" }}>設定</Link>
        <span>›</span>
        <span style={{ color: "var(--fg)" }}>儲存空間</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {providers.map((p) => (
          <div key={p.id} style={{
            border: "1px solid var(--border)", borderRadius: 10,
            background: "var(--bg)", overflow: "hidden",
          }}>
            {/* Provider header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: p.status === "connected" ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--sl2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>{p.description}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusBadge status={p.status} />
                {p.status === "connected" ? (
                  <button
                    className="btn-ghost"
                    onClick={() => disconnect(p.id)}
                    style={{ color: "var(--fg-subtle)", padding: "4px 8px" }}
                    title="中斷連接"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button className="btn-primary" style={{ height: 30, fontSize: 12 }}>
                    連接
                  </button>
                )}
              </div>
            </div>

            {/* Connected detail */}
            {p.status === "connected" && (
              <div style={{ padding: "14px 20px", background: "var(--sl1)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {/* Account */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                      帳號
                    </div>
                    <div style={{ fontSize: 13, color: "var(--fg)" }}>{p.account}</div>
                  </div>

                  {/* Folder */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                      根目錄
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FolderOpen size={13} color="var(--fg-muted)" />
                      <span style={{ fontSize: 13, color: "var(--fg)" }}>{p.folder}</span>
                      <ExternalLink size={11} color="var(--fg-subtle)" style={{ cursor: "pointer" }} />
                    </div>
                  </div>

                  {/* Usage */}
                  {p.usedBytes && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                        已用空間
                      </div>
                      <div style={{ fontSize: 13, color: "var(--fg)" }}>{formatBytes(p.usedBytes)}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button className="btn-outline" style={{ height: 28, fontSize: 12, gap: 5 }}>
                    <FolderOpen size={12} />
                    變更資料夾
                  </button>
                  <button className="btn-outline" style={{ height: 28, fontSize: 12, gap: 5 }}>
                    <RefreshCw size={12} />
                    重新授權
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{
        marginTop: 20, padding: "12px 16px", borderRadius: 7,
        background: "var(--sl2)", border: "1px solid var(--border)",
        fontSize: 12, color: "var(--fg-subtle)", lineHeight: 1.6,
      }}>
        💡 可同時連接多個 storage。每個信箱帳號可選擇要存到哪個 storage，預設使用第一個已連接的服務。
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, ExternalLink, FolderOpen, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button, Badge, Text, Box, Flex, IconButton, Separator } from "@radix-ui/themes";

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
    <Badge variant="soft" color="green" size="1">
      <CheckCircle size={11} /> 已連接
    </Badge>
  );
  if (status === "error") return (
    <Badge variant="soft" color="red" size="1">
      <AlertCircle size={11} /> 連接錯誤
    </Badge>
  );
  return (
    <Badge variant="soft" color="gray" size="1">
      未連接
    </Badge>
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
      <Flex align="center" gap="2" mb="4" style={{ fontSize: 12, color: "var(--gray-8)" }}>
        <Link href="/app/settings" style={{ color: "var(--gray-9)" }}>設定</Link>
        <span style={{ color: "var(--gray-7)" }}>›</span>
        <Text size="1" style={{ color: "var(--gray-12)" }}>儲存空間</Text>
      </Flex>

      <Flex direction="column" gap="3">
        {providers.map((p) => (
          <Box key={p.id} style={{
            border: "1px solid var(--gray-6)", borderRadius: 10,
            background: "var(--color-background)", overflow: "hidden",
          }}>
            {/* Provider header */}
            <Flex align="center" justify="between" style={{
              padding: "16px 20px",
              borderBottom: p.status === "connected" ? "1px solid var(--gray-6)" : "none",
            }}>
              <Flex align="center" gap="3">
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  border: "1px solid var(--gray-6)", background: "var(--gray-3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {p.icon}
                </div>
                <div>
                  <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>{p.name}</Text>
                  <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 2 }}>{p.description}</Text>
                </div>
              </Flex>

              <Flex align="center" gap="3">
                <StatusBadge status={p.status} />
                {p.status === "connected" ? (
                  <IconButton
                    variant="ghost"
                    size="1"
                    onClick={() => disconnect(p.id)}
                    title="中斷連接"
                    color="gray"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                ) : (
                  <Button variant="solid" color="green" size="1">
                    連接
                  </Button>
                )}
              </Flex>
            </Flex>

            {/* Connected detail */}
            {p.status === "connected" && (
              <Box style={{ padding: "14px 20px", background: "var(--gray-2)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {/* Account */}
                  <div>
                    <Text size="1" weight="bold" style={{ color: "var(--gray-8)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                      帳號
                    </Text>
                    <Text size="2" style={{ color: "var(--gray-12)" }}>{p.account}</Text>
                  </div>

                  {/* Folder */}
                  <div>
                    <Text size="1" weight="bold" style={{ color: "var(--gray-8)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                      根目錄
                    </Text>
                    <Flex align="center" gap="2">
                      <FolderOpen size={13} color="var(--gray-9)" />
                      <Text size="2" style={{ color: "var(--gray-12)" }}>{p.folder}</Text>
                      <ExternalLink size={11} color="var(--gray-8)" style={{ cursor: "pointer" }} />
                    </Flex>
                  </div>

                  {/* Usage */}
                  {p.usedBytes && (
                    <div>
                      <Text size="1" weight="bold" style={{ color: "var(--gray-8)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                        已用空間
                      </Text>
                      <Text size="2" style={{ color: "var(--gray-12)" }}>{formatBytes(p.usedBytes)}</Text>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <Flex gap="2" mt="3">
                  <Button variant="outline" size="1" style={{ gap: 5 }}>
                    <FolderOpen size={12} />
                    變更資料夾
                  </Button>
                  <Button variant="outline" size="1" style={{ gap: 5 }}>
                    <RefreshCw size={12} />
                    重新授權
                  </Button>
                </Flex>
              </Box>
            )}
          </Box>
        ))}
      </Flex>

      {/* Note */}
      <Box mt="4" p="3" style={{
        borderRadius: 7,
        background: "var(--gray-3)", border: "1px solid var(--gray-6)",
        fontSize: 12, color: "var(--gray-9)", lineHeight: 1.6,
      }}>
        可同時連接多個 storage。每個信箱帳號可選擇要存到哪個 storage，預設使用第一個已連接的服務。
      </Box>
    </div>
  );
}

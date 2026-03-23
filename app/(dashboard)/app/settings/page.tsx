"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, Button, Badge, TextField, Switch, Separator, Text, Box, Flex, Heading } from "@radix-ui/themes";

const TABS = [
  { id: "accounts",  label: "信箱帳號" },
  { id: "storage",   label: "儲存空間" },
  { id: "schedule",  label: "排程" },
  { id: "tipo",      label: "TIPO 連攜" },
  { id: "templates", label: "信件模板" },
  { id: "general",   label: "一般設定" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("accounts");
  const router = useRouter();

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>

      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List>
          {TABS.map((t) => (
            <Tabs.Trigger key={t.id} value={t.id}>
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Box mt="5" style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>

          <Tabs.Content value="accounts">
            <Box p="5">
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>連接信箱</Text>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                授權 Gmail 或 Outlook，系統會定時撈取新信件並自動分類。
              </Text>
              <Flex gap="3">
                <Button variant="outline" style={{ gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  連接 Gmail
                </Button>
                <Button variant="outline" style={{ gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0078d4"><path d="M0 0h11.5v11.5H0zm12.5 0H24v11.5H12.5zM0 12.5h11.5V24H0zm12.5 0H24V24H12.5z"/></svg>
                  連接 Outlook
                </Button>
              </Flex>
              <Box mt="5" p="4" style={{ background: "var(--gray-3)", borderRadius: 7, border: "1px solid var(--gray-6)", fontSize: 12, color: "var(--gray-9)" }}>
                OAuth 流程將在 Phase 2 實作
              </Box>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="storage">
            <Box p="5">
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>附件儲存空間</Text>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                選擇附件要存到哪裡。系統只記錄位置，不佔用 MailFlow 自身儲存空間。
              </Text>
              <Button variant="solid" color="green" onClick={() => router.push("/app/settings/storage")}>
                管理儲存空間
              </Button>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="schedule">
            <Box p="5">
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>撈信排程</Text>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                設定自動撈信的頻率（per 信箱帳號）。
              </Text>
              <Flex align="center" gap="3">
                <Text size="2" style={{ color: "var(--gray-9)" }}>每</Text>
                <input
                  type="number"
                  defaultValue={60}
                  min={15}
                  max={1440}
                  style={{
                    width: 72, padding: "6px 10px", border: "1px solid var(--gray-6)",
                    borderRadius: 6, fontSize: 13, color: "var(--gray-12)", background: "var(--color-background)",
                  }}
                />
                <Text size="2" style={{ color: "var(--gray-9)" }}>分鐘撈一次（15-1440）</Text>
              </Flex>
              <Button variant="solid" color="green" style={{ marginTop: 16 }}>儲存</Button>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="tipo">
            <Box p="5">
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>TIPO 智財局連攜</Text>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                連接台灣智慧財產局，自動同步案件狀態、OA 通知、核准公告。
              </Text>

              {/* Connection status */}
              <Flex gap="3" mb="5" wrap="wrap">
                {[
                  { name: "TIPO 專利", status: "connected", lastSync: "2026-03-20 09:30" },
                  { name: "TIPO 商標", status: "connected", lastSync: "2026-03-20 09:30" },
                  { name: "USPTO PAIR", status: "disconnected", lastSync: null },
                  { name: "JPO J-PlatPat", status: "disconnected", lastSync: null },
                ].map((s) => (
                  <Box key={s.name} style={{
                    flex: 1, padding: "14px 16px", border: "1px solid var(--gray-6)",
                    borderRadius: 8, background: s.status === "connected" ? "var(--green-2)" : "var(--color-background)",
                    borderLeft: `3px solid ${s.status === "connected" ? "var(--green-9)" : "var(--gray-6)"}`,
                    minWidth: 140,
                  }}>
                    <Text size="1" weight="bold" style={{ color: "var(--gray-12)", display: "block", marginBottom: 4 }}>{s.name}</Text>
                    <Text size="1" style={{ color: s.status === "connected" ? "var(--green-9)" : "var(--gray-8)" }}>
                      {s.status === "connected" ? `已連線 · ${s.lastSync}` : "未連線"}
                    </Text>
                  </Box>
                ))}
              </Flex>

              {/* Sync settings */}
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)", display: "block", marginBottom: 10 }}>自動同步項目</Text>
              <Flex direction="column" gap="2" mb="4">
                {[
                  { label: "案件狀態變更（審查中→核准→公告）", checked: true },
                  { label: "OA（審查意見通知書）自動取込", checked: true },
                  { label: "年費到期資料自動更新", checked: true },
                  { label: "核准公告 PDF 自動下載", checked: true },
                  { label: "商標公報異議期監控", checked: false },
                ].map((item) => (
                  <label key={item.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--gray-12)", cursor: "pointer" }}>
                    <input type="checkbox" defaultChecked={item.checked} style={{ accentColor: "var(--green-9)" }} />
                    {item.label}
                  </label>
                ))}
              </Flex>

              {/* API key */}
              <Text size="1" weight="bold" style={{ color: "var(--gray-8)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>TIPO API Key</Text>
              <Flex gap="2">
                <input
                  type="password"
                  defaultValue="sk-tipo-xxxxxxxxxxxxxxxxxxxx"
                  style={{ flex: 1, padding: "7px 12px", border: "1px solid var(--gray-6)", borderRadius: 6, fontSize: 13, color: "var(--gray-12)", background: "var(--color-background)", fontFamily: "ui-monospace, monospace" }}
                />
                <Button variant="outline" style={{ fontSize: 12 }}>驗證</Button>
              </Flex>
              <Button variant="solid" color="green" style={{ marginTop: 20 }}>儲存連攜設定</Button>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="templates">
            <Box p="5">
              <Flex align="center" justify="between" mb="1">
                <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>信件模板管理</Text>
                <Button variant="solid" color="green" size="1">新增模板</Button>
              </Flex>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                管理案件聯絡模板，支援差込項目自動帶入案號、客戶名、期限等欄位。
              </Text>

              {/* Template list */}
              <Box style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
                {[
                  { name: "OA 通知轉寄（客戶）", type: "TC", fields: ["案號", "客戶名", "OA期限", "OA摘要"], lastEdit: "2026-03-15" },
                  { name: "年費繳費通知", type: "TC", fields: ["案號", "年度", "金額", "截止日"], lastEdit: "2026-03-10" },
                  { name: "新案進度回報", type: "TC", fields: ["案號", "案件名稱", "目前狀態", "下一步"], lastEdit: "2026-02-28" },
                  { name: "現地代理人指示函", type: "TA", fields: ["案號", "國家", "代理人名", "指示內容"], lastEdit: "2026-03-18" },
                  { name: "核准通知（客戶）", type: "TC", fields: ["案號", "專利號", "核准日", "客戶名"], lastEdit: "2026-01-20" },
                  { name: "官方繳費指示", type: "TG", fields: ["案號", "費用類型", "金額", "截止日"], lastEdit: "2026-03-01" },
                ].map((tpl, i, arr) => (
                  <Flex key={tpl.name} align="center" gap="3" style={{
                    padding: "12px 16px",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--gray-6)" : "none",
                  }}>
                    <Badge
                      variant="soft"
                      color={tpl.type === "TC" ? "blue" : tpl.type === "TA" ? "purple" : "amber"}
                      size="1"
                    >
                      {tpl.type}
                    </Badge>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>{tpl.name}</Text>
                      <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 2 }}>
                        差込項目：{tpl.fields.map(f => `{{${f}}}`).join("、")}
                      </Text>
                    </Box>
                    <Text size="1" style={{ color: "var(--gray-8)", flexShrink: 0 }}>{tpl.lastEdit}</Text>
                    <Button variant="ghost" size="1">編輯</Button>
                  </Flex>
                ))}
              </Box>
            </Box>
          </Tabs.Content>

          <Tabs.Content value="general">
            <Box p="5">
              <Text size="2" weight="bold" style={{ color: "var(--gray-12)" }}>一般設定</Text>
              <Text as="p" size="2" style={{ color: "var(--gray-9)", marginBottom: 20, marginTop: 4 }}>
                案號格式、自有 domain、LLM 模型設定。
              </Text>
              <Flex direction="column" gap="4">
                {[
                  { label: "自有 Domain", value: "ipwinner.com, ipwinner.com.tw" },
                  { label: "LLM 模型", value: "gemini-3-flash-preview" },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Text size="1" weight="bold" style={{ color: "var(--gray-8)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</Text>
                    <input
                      defaultValue={value}
                      style={{
                        width: "100%", padding: "7px 12px",
                        border: "1px solid var(--gray-6)", borderRadius: 6,
                        fontSize: 13, color: "var(--gray-12)", background: "var(--color-background)",
                      }}
                    />
                  </Box>
                ))}
              </Flex>
              <Button variant="solid" color="green" style={{ marginTop: 20 }}>儲存</Button>
            </Box>
          </Tabs.Content>

        </Box>
      </Tabs.Root>
    </div>
  );
}

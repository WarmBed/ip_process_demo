"use client";

import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Sender, ApiResponse } from "@/lib/types";
import { Loading } from "@/components/loading";
import { Button, Badge, Text, Box, Flex } from "@radix-ui/themes";

const ROLE_LABELS: Record<string, string> = {
  C: "客戶",
  A: "代理人",
  G: "政府",
  S: "垃圾",
  X: "未知",
};

const ROLE_BADGE_COLOR: Record<string, "green" | "blue" | "cyan" | "gray" | "amber"> = {
  C: "green",
  A: "blue",
  G: "cyan",
  S: "gray",
  X: "amber",
};

const SOURCE_LABELS: Record<string, string> = {
  manual:      "手動",
  ai_inferred: "AI 推斷",
  feedback:    "回授學習",
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_BADGE_COLOR[role] ?? "gray";
  return (
    <Badge variant="soft" color={color} size="1">
      {role} · {ROLE_LABELS[role] ?? role}
    </Badge>
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

      {/* Toolbar */}
      <Flex align="center" justify="end" mb="4">
        <Button variant="solid" color="green" style={{ gap: 6 }}>
          <Plus size={13} />
          新增
        </Button>
      </Flex>

      {/* Search */}
      <Flex align="center" gap="2" mb="4" style={{
        border: "1px solid var(--gray-6)", borderRadius: 7,
        background: "var(--color-background)", padding: "0 12px", height: 36,
        maxWidth: 360,
      }}>
        <Search size={13} color="var(--gray-8)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋 domain、公司名..."
          style={{
            flex: 1, border: "none", outline: "none",
            fontSize: 13, background: "transparent", color: "var(--gray-12)",
          }}
        />
      </Flex>

      {/* Table */}
      <Box style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "220px 100px 1fr 100px 110px",
          padding: "8px 16px",
          background: "var(--gray-3)",
          borderBottom: "1px solid var(--gray-6)",
          fontSize: 11, fontWeight: 600, color: "var(--gray-8)",
          letterSpacing: "0.04em", textTransform: "uppercase", gap: 12,
        }}>
          <div>Domain / Email</div>
          <div>角色</div>
          <div>公司名 / 備註</div>
          <div>來源</div>
          <div>更新時間</div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Box py="9" style={{ textAlign: "center", color: "var(--gray-8)", fontSize: 13 }}>
            沒有找到符合條件的 Sender
          </Box>
        ) : (
          filtered.map((s, i) => (
            <div
              key={s.id}
              className="table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "220px 100px 1fr 100px 110px",
                padding: "10px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-6)" : "none",
                alignItems: "center", gap: 12,
                background: "var(--color-background)",
              }}
            >
              {/* Key */}
              <Text size="1" style={{
                fontFamily: "ui-monospace, monospace",
                color: "var(--gray-12)", fontWeight: 500,
              }}>
                {s.key}
              </Text>

              {/* Role */}
              <div><RoleBadge role={s.role} /></div>

              {/* Name + notes */}
              <div>
                <Text size="2" weight="medium" style={{ color: "var(--gray-12)" }}>{s.display_name}</Text>
                {s.notes && (
                  <Text size="1" style={{ color: "var(--gray-8)", display: "block", marginTop: 2 }}>{s.notes}</Text>
                )}
              </div>

              {/* Source */}
              <Text size="1" style={{ color: "var(--gray-9)" }}>
                {SOURCE_LABELS[s.source] ?? s.source}
              </Text>

              {/* Updated at */}
              <Text size="1" style={{ color: "var(--gray-8)" }}>
                {new Date(s.updated_at).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
              </Text>
            </div>
          ))
        )}
      </Box>
    </div>
  );
}

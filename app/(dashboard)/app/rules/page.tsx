"use client";

import { useState, useEffect } from "react";
import { BookOpen, Cpu, Search } from "lucide-react";
import type { RuleGroup } from "@/app/api/v1/rules/route";
import { Loading } from "@/components/loading";
import { Badge, Button, Text, Box, Flex, TextField } from "@radix-ui/themes";

export default function RulesPage() {
  const [groups, setGroups]   = useState<RuleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/v1/rules")
      .then((r) => r.json())
      .then((json) => { setGroups(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const q = search.toLowerCase();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      rules: g.rules.filter((r) => {
        if (activeCategory !== "all" && g.category !== activeCategory) return false;
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.trigger.toLowerCase().includes(q) ||
          r.action.toLowerCase().includes(q) ||
          r.example.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((g) => g.rules.length > 0);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000 }}>

      {/* Toolbar */}
      <Flex gap="3" mb="4" align="center" wrap="wrap">
        <Flex align="center" gap="2" style={{
          border: "1px solid var(--gray-6)", borderRadius: 6,
          padding: "5px 10px", background: "var(--color-background)", minWidth: 220,
        }}>
          <Search size={13} color="var(--gray-8)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋規則..."
            style={{
              border: "none", outline: "none", fontSize: 13, background: "transparent",
              color: "var(--gray-12)", flex: 1,
            }}
          />
        </Flex>

        <Flex gap="1" wrap="wrap">
          <Button
            variant={activeCategory === "all" ? "solid" : "ghost"}
            color={activeCategory === "all" ? "green" : "gray"}
            size="1"
            onClick={() => setActiveCategory("all")}
          >
            全部
          </Button>
          {groups.map((g) => (
            <Button
              key={g.category}
              variant={activeCategory === g.category ? "solid" : "ghost"}
              color={activeCategory === g.category ? "green" : "gray"}
              size="1"
              onClick={() => setActiveCategory(g.category === activeCategory ? "all" : g.category)}
            >
              {g.label}
            </Button>
          ))}
        </Flex>
      </Flex>

      {/* Rules */}
      {loading ? (
        <Loading />
      ) : filteredGroups.length === 0 ? (
        <Box py="9" style={{ textAlign: "center", color: "var(--gray-8)", fontSize: 13 }}>
          沒有符合的規則
        </Box>
      ) : (
        <Flex direction="column" gap="5">
          {filteredGroups.map((group) => (
            <CategorySection key={group.category} group={group} />
          ))}
        </Flex>
      )}
    </div>
  );
}

function CategorySection({ group }: { group: RuleGroup }) {
  return (
    <Box style={{ border: "1px solid var(--gray-6)", borderRadius: 10, overflow: "hidden" }}>
      {/* Category header */}
      <Flex align="center" gap="2" style={{
        background: group.titleColor,
        padding: "10px 14px",
      }}>
        <Text size="1" weight="bold" style={{ color: "var(--gray-12)", letterSpacing: 0.2 }}>
          {group.label}
        </Text>
        <Badge variant="soft" color="gray" size="1">
          {group.rules.length} 條
        </Badge>
      </Flex>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr 1fr 1fr 72px",
        gap: 0,
        padding: "6px 14px",
        background: group.color,
        borderBottom: "1px solid var(--gray-6)",
        fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
      }}>
        <div>規則 ID</div>
        <div>觸發條件</div>
        <div>執行動作</div>
        <div>範例 / 備注</div>
        <div style={{ textAlign: "center" }}>來源</div>
      </div>

      {/* Rows */}
      {group.rules.map((rule, idx) => (
        <div
          key={rule.id}
          style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr 1fr 1fr 72px",
            gap: 0,
            padding: "9px 14px",
            background: idx % 2 === 0 ? group.color : "var(--color-background)",
            borderBottom: idx < group.rules.length - 1 ? "1px solid var(--gray-6)" : "none",
            alignItems: "start",
          }}
        >
          {/* ID badge */}
          <div style={{ paddingTop: 1 }}>
            <Badge variant="soft" size="1" style={{
              background: group.titleColor,
              color: "var(--gray-12)",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}>
              {rule.id}
            </Badge>
          </div>

          {/* Trigger */}
          <Text size="1" style={{ color: "var(--gray-12)", lineHeight: 1.6, paddingRight: 12 }}>
            {rule.trigger}
          </Text>

          {/* Action */}
          <Text size="1" style={{ color: "var(--gray-12)", lineHeight: 1.6, paddingRight: 12 }}>
            {rule.action}
          </Text>

          {/* Example */}
          <Text size="1" style={{ color: "var(--gray-9)", lineHeight: 1.6, paddingRight: 8 }}>
            {rule.example || <span style={{ color: "var(--gray-7)" }}>&mdash;</span>}
          </Text>

          {/* Source */}
          <Flex justify="center" style={{ paddingTop: 1 }}>
            {rule.source === "learned" ? (
              <Badge variant="soft" color="amber" size="1">
                <Cpu size={9} />
                學習
              </Badge>
            ) : (
              <Badge variant="soft" color="gray" size="1">
                <BookOpen size={9} />
                系統
              </Badge>
            )}
          </Flex>
        </div>
      ))}
    </Box>
  );
}

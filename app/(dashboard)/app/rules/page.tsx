"use client";

import { useState, useEffect } from "react";
import { BookOpen, Cpu, Search } from "lucide-react";
import type { RuleGroup } from "@/app/api/v1/rules/route";
import { Loading } from "@/components/loading";

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
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "5px 10px", background: "var(--bg)", minWidth: 220,
        }}>
          <Search size={13} color="var(--fg-subtle)" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋規則…"
            style={{
              border: "none", outline: "none", fontSize: 13, background: "transparent",
              color: "var(--fg)", flex: 1,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveCategory("all")}
            className={`tab-link${activeCategory === "all" ? " active" : ""}`}
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            全部
          </button>
          {groups.map((g) => (
            <button
              key={g.category}
              onClick={() => setActiveCategory(g.category === activeCategory ? "all" : g.category)}
              className={`tab-link${activeCategory === g.category ? " active" : ""}`}
              style={{ fontSize: 12, padding: "4px 10px" }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      {loading ? (
        <Loading />
      ) : filteredGroups.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--fg-subtle)", fontSize: 13 }}>
          沒有符合的規則
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {filteredGroups.map((group) => (
            <CategorySection key={group.category} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ group }: { group: RuleGroup }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      {/* Category header */}
      <div style={{
        background: group.titleColor,
        padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)", letterSpacing: 0.2 }}>
          {group.label}
        </span>
        <span style={{
          fontSize: 11, color: "var(--fg-muted)",
          background: "rgba(255,255,255,0.55)", borderRadius: 4,
          padding: "1px 6px",
        }}>
          {group.rules.length} 條
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "56px 1fr 1fr 1fr 72px",
        gap: 0,
        padding: "6px 14px",
        background: group.color,
        borderBottom: "1px solid var(--border)",
        fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
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
            background: idx % 2 === 0 ? group.color : "var(--bg)",
            borderBottom: idx < group.rules.length - 1 ? "1px solid var(--border)" : "none",
            alignItems: "start",
          }}
        >
          {/* ID badge */}
          <div style={{ paddingTop: 1 }}>
            <span style={{
              display: "inline-block",
              fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
              background: group.titleColor,
              padding: "2px 6px", borderRadius: 4,
              color: "var(--fg)",
            }}>
              {rule.id}
            </span>
          </div>

          {/* Trigger */}
          <div style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.6, paddingRight: 12 }}>
            {rule.trigger}
          </div>

          {/* Action */}
          <div style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.6, paddingRight: 12 }}>
            {rule.action}
          </div>

          {/* Example */}
          <div style={{ fontSize: 11, color: "var(--fg-muted)", lineHeight: 1.6, paddingRight: 8 }}>
            {rule.example || <span style={{ color: "var(--sl7)" }}>—</span>}
          </div>

          {/* Source */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 1 }}>
            {rule.source === "learned" ? (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 500,
                background: "#FFF8E1", color: "#795548",
                border: "1px solid #FFE082",
                padding: "2px 6px", borderRadius: 4,
              }}>
                <Cpu size={9} />
                學習
              </span>
            ) : (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, fontWeight: 500,
                background: "var(--sl3)", color: "var(--fg-muted)",
                border: "1px solid var(--border)",
                padding: "2px 6px", borderRadius: 4,
              }}>
                <BookOpen size={9} />
                系統
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge, Button } from "@radix-ui/themes";

/* ── Types ── */
type StepStatus = "completed" | "active" | "pending";

interface Step {
  name: string;
  assignee: string;
  status: StepStatus;
  completed_at: string | null;
}

interface Workflow {
  id: string;
  name: string;
  case_number: string;
  client_name: string;
  status: "active" | "completed" | "pending";
  created_at: string;
  steps: Step[];
}

/* ── Data ── */
const WF: Workflow[] = [
  {
    id: "wf1", name: "OA 答辯審批", case_number: "KOIT20004TUS7", client_name: "Foxconn",
    status: "active", created_at: "2026-03-15",
    steps: [
      { name: "技術分析", assignee: "王小明", status: "completed", completed_at: "03-16" },
      { name: "答辯書草擬", assignee: "李美華", status: "active", completed_at: null },
      { name: "主管審核", assignee: "陳志豪", status: "pending", completed_at: null },
      { name: "客戶確認", assignee: "客戶窗口", status: "pending", completed_at: null },
    ],
  },
  {
    id: "wf2", name: "新案申請流程", case_number: "TSMC23014TW", client_name: "TSMC",
    status: "active", created_at: "2026-03-12",
    steps: [
      { name: "技術揭露書", assignee: "發明人", status: "completed", completed_at: "03-13" },
      { name: "專利性評估", assignee: "王小明", status: "completed", completed_at: "03-14" },
      { name: "說明書撰寫", assignee: "李美華", status: "active", completed_at: null },
      { name: "品質審核", assignee: "陳志豪", status: "pending", completed_at: null },
      { name: "送件申請", assignee: "行政組", status: "pending", completed_at: null },
    ],
  },
  {
    id: "wf3", name: "年費繳納確認", case_number: "BRIT25710TW1", client_name: "ADATA",
    status: "completed", created_at: "2026-03-01",
    steps: [
      { name: "費用計算", assignee: "行政組", status: "completed", completed_at: "03-02" },
      { name: "客戶確認", assignee: "客戶窗口", status: "completed", completed_at: "03-05" },
      { name: "繳費執行", assignee: "行政組", status: "completed", completed_at: "03-08" },
    ],
  },
  {
    id: "wf4", name: "商標異議答辯", case_number: "ADTM25003TW1", client_name: "ADATA",
    status: "active", created_at: "2026-03-18",
    steps: [
      { name: "異議分析", assignee: "林雅琪", status: "active", completed_at: null },
      { name: "答辯策略擬定", assignee: "陳志豪", status: "pending", completed_at: null },
      { name: "答辯書撰寫", assignee: "林雅琪", status: "pending", completed_at: null },
      { name: "送件", assignee: "行政組", status: "pending", completed_at: null },
    ],
  },
  {
    id: "wf5", name: "PCT 各國移行", case_number: "MTKP24001", client_name: "MediaTek",
    status: "pending", created_at: "2026-03-19",
    steps: [
      { name: "移行國家確認", assignee: "客戶窗口", status: "pending", completed_at: null },
      { name: "翻譯委託", assignee: "行政組", status: "pending", completed_at: null },
      { name: "各國代理人指派", assignee: "陳志豪", status: "pending", completed_at: null },
      { name: "移行申請送件", assignee: "行政組", status: "pending", completed_at: null },
    ],
  },
];

type Filter = "all" | "active" | "pending" | "completed";

/* ── Page ── */
export default function WorkflowsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const list = WF.filter(w => filter === "all" || w.status === filter);
  const counts = { active: WF.filter(w => w.status === "active").length, pending: WF.filter(w => w.status === "pending").length, completed: WF.filter(w => w.status === "completed").length };

  return (
    <div className="page-pad" style={{ padding: "24px 28px", maxWidth: 960 }}>

      <style>{`@keyframes wf-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header + inline filter */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--gray-12)", margin: 0, letterSpacing: "-0.02em" }}>工作流程</h1>
        <div style={{ display: "flex", gap: 2 }}>
          {(["all", "active", "pending", "completed"] as Filter[]).map(f => {
            const label = { all: "全部", active: `進行中 ${counts.active}`, pending: `待啟動 ${counts.pending}`, completed: `已完成 ${counts.completed}` }[f];
            return (
              <Button
                key={f}
                variant={filter === f ? "soft" : "ghost"}
                color={filter === f ? "green" : "gray"}
                size="1"
                onClick={() => setFilter(f)}
                style={{ cursor: "pointer", fontWeight: filter === f ? 600 : 400 }}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>

        {/* Table header */}
        <div className="wf-header" style={{
          display: "grid", gridTemplateColumns: "1fr 140px minmax(200px,320px) 120px",
          padding: "7px 16px", gap: 12,
          background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
          fontSize: 10, fontWeight: 600, color: "var(--gray-9)",
          textTransform: "uppercase", letterSpacing: "0.05em",
        }}>
          <div>流程</div>
          <div className="col-hide-m">案號</div>
          <div>進度</div>
          <div>目前步驟</div>
        </div>

        {list.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: "var(--gray-9)" }}>無符合條件</div>
        )}

        {list.map((w, wi) => {
          const open = expandedId === w.id;
          const done = w.steps.filter(s => s.status === "completed").length;
          const curr = w.steps.find(s => s.status === "active");

          return (
            <div key={w.id}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(open ? null : w.id)}
                className="table-row wf-row"
                style={{
                  display: "grid", gridTemplateColumns: "1fr 140px minmax(200px,320px) 120px",
                  padding: "12px 16px", gap: 12, alignItems: "center", cursor: "pointer",
                  borderBottom: (wi < list.length - 1 || open) ? "1px solid var(--gray-6)" : "none",
                  background: open ? "var(--gray-2)" : "var(--color-background)",
                }}
              >
                {/* Name + client */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-12)" }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 1 }}>{w.client_name}</div>
                </div>

                {/* Case number */}
                <div className="col-hide-m" style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--gray-11)" }}>
                  {w.case_number}
                </div>

                {/* Segmented progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", gap: 2, flex: 1, height: 6, borderRadius: 3, overflow: "hidden" }}>
                    {w.steps.map((s, i) => (
                      <div key={i} style={{
                        flex: 1, borderRadius: 2,
                        background: s.status === "completed" ? "var(--green-9)" : s.status === "active" ? "var(--green-7)" : "var(--gray-5)",
                        animation: s.status === "active" ? "wf-pulse 2s ease-in-out infinite" : "none",
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--gray-11)", fontWeight: 600, minWidth: 28, textAlign: "right" }}>
                    {done}/{w.steps.length}
                  </span>
                </div>

                {/* Current step */}
                <div style={{ fontSize: 12, color: curr ? "var(--green-11)" : w.status === "completed" ? "var(--green-9)" : "var(--gray-9)", fontWeight: 500 }}>
                  {curr ? curr.name : w.status === "completed" ? "已完成" : "未開始"}
                </div>
              </div>

              {/* Expanded: step list */}
              {open && (
                <div style={{ padding: "2px 16px 14px 16px", background: "var(--gray-2)", borderBottom: wi < list.length - 1 ? "1px solid var(--gray-6)" : "none" }}>
                  {w.steps.map((s, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0",
                      borderBottom: i < w.steps.length - 1 ? "1px solid var(--gray-6)" : "none",
                    }}>
                      {/* Circle */}
                      {s.status === "completed" ? (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--green-9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={10} color="#fff" strokeWidth={3} />
                        </div>
                      ) : s.status === "active" ? (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--green-7)", flexShrink: 0, animation: "wf-pulse 2s ease-in-out infinite" }} />
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--gray-7)", flexShrink: 0 }} />
                      )}

                      {/* Step name */}
                      <span style={{
                        fontSize: 12, flex: 1,
                        color: s.status === "completed" ? "var(--gray-11)" : s.status === "active" ? "var(--gray-12)" : "var(--gray-9)",
                        fontWeight: s.status === "active" ? 600 : 400,
                        textDecoration: s.status === "completed" ? "line-through" : "none",
                      }}>
                        {s.name}
                      </span>

                      {/* Assignee */}
                      <span style={{ fontSize: 11, color: "var(--gray-11)", minWidth: 56 }}>{s.assignee}</span>

                      {/* Date or status */}
                      <span style={{ fontSize: 10, color: "var(--gray-9)", minWidth: 40, textAlign: "right" }}>
                        {s.completed_at ?? (s.status === "active" ? "進行中" : "—")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

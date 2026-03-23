"use client";

import { useState } from "react";
import { Badge, Button, IconButton } from "@radix-ui/themes";
import { Search, Plus, FileText, Building2, User, ChevronRight } from "lucide-react";
import { TextField } from "@radix-ui/themes";

/* ─── mock data ───────────────────────────────────────────── */

type CaseStatus = "進行中" | "待確認" | "已結案" | "暫停";
type CaseType   = "商標" | "專利" | "著作權" | "設計";

interface Case {
  id: string;
  title: string;
  type: CaseType;
  status: CaseStatus;
  attorney: string;
  filed: string;
  deadline?: string;
}

interface Client {
  id: string;
  name: string;
  kind: "company" | "person";
  industry: string;
  contact: string;
  email: string;
  cases: Case[];
}

const CLIENTS: Client[] = [
  {
    id: "C001", name: "台積電股份有限公司", kind: "company",
    industry: "半導體", contact: "李大同", email: "lee@tsmc.com",
    cases: [
      { id: "P2024-001", title: "奈米製程蝕刻方法", type: "專利", status: "進行中",  attorney: "王律師", filed: "2024-03-01", deadline: "2024-09-01" },
      { id: "T2023-045", title: "TSMC® 品牌商標",   type: "商標", status: "已結案",  attorney: "林律師", filed: "2023-06-15" },
      { id: "P2024-012", title: "散熱模組結構",      type: "專利", status: "待確認",  attorney: "王律師", filed: "2024-08-20", deadline: "2024-10-05" },
    ],
  },
  {
    id: "C002", name: "聯發科技股份有限公司", kind: "company",
    industry: "IC 設計", contact: "陳美玲", email: "chen@mediatek.com",
    cases: [
      { id: "P2024-033", title: "5G 基頻晶片架構",  type: "專利", status: "進行中",  attorney: "林律師", filed: "2024-01-10", deadline: "2024-12-31" },
      { id: "T2024-007", title: "Dimensity 商標申請", type: "商標", status: "進行中",  attorney: "張律師", filed: "2024-04-22", deadline: "2024-11-22" },
    ],
  },
  {
    id: "C003", name: "威剛科技股份有限公司", kind: "company",
    industry: "記憶體", contact: "許建國", email: "hsu@adata.com",
    cases: [
      { id: "D2023-019", title: "DDR5 模組外觀設計", type: "設計", status: "已結案",  attorney: "張律師", filed: "2023-11-01" },
    ],
  },
  {
    id: "C004", name: "張明宏", kind: "person",
    industry: "獨立設計師", contact: "張明宏", email: "ming@studio.com",
    cases: [
      { id: "C2024-002", title: "插畫集著作權登記",  type: "著作權", status: "待確認", attorney: "林律師", filed: "2024-07-15", deadline: "2024-09-30" },
      { id: "T2024-021", title: "品牌 LOGO 商標",    type: "商標", status: "暫停",     attorney: "王律師", filed: "2024-02-01" },
    ],
  },
  {
    id: "C005", name: "鴻海精密工業股份有限公司", kind: "company",
    industry: "電子製造", contact: "劉忠信", email: "liu@foxconn.com",
    cases: [
      { id: "P2023-088", title: "機器手臂夾爪機構",  type: "專利", status: "進行中",  attorney: "王律師", filed: "2023-09-05", deadline: "2024-12-05" },
      { id: "P2024-044", title: "電池模組封裝結構",  type: "專利", status: "進行中",  attorney: "林律師", filed: "2024-05-18", deadline: "2025-01-18" },
      { id: "T2022-003", title: "Foxconn® 商標維護",  type: "商標", status: "已結案",  attorney: "張律師", filed: "2022-01-20" },
    ],
  },
];

/* ─── badge helpers ───────────────────────────────────────── */

const STATUS_COLOR: Record<CaseStatus, "blue" | "amber" | "green" | "gray"> = {
  "進行中": "blue",
  "待確認": "amber",
  "已結案": "green",
  "暫停":   "gray",
};

const TYPE_COLOR: Record<CaseType, "purple" | "blue" | "orange" | "teal"> = {
  "商標":  "purple",
  "專利":  "blue",
  "著作權": "orange",
  "設計":  "teal",
};

function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant="soft" color={STATUS_COLOR[status]} size="1">
      {status}
    </Badge>
  );
}

function TypeBadge({ type }: { type: CaseType }) {
  return (
    <Badge variant="soft" color={TYPE_COLOR[type]} size="1">
      {type}
    </Badge>
  );
}

/* ─── main page ───────────────────────────────────────────── */

export default function ClientsPage() {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Client>(CLIENTS[0]);
  const [caseSearch, setCaseSearch] = useState("");

  const filteredClients = CLIENTS.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q);
  });

  const filteredCases = selected.cases.filter((c) => {
    if (!caseSearch) return true;
    const q = caseSearch.toLowerCase();
    return c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
  });

  const activeCases = selected.cases.filter((c) => c.status === "進行中").length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Left: Client List ────────────────────────────── */}
      <div style={{
        width: 280, flexShrink: 0, borderRight: "1px solid var(--gray-6)",
        display: "flex", flexDirection: "column", background: "var(--color-background)",
      }}>
        {/* header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--gray-6)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>
              客戶 ({CLIENTS.length})
            </span>
            <Button variant="ghost" color="gray" size="1" style={{ cursor: "pointer" }}>
              <Plus size={12} /> 新增
            </Button>
          </div>
          <TextField.Root
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋客戶..."
            size="1"
          >
            <TextField.Slot>
              <Search size={12} color="var(--gray-9)" />
            </TextField.Slot>
          </TextField.Root>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredClients.map((c) => {
            const isActive = c.id === selected.id;
            const ongoing  = c.cases.filter((cs) => cs.status === "進行中").length;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--gray-6)",
                  cursor: "pointer",
                  background: isActive ? "var(--green-2)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--green-9)" : "3px solid transparent",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "background 0.12s, border-color 0.12s",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--gray-2)"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {/* avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: c.kind === "company" ? 8 : "50%",
                  background: isActive ? "var(--green-9)" : "var(--gray-4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.12s",
                }}>
                  {c.kind === "company"
                    ? <Building2 size={15} color={isActive ? "var(--color-background)" : "var(--gray-11)"} />
                    : <User size={15} color={isActive ? "var(--color-background)" : "var(--gray-11)"} />
                  }
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? "var(--green-11)" : "var(--gray-12)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 1 }}>
                    {c.industry} · {c.cases.length} 件
                    {ongoing > 0 && (
                      <span style={{ marginLeft: 4, color: "var(--blue-9)", fontWeight: 600 }}>
                        ({ongoing} 進行中)
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={12} color="var(--gray-9)" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Case Detail ───────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* client header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--gray-6)",
          background: "var(--color-background)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: selected.kind === "company" ? 10 : "50%",
                background: "var(--gray-4)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected.kind === "company"
                  ? <Building2 size={20} color="var(--gray-11)" />
                  : <User size={20} color="var(--gray-11)" />
                }
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-12)", margin: 0 }}>
                  {selected.name}
                </h2>
                <div style={{ fontSize: 12, color: "var(--gray-9)", marginTop: 3, display: "flex", gap: 12 }}>
                  <span>聯絡人：{selected.contact}</span>
                  <span>{selected.email}</span>
                  <span>{selected.industry}</span>
                </div>
              </div>
            </div>

            {/* stats */}
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "總案件", value: selected.cases.length, color: "var(--gray-12)" },
                { label: "進行中", value: activeCases, color: "var(--blue-9)" },
                { label: "已結案", value: selected.cases.filter((c) => c.status === "已結案").length, color: "var(--green-9)" },
              ].map((s) => (
                <div key={s.label} style={{
                  textAlign: "center", padding: "6px 14px",
                  background: "var(--gray-2)", borderRadius: 8,
                  border: "1px solid var(--gray-6)",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* cases toolbar */}
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid var(--gray-6)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--color-background)",
        }}>
          <TextField.Root
            value={caseSearch}
            onChange={(e) => setCaseSearch(e.target.value)}
            placeholder="搜尋案號、案名..."
            size="1"
            style={{ width: 240 }}
          >
            <TextField.Slot>
              <Search size={12} color="var(--gray-9)" />
            </TextField.Slot>
          </TextField.Root>
          <Button variant="solid" color="green" size="1" style={{ cursor: "pointer" }}>
            <Plus size={12} /> 新增案件
          </Button>
        </div>

        {/* cases table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>

            {/* table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 80px 90px 80px 100px 100px",
              padding: "8px 16px", gap: 12,
              background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
              fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              <div>案號</div>
              <div>案件名稱</div>
              <div>類型</div>
              <div>狀態</div>
              <div>承辦人</div>
              <div>申請日</div>
              <div>期限</div>
            </div>

            {filteredCases.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
                沒有符合的案件
              </div>
            ) : (
              filteredCases.map((c, i) => (
                <div
                  key={c.id}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 80px 90px 80px 100px 100px",
                    padding: "11px 16px", gap: 12,
                    borderBottom: i < filteredCases.length - 1 ? "1px solid var(--gray-6)" : "none",
                    alignItems: "center",
                    background: "var(--color-background)",
                  }}
                >
                  {/* case id */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <FileText size={13} color="var(--gray-11)" />
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--gray-12)", fontWeight: 500 }}>
                      {c.id}
                    </span>
                  </div>

                  {/* title */}
                  <div style={{ fontSize: 13, color: "var(--gray-12)" }}>{c.title}</div>

                  {/* type */}
                  <div><TypeBadge type={c.type} /></div>

                  {/* status */}
                  <div><StatusBadge status={c.status} /></div>

                  {/* attorney */}
                  <div style={{ fontSize: 12, color: "var(--gray-11)" }}>{c.attorney}</div>

                  {/* filed */}
                  <div style={{ fontSize: 12, color: "var(--gray-9)" }}>{c.filed}</div>

                  {/* deadline */}
                  <div style={{ fontSize: 12, color: c.deadline ? "var(--amber-9)" : "var(--gray-9)" }}>
                    {c.deadline ?? "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

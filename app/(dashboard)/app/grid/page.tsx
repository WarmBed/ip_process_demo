"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUp, ArrowDown, ChevronDown, Columns3, Search, X, ExternalLink, Check,
  GitBranch,
} from "lucide-react";
import { Badge, Button, IconButton } from "@radix-ui/themes";
import {
  MOCK_CASES, MOCK_DEADLINES, MOCK_STAFF, STATUS_LABELS, STATUS_COLORS,
  TYPE_LABELS, JURISDICTION_LABELS,
  type CaseStatus, type PatentCaseType, type Jurisdiction,
} from "@/lib/mock-cases";
import { MOCK_TODOS } from "@/lib/mock-todo";

/* ── Editable row type ── */
interface GridRow {
  id: string;
  case_number: string;
  title: string;
  client_name: string;
  case_type: PatentCaseType;
  jurisdiction: Jurisdiction;
  status: CaseStatus;
  assignee_name: string;
  assignee_id: string;
  filing_date: string | null;
  app_number: string | null;
  patent_number: string | null;
  next_deadline: string | null;
  next_action: string | null;
  days_until: number | null;
  deadline_count: number;
  todo_count: number;
  pending_fee: number;
  family: FamilyMember[];
}

interface FamilyMember { case_number: string; jurisdiction: string; status: string; relation: string }

const FLAGS: Record<string, string> = { TW: "TW", US: "US", CN: "CN", JP: "JP", EP: "EP", KR: "KR", DE: "DE", GB: "GB" };

const MOCK_FEES_MAP: Record<string, number> = {
  "TSMC23014TW": 125000, "TSMC23014US": 98000, "KOIT20004TUS7": 45000,
  "BRIT25710TW1": 32000, "ADTM25003TW1": 18000,
};

const FAMILY_DATA: Record<string, FamilyMember[]> = {
  "TSMC23014TW": [
    { case_number: "TSMC23014TW", jurisdiction: "TW", status: "審查中", relation: "原始出願" },
    { case_number: "TSMC23014US", jurisdiction: "US", status: "已申請", relation: "巴黎優先" },
    { case_number: "TSMC23014CN", jurisdiction: "CN", status: "審查中", relation: "巴黎優先" },
    { case_number: "TSMC23014JP", jurisdiction: "JP", status: "OA發出", relation: "巴黎優先" },
  ],
  "TSMC23014US": [], "TSMC23014CN": [], "TSMC23014JP": [],
  "MTKP24001TW": [
    { case_number: "MTKP24001TW", jurisdiction: "TW", status: "已獲證", relation: "原始出願" },
    { case_number: "MTKP24001US", jurisdiction: "US", status: "審查中", relation: "PCT移行" },
  ],
  "MTKP24001US": [],
};
// fill references
["TSMC23014US", "TSMC23014CN", "TSMC23014JP"].forEach(k => { FAMILY_DATA[k] = FAMILY_DATA["TSMC23014TW"]; });
FAMILY_DATA["MTKP24001US"] = FAMILY_DATA["MTKP24001TW"];

const STAFF_OPTIONS = MOCK_STAFF.map(s => ({ id: s.id, name: s.name }));

function initRows(): GridRow[] {
  return MOCK_CASES.map(c => {
    const dls = MOCK_DEADLINES.filter(d => d.case_number === c.case_number && d.status !== "completed");
    const todos = MOCK_TODOS.filter(t => t.case_number === c.case_number && t.status !== "done");
    const days = c.next_deadline ? Math.ceil((new Date(c.next_deadline).getTime() - Date.now()) / 86400000) : null;
    return {
      id: c.id, case_number: c.case_number, title: c.title,
      client_name: c.client_name, case_type: c.case_type,
      jurisdiction: c.jurisdiction as Jurisdiction, status: c.status,
      assignee_name: c.assignee_name, assignee_id: c.assignee_id,
      filing_date: c.filing_date ?? null, app_number: c.app_number ?? null,
      patent_number: c.patent_number ?? null,
      next_deadline: c.next_deadline ?? null, next_action: c.next_action ?? null,
      days_until: days, deadline_count: dls.length, todo_count: todos.length,
      pending_fee: MOCK_FEES_MAP[c.case_number] ?? 0,
      family: FAMILY_DATA[c.case_number] ?? [],
    };
  });
}

/* ── Column def ── */
type ColKey = string;
interface ColDef {
  key: ColKey;
  label: string;
  w: number;
  align?: "right" | "center";
  group: string;
  editable?: "text" | "select" | "dropdown";
}

const ALL_COLS: ColDef[] = [
  { key: "case_number",   label: "案號",     w: 140, group: "basic" },
  { key: "title",         label: "案件名稱",  w: 180, group: "basic", editable: "text" },
  { key: "client_name",   label: "客戶",     w: 90,  group: "basic" },
  { key: "case_type",     label: "類型",     w: 70,  group: "basic" },
  { key: "jurisdiction",  label: "國家",     w: 55,  group: "basic", align: "center" },
  { key: "status",        label: "狀態",     w: 85,  group: "status", editable: "dropdown" },
  { key: "assignee_name", label: "承辦人",    w: 80,  group: "basic", editable: "dropdown" },
  { key: "app_number",    label: "申請號",    w: 140, group: "id", editable: "text" },
  { key: "patent_number", label: "專利號",    w: 120, group: "id", editable: "text" },
  { key: "filing_date",   label: "申請日",    w: 90,  group: "id" },
  { key: "next_deadline", label: "下一期限",   w: 90,  group: "deadline" },
  { key: "days_until",    label: "剩餘",     w: 50,  group: "deadline", align: "right" },
  { key: "next_action",   label: "待辦行動",   w: 130, group: "deadline" },
  { key: "deadline_count",label: "期限",     w: 45,  group: "metrics", align: "center" },
  { key: "todo_count",    label: "待辦",     w: 45,  group: "metrics", align: "center" },
  { key: "pending_fee",   label: "未付費用",   w: 85,  group: "metrics", align: "right" },
  { key: "family",        label: "家族",     w: 60,  group: "metrics", align: "center" },
];

const GROUP_COLORS: Record<string, string> = {
  basic: "var(--gray-9)", id: "var(--violet-9)", status: "var(--blue-9)", deadline: "var(--orange-9)", metrics: "var(--green-9)",
};
const GROUP_LABELS: Record<string, string> = {
  basic: "基本", id: "識別", status: "狀態", deadline: "期限", metrics: "指標",
};

type SortDir = "asc" | "desc";

/* ── Page ── */
export default function GridPage() {
  const router = useRouter();
  const [rows, setRows] = useState<GridRow[]>(() => initRows());
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<ColKey>("days_until");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [groupBy, setGroupBy] = useState<string>("");
  const [visCols, setVisCols] = useState<Set<ColKey>>(new Set(ALL_COLS.map(c => c.key)));
  const [showColPicker, setShowColPicker] = useState(false);
  const [editCell, setEditCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [familyPopover, setFamilyPopover] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); }, []);

  // Filter
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      r.case_number.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) ||
      r.client_name.toLowerCase().includes(q) || (r.app_number ?? "").toLowerCase().includes(q) ||
      r.assignee_name.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey];
      const vb = (b as unknown as Record<string, unknown>)[sortKey];
      if (va === null && vb === null) return 0;
      if (va === null) return 1; if (vb === null) return -1;
      if (Array.isArray(va)) return (vb as FamilyMember[]).length - (va as FamilyMember[]).length;
      const cmp = typeof va === "number" ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Group
  const groups = useMemo(() => {
    if (!groupBy) return [{ label: "", rows: sorted }];
    const map = new Map<string, GridRow[]>();
    sorted.forEach(r => {
      const key = String((r as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([label, rs]) => ({ label, rows: rs }));
  }, [sorted, groupBy]);

  const cols = ALL_COLS.filter(c => visCols.has(c.key));
  const totalW = cols.reduce((s, c) => s + c.w, 0);

  function toggleSort(key: ColKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function startEdit(rowId: string, colKey: string, currentValue: string) {
    setEditCell({ rowId, colKey });
    setEditValue(currentValue);
  }

  function commitEdit() {
    if (!editCell) return;
    const { rowId, colKey } = editCell;
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [colKey]: editValue };
      if (colKey === "assignee_name") {
        const staff = STAFF_OPTIONS.find(s => s.name === editValue);
        if (staff) updated.assignee_id = staff.id;
      }
      return updated;
    }));
    showToast(`已更新 ${editCell.colKey}`);
    setEditCell(null);
  }

  function cancelEdit() { setEditCell(null); }

  /* ── Cell renderer ── */
  function renderCell(col: ColDef, row: GridRow) {
    const val = (row as unknown as Record<string, unknown>)[col.key];
    const isEditing = editCell?.rowId === row.id && editCell?.colKey === col.key;

    // ── Editable: inline text ──
    if (isEditing && col.editable === "text") {
      return (
        <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
          onBlur={commitEdit}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 11, background: "var(--green-2)", padding: "0 2px", color: "var(--gray-12)", fontFamily: col.key.includes("number") ? "ui-monospace, monospace" : "inherit" }} />
      );
    }

    // ── Editable: dropdown (assignee) ──
    if (isEditing && col.key === "assignee_name") {
      return (
        <select autoFocus value={editValue} onChange={e => { setEditValue(e.target.value); }}
          onBlur={commitEdit}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 11, background: "var(--green-2)", color: "var(--gray-12)", padding: 0, cursor: "pointer" }}>
          {STAFF_OPTIONS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
      );
    }

    // ── Editable: dropdown (status) ──
    if (isEditing && col.key === "status") {
      return (
        <select autoFocus value={editValue} onChange={e => { setEditValue(e.target.value); }}
          onBlur={commitEdit}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 11, background: "var(--green-2)", color: "var(--gray-12)", padding: 0, cursor: "pointer" }}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      );
    }

    // ── Case number → link ──
    if (col.key === "case_number") {
      return (
        <Link href="/app/cases" onClick={e => e.stopPropagation()} style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, fontSize: 11, color: "var(--green-9)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
          {val as string} <ExternalLink size={9} />
        </Link>
      );
    }

    // ── Type (each type has distinct color) ──
    if (col.key === "case_type") {
      const tc: Record<string, { color: "blue" | "cyan" | "violet" | "orange" | "gray" }> = {
        invention: { color: "blue" }, utility_model: { color: "cyan" },
        design: { color: "violet" }, trademark: { color: "orange" },
        copyright: { color: "gray" },
      };
      const c = tc[val as string] ?? { color: "gray" as const };
      return <Badge variant="soft" color={c.color} style={{ fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{TYPE_LABELS[val as PatentCaseType] ?? val}</Badge>;
    }

    // ── Jurisdiction ──
    if (col.key === "jurisdiction") return <span style={{ fontSize: 11 }}>{FLAGS[val as string] ?? ""} {val as string}</span>;

    // ── Status badge ──
    if (col.key === "status") {
      const s = STATUS_COLORS[val as CaseStatus];
      return (
        <Badge variant="soft" onClick={() => startEdit(row.id, "status", val as string)} style={{ fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", color: s?.fg, background: s?.bg, border: `1px solid ${s?.border}` }}>
          {STATUS_LABELS[val as CaseStatus] ?? val}
        </Badge>
      );
    }

    // ── Assignee → click to change ──
    if (col.key === "assignee_name") {
      return (
        <span onClick={() => startEdit(row.id, "assignee_name", val as string)} style={{ cursor: "pointer", borderBottom: "1px dashed var(--gray-6)", paddingBottom: 1 }}>
          {val as string}
        </span>
      );
    }

    // ── Days until ──
    if (col.key === "days_until") {
      if (val === null) return <span style={{ color: "var(--gray-8)" }}>—</span>;
      const d = val as number;
      return <span style={{ fontWeight: d <= 30 ? 700 : 400, color: d < 0 ? "var(--red-9)" : d <= 14 ? "var(--red-9)" : d <= 30 ? "var(--orange-9)" : "var(--gray-8)", fontFamily: "ui-monospace, monospace" }}>{d}</span>;
    }

    // ── Pending fee ──
    if (col.key === "pending_fee") {
      const n = val as number;
      if (!n) return <span style={{ color: "var(--gray-8)" }}>—</span>;
      return <Link href="/app/fees" onClick={e => e.stopPropagation()} style={{ fontFamily: "ui-monospace, monospace", color: "var(--orange-9)", fontWeight: 600, textDecoration: "none", fontSize: 11 }}>{n.toLocaleString()}</Link>;
    }

    // ── Deadline / todo count → link ──
    if (col.key === "deadline_count") {
      const n = val as number;
      return <Link href="/app/deadlines" onClick={e => e.stopPropagation()} style={{ fontWeight: n > 0 ? 700 : 400, color: n >= 3 ? "var(--red-9)" : n > 0 ? "var(--orange-9)" : "var(--gray-8)", textDecoration: "none" }}>{n}</Link>;
    }
    if (col.key === "todo_count") {
      const n = val as number;
      return <Link href="/app/todo" onClick={e => e.stopPropagation()} style={{ fontWeight: n > 0 ? 700 : 400, color: n >= 3 ? "var(--red-9)" : n > 0 ? "var(--orange-9)" : "var(--gray-8)", textDecoration: "none" }}>{n}</Link>;
    }

    // ── Family → popover ──
    if (col.key === "family") {
      const fam = val as FamilyMember[];
      if (!fam || fam.length <= 1) return <span style={{ color: "var(--gray-8)" }}>—</span>;
      const isOpen = familyPopover === row.id;
      return (
        <div style={{ position: "relative" }}>
          <Button variant="outline" color="violet" size="1" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setFamilyPopover(isOpen ? null : row.id); }}
            style={{ cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, padding: "1px 6px" }}>
            <GitBranch size={9} /> {fam.length}
          </Button>
          {isOpen && (
            <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6, zIndex: 200, background: "var(--color-background)", border: "1px solid var(--gray-5)", borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: "8px 0", minWidth: 220 }}>
              <div style={{ padding: "4px 12px 6px", fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--gray-5)" }}>
                專利家族 -- {fam.length} 件
              </div>
              {fam.map(f => (
                <div key={f.case_number} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", fontSize: 11, borderBottom: "1px solid var(--gray-4)" }}>
                  <span style={{ fontSize: 10 }}>{FLAGS[f.jurisdiction] ?? ""}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, flex: 1 }}>{f.case_number}</span>
                  <span style={{ fontSize: 10, color: "var(--gray-9)" }}>{f.status}</span>
                </div>
              ))}
              <div style={{ padding: "4px 12px", fontSize: 10, color: "var(--gray-9)" }}>{fam[0]?.relation}</div>
            </div>
          )}
        </div>
      );
    }

    // ── Editable text fields (app_number, patent_number, title) ──
    if (col.editable === "text") {
      const display = val ? String(val) : "—";
      const isMono = col.key.includes("number");
      return (
        <span onClick={() => startEdit(row.id, col.key, val ? String(val) : "")}
          style={{ cursor: "pointer", borderBottom: "1px dashed transparent", fontFamily: isMono ? "ui-monospace, monospace" : "inherit", fontSize: isMono ? 10 : 11, color: val ? "var(--gray-12)" : "var(--gray-8)" }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderBottomColor = "var(--gray-6)"; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderBottomColor = "transparent"; }}>
          {display}
        </span>
      );
    }

    // ── Date ──
    if (col.key === "next_deadline" || col.key === "filing_date") {
      if (!val) return <span style={{ color: "var(--gray-8)" }}>—</span>;
      return <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10 }}>{(val as string).slice(2)}</span>;
    }

    if (!val && val !== 0) return <span style={{ color: "var(--gray-8)" }}>—</span>;
    return <>{String(val)}</>;
  }

  return (
    <div className="page-pad" style={{ padding: "16px 20px", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1100, background: "var(--gray-12)", color: "var(--gray-1)", padding: "8px 18px", borderRadius: 4, fontSize: 12, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
          <Check size={12} style={{ marginRight: 6, verticalAlign: -2 }} />{toast}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-12)", margin: 0, marginRight: 6 }}>資料總表</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", border: "1px solid var(--gray-5)", borderRadius: 4, background: "var(--color-background)", flex: "0 1 180px", minWidth: 100 }}>
          <Search size={11} color="var(--gray-8)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋..."
            style={{ border: "none", outline: "none", fontSize: 11, background: "transparent", color: "var(--gray-12)", width: "100%" }} />
        </div>

        <div style={{ position: "relative" }}>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
            style={{ appearance: "none", padding: "3px 20px 3px 7px", border: "1px solid var(--gray-5)", borderRadius: 4, fontSize: 11, color: "var(--gray-12)", background: "var(--color-background)", cursor: "pointer" }}>
            <option value="">分組: 無</option>
            <option value="client_name">依客戶</option>
            <option value="jurisdiction">依國家</option>
            <option value="status">依狀態</option>
            <option value="assignee_name">依承辦人</option>
            <option value="case_type">依類型</option>
          </select>
          <ChevronDown size={9} style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--gray-8)" }} />
        </div>

        <div style={{ position: "relative" }}>
          <Button variant="outline" color="gray" size="1" onClick={() => setShowColPicker(!showColPicker)}
            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
            <Columns3 size={10} /> {cols.length}/{ALL_COLS.length}
          </Button>
          {showColPicker && (
            <>
              <div onClick={() => setShowColPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
              <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 100, background: "var(--color-background)", border: "1px solid var(--gray-5)", borderRadius: 4, padding: "6px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 150 }}>
                {Object.keys(GROUP_LABELS).map(g => (
                  <div key={g}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: GROUP_COLORS[g], textTransform: "uppercase", letterSpacing: "0.06em", padding: "5px 10px 2px" }}>{GROUP_LABELS[g]}</div>
                    {ALL_COLS.filter(c => c.group === g).map(c => (
                      <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 10px", fontSize: 11, color: "var(--gray-12)", cursor: "pointer" }}>
                        <input type="checkbox" checked={visCols.has(c.key)} onChange={() => setVisCols(prev => { const n = new Set(prev); if (n.has(c.key)) n.delete(c.key); else n.add(c.key); return n; })} style={{ accentColor: GROUP_COLORS[g] }} />
                        {c.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dimension badges */}
        <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
          {Object.keys(GROUP_LABELS).map(g => {
            const n = cols.filter(c => c.group === g).length;
            if (!n) return null;
            return <Badge key={g} variant="soft" color="gray" style={{ fontSize: 9, fontWeight: 700, color: GROUP_COLORS[g] }}>{GROUP_LABELS[g]} {n}</Badge>;
          })}
        </div>

        <span style={{ fontSize: 10, color: "var(--gray-9)", marginLeft: "auto" }}>{filtered.length} 筆 -- 可點擊欄位直接編輯</span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--gray-5)", borderRadius: 4 }} onClick={() => { setFamilyPopover(null); }}>
        <div style={{ minWidth: totalW }}>

          {/* Header */}
          <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 10, background: "var(--gray-2)", borderBottom: "2px solid var(--gray-5)" }}>
            {cols.map(col => (
              <div key={col.key} onClick={() => toggleSort(col.key)} style={{
                width: col.w, flexShrink: 0, padding: "5px 8px",
                fontSize: 10, fontWeight: 600, color: sortKey === col.key ? "var(--gray-12)" : "var(--gray-9)",
                textTransform: "uppercase", letterSpacing: "0.04em",
                cursor: "pointer", userSelect: "none",
                display: "flex", alignItems: "center", gap: 2,
                justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
                borderRight: "1px solid var(--gray-5)",
                background: sortKey === col.key ? "var(--gray-3)" : "transparent",
                borderTop: `2px solid ${GROUP_COLORS[col.group]}`,
              }}>
                {col.label}
                {sortKey === col.key && (sortDir === "asc" ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
              </div>
            ))}
          </div>

          {/* Rows */}
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label && (
                <div style={{ padding: "3px 10px", background: "var(--gray-2)", borderBottom: "1px solid var(--gray-5)", fontSize: 11, fontWeight: 700, color: "var(--gray-12)", position: "sticky", top: 30, zIndex: 5 }}>
                  {groupBy === "status" ? STATUS_LABELS[g.label as CaseStatus] ?? g.label :
                   groupBy === "case_type" ? TYPE_LABELS[g.label as PatentCaseType] ?? g.label :
                   groupBy === "jurisdiction" ? `${FLAGS[g.label] ?? ""}${g.label}` : g.label}
                  <span style={{ fontWeight: 400, color: "var(--gray-9)", marginLeft: 6 }}>{g.rows.length}</span>
                </div>
              )}
              {g.rows.map(row => {
                const isExp = expandedId === row.id;
                const caseDls = MOCK_DEADLINES.filter(d => d.case_number === row.case_number && d.status !== "completed");
                const caseTodos = MOCK_TODOS.filter(t => t.case_number === row.case_number && t.status !== "done");
                return (
                <div key={row.id}>
                  <div className="table-row" onClick={() => setExpandedId(isExp ? null : row.id)} style={{
                    display: "flex", cursor: "pointer",
                    borderBottom: isExp ? "none" : "1px solid var(--gray-5)",
                    background: isExp ? "var(--gray-2)" : row.days_until !== null && row.days_until <= 7 && row.days_until >= 0 ? "var(--orange-2)" :
                                row.days_until !== null && row.days_until < 0 ? "var(--red-2)" : "var(--color-background)",
                  }}>
                    {cols.map(col => (
                      <div key={col.key} style={{
                        width: col.w, flexShrink: 0, padding: "3px 8px",
                        fontSize: 11, color: "var(--gray-12)",
                        display: "flex", alignItems: "center",
                        justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
                        borderRight: "1px solid var(--gray-5)",
                        overflow: "hidden", whiteSpace: "nowrap", lineHeight: "22px",
                      }}>
                        {renderCell(col, row)}
                      </div>
                    ))}
                  </div>

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ padding: "10px 16px", background: "var(--gray-2)", borderBottom: "1px solid var(--gray-5)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 11 }}>
                      {/* Col 1: Case info + links */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", marginBottom: 6 }}>案件資訊</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div><span style={{ color: "var(--gray-9)", marginRight: 6 }}>名稱</span>{row.title}</div>
                          <div><span style={{ color: "var(--gray-9)", marginRight: 6 }}>客戶</span>{row.client_name}</div>
                          <div><span style={{ color: "var(--gray-9)", marginRight: 6 }}>申請號</span><span style={{ fontFamily: "ui-monospace, monospace" }}>{row.app_number ?? "—"}</span></div>
                          <div><span style={{ color: "var(--gray-9)", marginRight: 6 }}>專利號</span><span style={{ fontFamily: "ui-monospace, monospace" }}>{row.patent_number ?? "—"}</span></div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                          <Button variant="outline" color="green" size="1" asChild>
                            <Link href="/app/cases" onClick={e => e.stopPropagation()} style={{ textDecoration: "none", fontSize: 10 }}>
                              查看案件
                            </Link>
                          </Button>
                          {row.pending_fee > 0 && (
                            <Button variant="outline" color="orange" size="1" asChild>
                              <Link href="/app/fees" onClick={e => e.stopPropagation()} style={{ textDecoration: "none", fontSize: 10 }}>
                                費用明細
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Col 2: Deadlines + Todos */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", marginBottom: 6 }}>期限 -- {caseDls.length} | 待辦 -- {caseTodos.length}</div>
                        {caseDls.length === 0 && caseTodos.length === 0 && <div style={{ color: "var(--gray-9)" }}>無待處理項目</div>}
                        {caseDls.slice(0, 3).map(d => {
                          const dd = Math.ceil((new Date(d.due_date).getTime() - Date.now()) / 86400000);
                          return (
                            <div key={d.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, fontSize: 10, color: dd <= 14 ? "var(--red-9)" : "var(--orange-9)", minWidth: 28, textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{dd}d</span>
                              <span style={{ color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</span>
                            </div>
                          );
                        })}
                        {caseTodos.slice(0, 2).map(t => (
                          <div key={t.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                            <span style={{ fontSize: 10, color: t.priority === "urgent" ? "var(--red-9)" : "var(--gray-8)", fontWeight: 600 }}>[ ]</span>
                            <span style={{ color: "var(--gray-12)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.action}</span>
                          </div>
                        ))}
                      </div>

                      {/* Col 3: Family */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", marginBottom: 6 }}>專利家族 -- {row.family.length || 1} 件</div>
                        {row.family.length <= 1 ? (
                          <div style={{ color: "var(--gray-9)" }}>無家族案件</div>
                        ) : (
                          row.family.map(f => (
                            <div key={f.case_number} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, padding: "2px 0" }}>
                              <span style={{ fontSize: 10 }}>{FLAGS[f.jurisdiction] ?? ""}</span>
                              <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: f.case_number === row.case_number ? 700 : 400, color: f.case_number === row.case_number ? "var(--green-9)" : "var(--gray-12)", fontSize: 10 }}>{f.case_number}</span>
                              <span style={{ fontSize: 10, color: "var(--gray-9)", marginLeft: "auto" }}>{f.status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

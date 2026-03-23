"use client";

import { useState } from "react";
import {
  Search, ChevronDown, ChevronRight, Clock, Calendar, User,
  Plus, X, Lightbulb, Wrench, Palette, Tag, Globe, Scale, FileText, Link,
} from "lucide-react";
import { Button, Badge, Dialog, TextField, Select, IconButton, Separator } from "@radix-ui/themes";
import {
  MOCK_CASES, MOCK_DEADLINES,
  STATUS_LABELS, STATUS_COLORS,
  TYPE_LABELS, DEADLINE_TYPE_LABELS,
  type PatentCaseType, type Jurisdiction, type CaseStatus,
} from "@/lib/mock-cases";
import { MOCK_TODOS } from "@/lib/mock-todo";

/* ── Case-type definitions for the create modal ── */
const CASE_TYPES: { key: string; label: string; icon: typeof Lightbulb; color: string; bg: string; subtitle?: string }[] = [
  { key: "invention",   label: "發明專利",       icon: Lightbulb, color: "#1d4ed8", bg: "#eff6ff" },
  { key: "utility",     label: "新型專利",       icon: Wrench,    color: "#0e7490", bg: "#ecfeff" },
  { key: "design",      label: "設計專利",       icon: Palette,   color: "#7c3aed", bg: "#f5f3ff" },
  { key: "trademark",   label: "商標",           icon: Tag,       color: "#9a3412", bg: "#fff7ed" },
  { key: "pct",         label: "PCT 國際出願",   icon: Globe,     color: "#0369a1", bg: "#f0f9ff", subtitle: "國際階段→各國移行" },
  { key: "hague",       label: "海牙意匠出願",   icon: Globe,     color: "#4338ca", bg: "#eef2ff", subtitle: "工業設計國際登錄" },
  { key: "madrid",      label: "馬德里商標出願", icon: Globe,     color: "#7e22ce", bg: "#faf5ff", subtitle: "商標國際註冊" },
  { key: "dispute",     label: "爭議案件",       icon: Scale,     color: "#b91c1c", bg: "#fef2f2", subtitle: "異議/審判/訴訟" },
  { key: "contract",    label: "契約管理",       icon: FileText,  color: "#4b5563", bg: "#f9fafb", subtitle: "授權/轉讓/NDA" },
];

/* ── Mock family data ── */
const MOCK_FAMILIES: Record<string, { id: string; case_number: string; jurisdiction: string; status: string; relation: string }[]> = {
  "TSMC23014": [
    { id: "f1", case_number: "TSMC23014TW", jurisdiction: "TW", status: "審查中", relation: "原始出願" },
    { id: "f2", case_number: "TSMC23014US", jurisdiction: "US", status: "已申請", relation: "巴黎優先" },
    { id: "f3", case_number: "TSMC23014CN", jurisdiction: "CN", status: "審查中", relation: "巴黎優先" },
    { id: "f4", case_number: "TSMC23014JP", jurisdiction: "JP", status: "OA發出", relation: "巴黎優先" },
  ],
  "MTKP24001": [
    { id: "f5", case_number: "MTKP24001TW", jurisdiction: "TW", status: "已獲證", relation: "原始出願" },
    { id: "f6", case_number: "MTKP24001US", jurisdiction: "US", status: "審查中", relation: "PCT移行" },
  ],
};

const JURISDICTION_FLAGS: Record<string, string> = {
  TW: "🇹🇼", US: "🇺🇸", CN: "🇨🇳", JP: "🇯🇵",
  EP: "🇪🇺", KR: "🇰🇷", DE: "🇩🇪", GB: "🇬🇧",
};

function StatusBadge({ status }: { status: CaseStatus }) {
  const colorMap: Record<CaseStatus, "orange" | "blue" | "green" | "grass" | "gray" | "red" | "amber"> = {
    pending_filing: "gray",
    filed: "gray",
    under_examination: "blue",
    oa_issued: "orange",
    oa_responded: "amber",
    allowed: "grass",
    granted: "green",
    rejected: "red",
    abandoned: "red",
    opposed: "orange",
    appealing: "amber",
  };
  return (
    <Badge variant="soft" color={colorMap[status] ?? "gray"} size="1" style={{ whiteSpace: "nowrap" }}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function TypeBadge({ type }: { type: PatentCaseType }) {
  const colorMap: Record<PatentCaseType, "blue" | "cyan" | "violet" | "orange" | "gray"> = {
    invention:     "blue",
    utility_model: "cyan",
    design:        "violet",
    trademark:     "orange",
    copyright:     "gray",
  };
  return (
    <Badge variant="soft" color={colorMap[type] ?? "gray"} size="1">
      {TYPE_LABELS[type]}
    </Badge>
  );
}

function daysUntil(iso?: string) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function CasesPage() {
  const [search, setSearch]     = useState("");
  const [typeFilter, setType]   = useState<PatentCaseType | "">("");
  const [juriFilter, setJuri]   = useState<Jurisdiction | "">("");
  const [statusFilter, setStatus] = useState<CaseStatus | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = MOCK_CASES.filter((c) => {
    if (typeFilter   && c.case_type    !== typeFilter)   return false;
    if (juriFilter   && c.jurisdiction !== juriFilter)   return false;
    if (statusFilter && c.status       !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.case_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        (c.app_number ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount  = MOCK_CASES.filter(c => !["granted","abandoned","rejected"].includes(c.status)).length;
  const grantedCount = MOCK_CASES.filter(c => c.status === "granted").length;
  const oaCount      = MOCK_CASES.filter(c => c.status === "oa_issued").length;

  return (
    <div className="page-pad" style={{ padding: "24px 28px", maxWidth: 1200 }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1100,
          background: "var(--gray-12)", color: "var(--gray-1)", padding: "10px 20px", borderRadius: 6,
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          animation: "fadeInDown 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* Create case modal */}
      <Dialog.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
        <Dialog.Content style={{ maxWidth: 560, padding: "28px 32px" }}>
          <Dialog.Title style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-12)", margin: "0 0 6px 0" }}>
            新建案件
          </Dialog.Title>
          <Dialog.Description style={{ fontSize: 13, color: "var(--gray-9)", margin: "0 0 20px 0" }}>
            選擇案件類型以開始建立新案件
          </Dialog.Description>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {CASE_TYPES.map((ct) => {
              const Icon = ct.icon;
              return (
                <button
                  key={ct.key}
                  onClick={() => {
                    setShowCreateModal(false);
                    setToast(`「${ct.label}」功能即將推出`);
                    setTimeout(() => setToast(null), 2200);
                  }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start",
                    padding: "14px 14px 12px", borderRadius: 6,
                    border: "1px solid var(--gray-6)", background: "var(--color-background)",
                    cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = ct.color; e.currentTarget.style.background = ct.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--gray-6)"; e.currentTarget.style.background = "var(--color-background)"; }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, background: ct.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
                  }}>
                    <Icon size={16} color={ct.color} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)" }}>{ct.label}</div>
                  {ct.subtitle && (
                    <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2, lineHeight: 1.3 }}>{ct.subtitle}</div>
                  )}
                </button>
              );
            })}
          </div>

          <Dialog.Close>
            <IconButton variant="ghost" color="gray" style={{ position: "absolute", top: 14, right: 14 }}>
              <X size={16} />
            </IconButton>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>

      {/* Header with create button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Button variant="solid" color="green" onClick={() => setShowCreateModal(true)} style={{ gap: 6, cursor: "pointer" }}>
          <Plus size={15} />
          新建案件
        </Button>
      </div>

      {/* Summary bar */}
      <div className="stat-row" style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden", background: "var(--color-background)" }}>
        {[
          { label: "進行中",    value: activeCount,       color: "var(--blue-11)" },
          { label: "OA 待答辯", value: oaCount,           color: "var(--orange-11)" },
          { label: "已獲證",    value: grantedCount,      color: "var(--green-11)" },
          { label: "總案件",    value: MOCK_CASES.length,  color: "var(--gray-12)" },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--gray-6)" : "none",
          }}>
            <div style={{ fontSize: 11, color: "var(--gray-9)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 14,
        padding: "10px 12px", background: "var(--gray-2)",
        border: "1px solid var(--gray-6)", borderRadius: 6,
        alignItems: "center", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <TextField.Root
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="搜尋案號、名稱、客戶..."
            size="2"
            style={{ width: "100%" }}
          >
            <TextField.Slot>
              <Search size={13} color="var(--gray-9)" />
            </TextField.Slot>
          </TextField.Root>
        </div>

        {/* Type filter */}
        <Select.Root value={typeFilter} onValueChange={(v) => setType(v as PatentCaseType | "")}>
          <Select.Trigger placeholder="所有類型" variant="surface" />
          <Select.Content>
            <Select.Item value="">所有類型</Select.Item>
            <Select.Item value="invention">發明專利</Select.Item>
            <Select.Item value="utility_model">新型專利</Select.Item>
            <Select.Item value="design">設計專利</Select.Item>
            <Select.Item value="trademark">商標</Select.Item>
            <Select.Item value="copyright">著作權</Select.Item>
          </Select.Content>
        </Select.Root>

        {/* Jurisdiction filter */}
        <Select.Root value={juriFilter} onValueChange={(v) => setJuri(v as Jurisdiction | "")}>
          <Select.Trigger placeholder="所有國家" variant="surface" />
          <Select.Content>
            <Select.Item value="">所有國家</Select.Item>
            <Select.Item value="TW">TW 台灣</Select.Item>
            <Select.Item value="US">US 美國</Select.Item>
            <Select.Item value="CN">CN 中國</Select.Item>
            <Select.Item value="JP">JP 日本</Select.Item>
            <Select.Item value="EP">EP 歐洲</Select.Item>
            <Select.Item value="KR">KR 韓國</Select.Item>
          </Select.Content>
        </Select.Root>

        {/* Status filter */}
        <Select.Root value={statusFilter} onValueChange={(v) => setStatus(v as CaseStatus | "")}>
          <Select.Trigger placeholder="所有狀態" variant="surface" />
          <Select.Content>
            <Select.Item value="">所有狀態</Select.Item>
            <Select.Item value="oa_issued">OA 發出</Select.Item>
            <Select.Item value="under_examination">審查中</Select.Item>
            <Select.Item value="granted">已獲證</Select.Item>
            <Select.Item value="allowed">核准中</Select.Item>
            <Select.Item value="filed">已申請</Select.Item>
            <Select.Item value="abandoned">已放棄</Select.Item>
          </Select.Content>
        </Select.Root>

        <span style={{ fontSize: 12, color: "var(--gray-9)", marginLeft: "auto" }}>{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
        {/* Header */}
        <div className="case-header" style={{
          display: "grid",
          gridTemplateColumns: "24px 160px 1fr 100px 90px 80px 130px 120px 100px",
          padding: "7px 16px",
          background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
          fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
          letterSpacing: "0.04em", textTransform: "uppercase", gap: 10,
        }}>
          <div></div>
          <div>案號</div>
          <div>案件名稱</div>
          <div className="col-hide-m">客戶</div>
          <div className="col-hide-m">類型</div>
          <div className="col-hide-m">國家</div>
          <div>狀態</div>
          <div>下一截止</div>
          <div className="col-hide-m">承辦人</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
            沒有符合條件的案件
          </div>
        ) : (
          filtered.map((c, i) => {
            const days = daysUntil(c.next_deadline);
            const deadlineColor = days === null ? "var(--gray-9)" : days < 0 ? "var(--red-11)" : days <= 14 ? "var(--red-11)" : days <= 30 ? "var(--orange-11)" : "var(--gray-11)";
            const isExpanded = expandedId === c.id;
            const caseDeadlines = MOCK_DEADLINES.filter(d => d.case_number === c.case_number);
            const caseTodos = MOCK_TODOS.filter(t => t.case_number === c.case_number);
            return (
              <div key={c.id}>
                <div
                  className="table-row case-row"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 160px 1fr 100px 90px 80px 130px 120px 100px",
                    padding: "11px 16px",
                    borderBottom: (!isExpanded && i < filtered.length - 1) ? "1px solid var(--gray-6)" : isExpanded ? "none" : "none",
                    alignItems: "center", gap: 10,
                    background: "var(--color-background)",
                    cursor: "pointer",
                  }}
                >
                  {/* Chevron */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight size={14} style={{
                      color: "var(--gray-9)",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.12s",
                    }} />
                  </div>

                  {/* Case number */}
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--gray-12)", letterSpacing: 0.3 }}>
                    {c.case_number}
                  </div>

                  {/* Title */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </div>
                    {c.app_number && (
                      <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>
                        {c.app_number}
                      </div>
                    )}
                  </div>

                  {/* Client */}
                  <div className="col-hide-m" style={{ fontSize: 12, color: "var(--gray-11)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.client_name}
                  </div>

                  {/* Type */}
                  <div className="col-hide-m"><TypeBadge type={c.case_type} /></div>

                  {/* Jurisdiction */}
                  <div className="col-hide-m" style={{ fontSize: 12, color: "var(--gray-11)" }}>
                    <span style={{ marginRight: 4 }}>{JURISDICTION_FLAGS[c.jurisdiction] ?? ""}</span>
                    {c.jurisdiction}
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={c.status} /></div>

                  {/* Deadline */}
                  <div>
                    {c.next_deadline ? (
                      <div>
                        <div style={{ fontSize: 11, color: deadlineColor, fontWeight: days !== null && days <= 30 ? 600 : 400 }}>
                          {new Date(c.next_deadline).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                          {days !== null && days <= 30 && (
                            <span style={{ marginLeft: 4, fontSize: 10 }}>
                              ({days < 0 ? `逾期${Math.abs(days)}d` : `${days}d`})
                            </span>
                          )}
                        </div>
                        {c.next_action && (
                          <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.next_action}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "var(--gray-9)", fontSize: 12 }}>—</span>
                    )}
                  </div>

                  {/* Assignee */}
                  <div className="col-hide-m" style={{ fontSize: 12, color: "var(--gray-11)" }}>
                    {c.assignee_name}
                  </div>
                </div>

                {/* Expansion panel */}
                {isExpanded && (
                  <div style={{
                    background: "var(--gray-2)",
                    borderBottom: "1px solid var(--gray-6)",
                    padding: "14px 16px 14px 40px",
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                      {/* 案件詳情 */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <User size={13} color="var(--gray-9)" />
                          案件詳情
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {[
                            { label: "申請號", value: c.app_number },
                            { label: "專利號", value: c.patent_number },
                            { label: "申請日", value: c.filing_date },
                            { label: "客戶", value: c.client_name },
                            { label: "承辦人", value: c.assignee_name },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ display: "flex", fontSize: 12, gap: 6 }}>
                              <span style={{ color: "var(--gray-9)", minWidth: 50, flexShrink: 0 }}>{label}</span>
                              <span style={{ color: "var(--gray-12)", fontWeight: 450 }}>{value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 相關期限 */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={13} color="var(--gray-9)" />
                          相關期限
                        </div>
                        {caseDeadlines.length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--gray-9)" }}>無相關期限</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {caseDeadlines.map(d => {
                              const dDays = daysUntil(d.due_date);
                              const dColor = dDays === null ? "var(--gray-9)" : dDays < 0 ? "var(--red-11)" : dDays <= 14 ? "var(--red-11)" : dDays <= 30 ? "var(--orange-11)" : "var(--gray-11)";
                              return (
                                <div key={d.id} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--gray-6)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ color: "var(--gray-12)", fontWeight: 450 }}>{d.description}</span>
                                    <Badge variant="soft" color={d.status === "completed" ? "green" : d.status === "extended" ? "orange" : "gray"} size="1">
                                      {d.status === "completed" ? "已完成" : d.status === "extended" ? "已延展" : "待處理"}
                                    </Badge>
                                  </div>
                                  <div style={{ fontSize: 11, color: dColor, marginTop: 2 }}>
                                    {d.due_date}
                                    {dDays !== null && (
                                      <span style={{ marginLeft: 6 }}>
                                        ({dDays < 0 ? `逾期 ${Math.abs(dDays)} 天` : `${dDays} 天後`})
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--gray-9)", marginTop: 1 }}>
                                    {DEADLINE_TYPE_LABELS[d.type]}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 相關待辦 */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          <Clock size={13} color="var(--gray-9)" />
                          相關待辦
                        </div>
                        {caseTodos.length === 0 ? (
                          <div style={{ fontSize: 12, color: "var(--gray-9)" }}>無相關待辦</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {caseTodos.map(t => (
                              <div key={t.id} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid var(--gray-6)" }}>
                                <div style={{ color: "var(--gray-12)", fontWeight: 450 }}>{t.action}</div>
                                <div style={{ display: "flex", gap: 8, marginTop: 2, fontSize: 11 }}>
                                  <Badge variant="soft" color={t.priority === "urgent" ? "red" : t.priority === "normal" ? "orange" : "gray"} size="1">
                                    {t.priority === "urgent" ? "緊急" : t.priority === "normal" ? "一般" : "低"}
                                  </Badge>
                                  {t.deadline && (
                                    <span style={{ color: "var(--gray-9)" }}>截止 {t.deadline}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 家族案件 */}
                    {(() => {
                      const familyKey = Object.keys(MOCK_FAMILIES).find(k => c.case_number.startsWith(k));
                      const familyMembers = familyKey ? MOCK_FAMILIES[familyKey] : null;
                      if (!familyMembers || familyMembers.length === 0) return null;

                      return (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--gray-6)" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gray-12)", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                            <Link size={13} color="var(--gray-9)" />
                            家族案件
                            <span style={{ fontSize: 10, fontWeight: 500, color: "var(--gray-9)", marginLeft: 4 }}>
                              ({familyMembers.length} 件)
                            </span>
                          </div>

                          {/* Horizontal connected node graph */}
                          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
                            {familyMembers.map((fm, idx) => {
                              const isCurrentCase = c.case_number === fm.case_number || c.case_number.startsWith(fm.case_number.replace(/[A-Z]{2}$/, ""));
                              const flag = JURISDICTION_FLAGS[fm.jurisdiction] ?? "";
                              return (
                                <div key={fm.id} style={{ display: "flex", alignItems: "center" }}>
                                  {/* Connector line */}
                                  {idx > 0 && (
                                    <div style={{
                                      width: 28, height: 2, background: "var(--gray-6)",
                                      position: "relative", flexShrink: 0,
                                    }}>
                                      <div style={{
                                        position: "absolute", right: -1, top: -3, width: 0, height: 0,
                                        borderLeft: "5px solid var(--gray-6)", borderTop: "4px solid transparent",
                                        borderBottom: "4px solid transparent",
                                      }} />
                                    </div>
                                  )}
                                  {/* Node card */}
                                  <div style={{
                                    border: `1.5px solid ${isCurrentCase ? "var(--blue-9)" : "var(--gray-6)"}`,
                                    borderRadius: 6, padding: "10px 14px", minWidth: 120,
                                    background: isCurrentCase ? "var(--blue-2)" : "var(--color-background)",
                                    textAlign: "center", flexShrink: 0,
                                  }}>
                                    <div style={{ fontSize: 18, marginBottom: 2 }}>{flag}</div>
                                    <div style={{
                                      fontSize: 11, fontWeight: 700, color: "var(--gray-12)",
                                      fontFamily: "ui-monospace, monospace", letterSpacing: 0.3,
                                    }}>
                                      {fm.case_number}
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                      <Badge variant="soft" color={
                                        fm.status === "已獲證" ? "green"
                                        : fm.status === "OA發出" ? "orange"
                                        : fm.status === "審查中" ? "blue"
                                        : "gray"
                                      } size="1">
                                        {fm.status}
                                      </Badge>
                                    </div>
                                    <div style={{ fontSize: 9, color: "var(--gray-9)", marginTop: 3 }}>
                                      {fm.relation}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

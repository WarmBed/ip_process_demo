"use client";

import { useState } from "react";
import { Badge, Button, Select, TextField } from "@radix-ui/themes";
import { DollarSign, Search, ChevronDown, ChevronRight, Calendar, FileText } from "lucide-react";
import { MOCK_CASES } from "@/lib/mock-cases";

// ── Types & Constants ─────────────────────────────────────────

type FeeType = "official" | "attorney" | "translation" | "annuity" | "search" | "other";
type FeeStatus = "unpaid" | "invoiced" | "paid" | "overdue";

interface FeeEntry {
  id: string;
  case_number: string;
  client_name: string;
  fee_type: FeeType;
  description: string;
  amount: number;
  currency: "TWD" | "USD" | "JPY";
  status: FeeStatus;
  due_date: string;
  paid_date?: string;
  invoice_number?: string;
}

const FEE_TYPE_LABELS: Record<FeeType, string> = {
  official: "官費",
  attorney: "代理費",
  translation: "翻譯費",
  annuity: "年費",
  search: "檢索費",
  other: "其他",
};

const FEE_STATUS_COLOR: Record<FeeStatus, { label: string; color: "gray" | "blue" | "green" | "red" }> = {
  unpaid:   { label: "未付款", color: "gray" },
  invoiced: { label: "已開票", color: "blue" },
  paid:     { label: "已收款", color: "green" },
  overdue:  { label: "逾期",   color: "red" },
};

const FEE_TYPE_BADGE_COLOR: Record<FeeType, "blue" | "purple" | "teal" | "green" | "orange" | "gray"> = {
  official:    "blue",
  attorney:    "purple",
  translation: "teal",
  annuity:     "green",
  search:      "orange",
  other:       "gray",
};

// ── Mock Fee Data ─────────────────────────────────────────────

const MOCK_FEES: FeeEntry[] = [
  {
    id: "f001",
    case_number: "TSMC23014PUS",
    client_name: "台積電",
    fee_type: "official",
    description: "USPTO 申請規費",
    amount: 125000,
    currency: "TWD",
    status: "paid",
    due_date: "2025-12-20",
    paid_date: "2025-12-15",
    invoice_number: "INV-2025-0341",
  },
  {
    id: "f002",
    case_number: "TSMC23014PUS",
    client_name: "台積電",
    fee_type: "attorney",
    description: "OA 答辯代理費",
    amount: 85000,
    currency: "TWD",
    status: "invoiced",
    due_date: "2026-04-15",
    invoice_number: "INV-2026-0087",
  },
  {
    id: "f003",
    case_number: "MTKE23005PUS",
    client_name: "聯發科技",
    fee_type: "attorney",
    description: "OA 答辯代理費（Final）",
    amount: 95000,
    currency: "TWD",
    status: "overdue",
    due_date: "2026-03-10",
  },
  {
    id: "f004",
    case_number: "MTKE22009PTW",
    client_name: "聯發科技",
    fee_type: "annuity",
    description: "年費第4年（TW）",
    amount: 8000,
    currency: "TWD",
    status: "unpaid",
    due_date: "2026-04-18",
  },
  {
    id: "f005",
    case_number: "TSMC22001PTW",
    client_name: "台積電",
    fee_type: "annuity",
    description: "年費第5年（TW）",
    amount: 10000,
    currency: "TWD",
    status: "unpaid",
    due_date: "2027-11-15",
  },
  {
    id: "f006",
    case_number: "FOXC22018PUS",
    client_name: "鴻海精密",
    fee_type: "annuity",
    description: "3.5 年維護費（US Maintenance Fee）",
    amount: 2000,
    currency: "USD",
    status: "unpaid",
    due_date: "2026-08-24",
  },
  {
    id: "f007",
    case_number: "EPPA23801EP",
    client_name: "European Client C",
    fee_type: "official",
    description: "EPO Rule 71(3) 核准規費",
    amount: 52000,
    currency: "TWD",
    status: "invoiced",
    due_date: "2026-04-30",
    invoice_number: "INV-2026-0092",
  },
  {
    id: "f008",
    case_number: "EPPA23801EP",
    client_name: "European Client C",
    fee_type: "translation",
    description: "歐洲核准後翻譯費（EN/DE/FR）",
    amount: 180000,
    currency: "TWD",
    status: "unpaid",
    due_date: "2026-05-15",
  },
  {
    id: "f009",
    case_number: "ADTA23003PTW",
    client_name: "威剛科技",
    fee_type: "search",
    description: "前案檢索費",
    amount: 25000,
    currency: "TWD",
    status: "paid",
    due_date: "2025-10-01",
    paid_date: "2025-09-28",
    invoice_number: "INV-2025-0298",
  },
  {
    id: "f010",
    case_number: "ZMHG24001PTW",
    client_name: "張明宏",
    fee_type: "official",
    description: "TIPO 申請規費",
    amount: 8500,
    currency: "TWD",
    status: "paid",
    due_date: "2024-08-10",
    paid_date: "2024-08-05",
    invoice_number: "INV-2024-0215",
  },
  {
    id: "f011",
    case_number: "ZMHG24001PTW",
    client_name: "張明宏",
    fee_type: "attorney",
    description: "申請書撰寫代理費",
    amount: 45000,
    currency: "TWD",
    status: "paid",
    due_date: "2024-09-01",
    paid_date: "2024-09-10",
    invoice_number: "INV-2024-0228",
  },
  {
    id: "f012",
    case_number: "KOIT20004TUS",
    client_name: "韓國代理 / KOIT",
    fee_type: "attorney",
    description: "OA2 答辯代理費",
    amount: 3200,
    currency: "USD",
    status: "overdue",
    due_date: "2026-02-28",
  },
  {
    id: "f013",
    case_number: "MTKE24002PEP",
    client_name: "聯發科技",
    fee_type: "official",
    description: "EPO Request for Examination 規費",
    amount: 48000,
    currency: "TWD",
    status: "unpaid",
    due_date: "2026-08-28",
  },
];

// ── Helpers ───────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  if (currency === "TWD") return `NT$${amount.toLocaleString()}`;
  if (currency === "USD") return `US$${amount.toLocaleString()}`;
  if (currency === "JPY") return `\u00a5${amount.toLocaleString()}`;
  return `${amount.toLocaleString()}`;
}

function StatusBadge({ status }: { status: FeeStatus }) {
  const c = FEE_STATUS_COLOR[status];
  return (
    <Badge variant="soft" color={c.color} size="1">
      {c.label}
    </Badge>
  );
}

function TypeBadge({ type }: { type: FeeType }) {
  return (
    <Badge variant="soft" color={FEE_TYPE_BADGE_COLOR[type]} size="1" style={{ fontSize: 10 }}>
      {FEE_TYPE_LABELS[type]}
    </Badge>
  );
}

// ── Page Component ────────────────────────────────────────────

export default function FeesPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setType] = useState<FeeType | "">("");
  const [statusFilter, setStatus] = useState<FeeStatus | "">("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = MOCK_FEES.filter((f) => {
    if (typeFilter && f.fee_type !== typeFilter) return false;
    if (statusFilter && f.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.case_number.toLowerCase().includes(q) ||
        f.client_name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.invoice_number ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats (TWD-equivalent, rough conversion for display)
  const toTWD = (f: FeeEntry) =>
    f.currency === "USD" ? f.amount * 32 : f.currency === "JPY" ? f.amount * 0.22 : f.amount;

  const unpaidTotal = MOCK_FEES.filter(f => f.status === "unpaid").reduce((s, f) => s + toTWD(f), 0);
  const invoicedTotal = MOCK_FEES.filter(f => f.status === "invoiced").reduce((s, f) => s + toTWD(f), 0);
  const paidTotal = MOCK_FEES.filter(f => f.status === "paid").reduce((s, f) => s + toTWD(f), 0);
  const overdueTotal = MOCK_FEES.filter(f => f.status === "overdue").reduce((s, f) => s + toTWD(f), 0);

  return (
    <div className="page-pad" style={{ padding: "24px 28px", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <DollarSign size={18} color="var(--gray-12)" />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--gray-12)", margin: 0 }}>費用管理</h1>
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-9)" }}>
          共 {MOCK_FEES.length} 筆費用紀錄，總金額約 NT${Math.round(unpaidTotal + invoicedTotal + paidTotal + overdueTotal).toLocaleString()}
        </div>
      </div>

      {/* Summary bar */}
      <div className="stat-row" style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden", background: "var(--color-background)" }}>
        {[
          { label: "未付款總額", value: `NT$${Math.round(unpaidTotal).toLocaleString()}`, color: "var(--gray-11)" },
          { label: "已開票",     value: `NT$${Math.round(invoicedTotal).toLocaleString()}`, color: "var(--blue-9)" },
          { label: "已收款",     value: `NT$${Math.round(paidTotal).toLocaleString()}`,     color: "var(--green-9)" },
          { label: "逾期",       value: `NT$${Math.round(overdueTotal).toLocaleString()}`,  color: "var(--red-9)" },
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

      {/* Billing Workflow Pipeline */}
      <div style={{
        marginBottom: 16, padding: "14px 20px",
        border: "1px solid var(--gray-6)", borderRadius: 8,
        background: "var(--color-background)",
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          請求流程
        </div>
        <div className="pipeline-row" style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { stage: "料金表設定", count: "3 套料金表", active: true },
            { stage: "請求書建立", count: "5 待建立", active: true },
            { stage: "請求書發行", count: "3 待發行", active: true },
            { stage: "入金確認", count: "2 待確認", active: true },
            { stage: "送金處理", count: "1 待送金", active: true },
          ].map((item, i, arr) => (
            <div key={item.stage} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                padding: "8px 16px",
                border: "1px solid var(--gray-6)",
                borderLeft: item.active ? "3px solid var(--green-9)" : "1px solid var(--gray-6)",
                borderRadius: 6,
                background: "var(--color-background)",
                minWidth: 110,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                  {item.stage}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: item.active ? "var(--green-11)" : "var(--gray-11)", cursor: item.active ? "pointer" : "default" }}>
                  {item.count}
                </div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ padding: "0 6px", color: "var(--gray-9)", fontSize: 14, fontWeight: 300 }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Exchange Rates */}
      <div style={{
        marginBottom: 14, padding: "8px 16px",
        background: "var(--gray-2)", border: "1px solid var(--gray-6)", borderRadius: 6,
        fontSize: 12, color: "var(--gray-11)",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontWeight: 600, fontSize: 10, color: "var(--gray-9)", textTransform: "uppercase", letterSpacing: "0.05em" }}>匯率</span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>USD/TWD: <strong style={{ color: "var(--gray-12)" }}>32.15</strong></span>
        <span style={{ color: "var(--gray-6)" }}>|</span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>JPY/TWD: <strong style={{ color: "var(--gray-12)" }}>0.213</strong></span>
        <span style={{ color: "var(--gray-6)" }}>|</span>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>EUR/TWD: <strong style={{ color: "var(--gray-12)" }}>34.82</strong></span>
        <span style={{ color: "var(--gray-6)" }}>|</span>
        <span style={{ fontSize: 11, color: "var(--gray-9)" }}>更新: 2026-03-20</span>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 14,
        padding: "10px 12px", background: "var(--gray-2)",
        border: "1px solid var(--gray-6)", borderRadius: 8,
        alignItems: "center", flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <TextField.Root
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋案號、客戶、說明、發票號..."
            size="2"
          >
            <TextField.Slot>
              <Search size={13} color="var(--gray-9)" />
            </TextField.Slot>
          </TextField.Root>
        </div>

        {/* Type filter */}
        <Select.Root value={typeFilter} onValueChange={(v) => setType(v as FeeType | "")}>
          <Select.Trigger placeholder="所有類型" variant="surface" style={{ minWidth: 100 }} />
          <Select.Content>
            <Select.Item value="">所有類型</Select.Item>
            <Select.Item value="official">官費</Select.Item>
            <Select.Item value="attorney">代理費</Select.Item>
            <Select.Item value="translation">翻譯費</Select.Item>
            <Select.Item value="annuity">年費</Select.Item>
            <Select.Item value="search">檢索費</Select.Item>
            <Select.Item value="other">其他</Select.Item>
          </Select.Content>
        </Select.Root>

        {/* Status filter */}
        <Select.Root value={statusFilter} onValueChange={(v) => setStatus(v as FeeStatus | "")}>
          <Select.Trigger placeholder="所有狀態" variant="surface" style={{ minWidth: 100 }} />
          <Select.Content>
            <Select.Item value="">所有狀態</Select.Item>
            <Select.Item value="unpaid">未付款</Select.Item>
            <Select.Item value="invoiced">已開票</Select.Item>
            <Select.Item value="paid">已收款</Select.Item>
            <Select.Item value="overdue">逾期</Select.Item>
          </Select.Content>
        </Select.Root>

        <span style={{ fontSize: 12, color: "var(--gray-9)", marginLeft: "auto" }}>{filtered.length} 筆</span>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
        {/* Header */}
        <div className="fee-header" style={{
          display: "grid",
          gridTemplateColumns: "28px 130px 1fr 90px 80px 100px 80px 90px 110px",
          padding: "7px 16px",
          background: "var(--gray-2)", borderBottom: "1px solid var(--gray-6)",
          fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
          letterSpacing: "0.04em", textTransform: "uppercase", gap: 10,
        }}>
          <div></div>
          <div>案號</div>
          <div>說明</div>
          <div className="col-hide-m">客戶</div>
          <div className="col-hide-m">類型</div>
          <div>金額</div>
          <div>狀態</div>
          <div className="col-hide-m">到期日</div>
          <div className="col-hide-m">發票號</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
            沒有符合條件的費用紀錄
          </div>
        ) : (
          filtered.map((f, i) => {
            const isExpanded = expandedId === f.id;
            const linkedCase = MOCK_CASES.find(c => c.case_number === f.case_number);
            return (
              <div key={f.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  className="table-row fee-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "28px 130px 1fr 90px 80px 100px 80px 90px 110px",
                    padding: "11px 16px",
                    borderBottom: (i < filtered.length - 1 || isExpanded) ? "1px solid var(--gray-6)" : "none",
                    alignItems: "center", gap: 10,
                    background: "var(--color-background)",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                >
                  {/* Expand icon */}
                  <div style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}>
                    {isExpanded
                      ? <ChevronDown size={14} />
                      : <ChevronRight size={14} />
                    }
                  </div>

                  {/* Case number */}
                  <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 600, color: "var(--gray-12)", letterSpacing: 0.3 }}>
                    {f.case_number}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize: 13, color: "var(--gray-12)", fontWeight: 450, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.description}
                  </div>

                  {/* Client */}
                  <div className="col-hide-m" style={{ fontSize: 12, color: "var(--gray-11)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.client_name}
                  </div>

                  {/* Type */}
                  <div className="col-hide-m"><TypeBadge type={f.fee_type} /></div>

                  {/* Amount */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-12)", fontFamily: "ui-monospace, monospace", textAlign: "right" }}>
                    {formatAmount(f.amount, f.currency)}
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={f.status} /></div>

                  {/* Due date */}
                  <div className="col-hide-m" style={{ fontSize: 11, color: "var(--gray-11)" }}>
                    <Calendar size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                    {new Date(f.due_date).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                  </div>

                  {/* Invoice number */}
                  <div className="col-hide-m" style={{ fontSize: 11, color: "var(--gray-9)", fontFamily: "ui-monospace, monospace" }}>
                    {f.invoice_number ? (
                      <span>
                        <FileText size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                        {f.invoice_number}
                      </span>
                    ) : (
                      <span style={{ color: "var(--gray-9)" }}>--</span>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && linkedCase && (
                  <div style={{
                    padding: "12px 16px 12px 54px",
                    background: "var(--gray-2)",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--gray-6)" : "none",
                    fontSize: 12,
                    color: "var(--gray-11)",
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 24px", marginBottom: (f.status === "invoiced" || f.status === "paid" || f.currency !== "TWD") ? 10 : 0 }}>
                      <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>案件名稱：</span>{linkedCase.title}</div>
                      <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>申請號：</span>{linkedCase.app_number ?? "--"}</div>
                      <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>承辦人：</span>{linkedCase.assignee_name}</div>
                      <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>案件狀態：</span>{linkedCase.status}</div>
                      <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>管轄地：</span>{linkedCase.jurisdiction}</div>
                      {f.paid_date && (
                        <div><span style={{ color: "var(--gray-9)", fontWeight: 600 }}>付款日：</span>{new Date(f.paid_date).toLocaleDateString("zh-TW")}</div>
                      )}
                    </div>

                    {/* Invoice & payment details for invoiced/paid items */}
                    {(f.status === "invoiced" || f.status === "paid") && f.invoice_number && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "8px 12px", marginBottom: 6,
                        background: "var(--color-background)", border: "1px solid var(--gray-6)", borderRadius: 6,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FileText size={13} color="var(--blue-9)" />
                          <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 700, color: "var(--blue-9)" }}>{f.invoice_number}</span>
                        </div>
                        {f.status === "paid" && f.paid_date && (
                          <div style={{ fontSize: 11, color: "var(--green-9)", fontWeight: 600 }}>
                            已收款 {new Date(f.paid_date).toLocaleDateString("zh-TW")}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          color="gray"
                          size="1"
                          onClick={(e) => e.stopPropagation()}
                          style={{ marginLeft: "auto", cursor: "pointer" }}
                        >
                          請求書預覽
                        </Button>
                      </div>
                    )}

                    {/* Remittance details for foreign currency items */}
                    {f.currency !== "TWD" && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "6px 12px",
                        background: "var(--color-background)", border: "1px solid var(--gray-6)", borderRadius: 6,
                        fontSize: 11, color: "var(--gray-11)",
                      }}>
                        <span style={{ fontWeight: 600, color: "var(--gray-9)" }}>送金明細</span>
                        <span style={{ fontFamily: "ui-monospace, monospace" }}>
                          {f.currency === "USD" ? "US$" : "\u00a5"}{f.amount.toLocaleString()} {f.currency}
                        </span>
                        <span style={{ color: "var(--gray-6)" }}>|</span>
                        <span style={{ fontFamily: "ui-monospace, monospace" }}>
                          TWD 換算 ≈ NT${Math.round(toTWD(f)).toLocaleString()}
                        </span>
                        <span style={{ color: "var(--gray-6)" }}>|</span>
                        <span>適用匯率 {f.currency === "USD" ? "32.15" : "0.213"}</span>
                      </div>
                    )}
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

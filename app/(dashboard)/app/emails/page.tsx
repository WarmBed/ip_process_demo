"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Filter, RefreshCw, Paperclip } from "lucide-react";
import { Button, Badge, Select, TextField } from "@radix-ui/themes";
import { Loading } from "@/components/loading";
import type { EmailListItem, ClassificationStatus, ApiResponse } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending:   "待確認",
  confirmed: "已確認",
  corrected: "已修正",
  failed:    "失敗",
};

const CODE_COLORS: Record<string, string> = {
  FA: "#1e40af", FC: "#166534", TA: "#7c3aed", TC: "#92400e",
  FG: "#0e7490", TG: "#0f766e", FX: "#57534e", TX: "#57534e",
};

function DirectionBadge({ code }: { code: string | null }) {
  if (!code) return <span style={{ color: "var(--gray-9)", fontSize: 12 }}>—</span>;
  const color = CODE_COLORS[code] ?? "#57534e";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: color + "15", color, border: `1px solid ${color}30`,
    }}>
      {code}
    </span>
  );
}

function StatusBadge({ status }: { status: ClassificationStatus | null }) {
  if (!status) return null;
  const colorMap: Record<string, "orange" | "green" | "blue" | "red"> = {
    pending: "orange",
    confirmed: "green",
    corrected: "blue",
    failed: "red",
  };
  return (
    <Badge variant="soft" color={colorMap[status] ?? "gray"} size="1">
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return <span style={{ color: "var(--gray-9)", fontSize: 12 }}>—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? "var(--green-9)" : pct >= 70 ? "var(--amber-9)" : "var(--red-9)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--gray-4)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--gray-11)", minWidth: 26 }}>{pct}%</span>
    </div>
  );
}

export default function EmailsPage() {
  const [emails, setEmails]   = useState<EmailListItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState<ClassificationStatus | "">("");
  const [page, setPage]       = useState(1);
  const limit = 20;

  const fetchEmails = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    const res  = await fetch(`/api/v1/emails?${params}`);
    const json: ApiResponse<EmailListItem[]> = await res.json();
    setEmails(json.data);
    setTotal(json.meta?.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { fetchEmails(); }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEmails();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 10, marginBottom: 16,
        padding: "10px 14px", border: "1px solid var(--gray-6)",
        borderRadius: 6, background: "var(--gray-2)", alignItems: "center",
      }}>
        <Button variant="outline" color="gray" onClick={fetchEmails} style={{ gap: 6, flexShrink: 0, cursor: "pointer" }}>
          <RefreshCw size={13} />
          重新整理
        </Button>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, display: "flex", gap: 6 }}>
          <div style={{ flex: 1 }}>
            <TextField.Root
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="搜尋主旨、sender、案號..."
              size="2"
              style={{ width: "100%" }}
            >
              <TextField.Slot>
                <Search size={13} color="var(--gray-9)" />
              </TextField.Slot>
            </TextField.Root>
          </div>
          <Button type="submit" variant="outline" color="gray" style={{ height: 32, cursor: "pointer" }}>搜尋</Button>
        </form>

        {/* Status filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Filter size={13} color="var(--gray-9)" />
          <Select.Root value={status} onValueChange={(v) => { setStatus(v as ClassificationStatus | ""); setPage(1); }}>
            <Select.Trigger placeholder="所有狀態" variant="surface" />
            <Select.Content>
              <Select.Item value="">所有狀態</Select.Item>
              <Select.Item value="pending">待確認</Select.Item>
              <Select.Item value="confirmed">已確認</Select.Item>
              <Select.Item value="corrected">已修正</Select.Item>
              <Select.Item value="failed">失敗</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--gray-6)", borderRadius: 6, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr 80px 160px 90px 80px 32px",
          padding: "8px 14px",
          background: "var(--gray-2)",
          borderBottom: "1px solid var(--gray-6)",
          fontSize: 11, fontWeight: 600, color: "var(--gray-9)",
          letterSpacing: "0.04em", textTransform: "uppercase",
          gap: 12,
        }}>
          <div>日期</div>
          <div>主旨 / Sender</div>
          <div>收發碼</div>
          <div>案號</div>
          <div>狀態</div>
          <div>信心</div>
          <div />
        </div>

        {/* Rows */}
        {loading ? (
          <Loading />
        ) : emails.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-9)", fontSize: 13 }}>
            沒有找到符合條件的信件
          </div>
        ) : (
          emails.map((email, i) => (
            <Link
              key={email.id}
              href={`/app/emails/${email.id}`}
              className="table-row"
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 80px 160px 90px 80px 32px",
                padding: "10px 14px",
                borderBottom: i < emails.length - 1 ? "1px solid var(--gray-6)" : "none",
                textDecoration: "none",
                alignItems: "center",
                gap: 12,
                background: "var(--color-background)",
              }}
            >
              {/* Date */}
              <div style={{ fontSize: 12, color: "var(--gray-11)" }}>
                {new Date(email.received_at).toLocaleString("zh-TW", {
                  month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>

              {/* Subject + sender */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: "var(--gray-12)", fontWeight: 450,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  {email.subject}
                  {email.has_attachments && <Paperclip size={11} color="var(--gray-9)" />}
                </div>
                <div style={{ fontSize: 11, color: "var(--gray-9)", marginTop: 2 }}>
                  {email.sender_name} &lt;{email.sender_email}&gt;
                </div>
              </div>

              {/* Direction code */}
              <div><DirectionBadge code={email.direction_code} /></div>

              {/* Case numbers */}
              <div style={{ fontSize: 11, color: "var(--gray-11)", display: "flex", flexWrap: "wrap", gap: 3 }}>
                {email.case_numbers.length === 0 ? (
                  <span style={{ color: "var(--gray-9)" }}>—</span>
                ) : (
                  email.case_numbers.slice(0, 2).map((c) => (
                    <span key={c} style={{
                      padding: "1px 5px", borderRadius: 3, fontSize: 10,
                      background: "var(--gray-3)", border: "1px solid var(--gray-6)",
                      fontFamily: "ui-monospace, monospace",
                    }}>{c}</span>
                  ))
                )}
                {email.case_numbers.length > 2 && (
                  <span style={{ color: "var(--gray-9)", fontSize: 10 }}>+{email.case_numbers.length - 2}</span>
                )}
              </div>

              {/* Status */}
              <div><StatusBadge status={email.status} /></div>

              {/* Confidence */}
              <div><ConfidenceBar value={email.confidence} /></div>

              {/* Arrow */}
              <div style={{ color: "var(--gray-9)", fontSize: 12 }}>›</div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span style={{ fontSize: 12, color: "var(--gray-9)" }}>
            第 {page} / {totalPages} 頁，共 {total} 筆
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="outline" color="gray" disabled={page === 1}
              onClick={() => setPage((p) => p - 1)} size="1" style={{ cursor: page === 1 ? "not-allowed" : "pointer" }}>
              上一頁
            </Button>
            <Button variant="outline" color="gray" disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)} size="1" style={{ cursor: page === totalPages ? "not-allowed" : "pointer" }}>
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

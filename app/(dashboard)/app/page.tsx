"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, TrendingUp, AlertCircle, CheckCircle, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import type { ApiResponse, EmailListItem, BenefitsStat } from "@/lib/types";
import { MOCK_STATS } from "@/lib/mock-data";
import { EmailDetailPanel } from "@/components/email-detail-panel";

const PENDING_REASONS: Record<string, { reason: string; detail: string; tag: string; tagColor: string }> = {
  e002: {
    reason: "方向碼不確定",
    detail: "TA 與 TC 特徵重疊，信心度 94%，請確認是委託發出還是客戶指示",
    tag: "信心不足",
    tagColor: "#d97706",
  },
};

const DEFAULT_REASON = {
  reason: "需人工確認",
  detail: "AI 無法完全確定分類，請人工審核後確認",
  tag: "待審核",
  tagColor: "#6b7280",
};

const codeColor: Record<string, string> = {
  FA: "#2563eb", FC: "#7c3aed", TA: "#059669", TC: "#d97706",
  FG: "#dc2626", TG: "#9ca3af", FX: "#6b7280",
};

function StatCard({ label, value, sub, icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div style={{
      padding: "16px 20px", border: `1px solid ${accent ? "#fde68a" : "var(--border)"}`,
      borderRadius: 8, background: accent ? "#fffbeb" : "var(--bg)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: accent ? "#92400e" : "var(--fg-subtle)", fontWeight: 500 }}>{label}</span>
        <span style={{ color: accent ? "#d97706" : "var(--fg-muted)" }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: accent ? "#92400e" : "var(--fg)", letterSpacing: "-0.03em" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: accent ? "#b45309" : "var(--fg-subtle)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AppOverviewPage() {
  const router = useRouter();
  const [emails, setEmails]         = useState<EmailListItem[]>([]);
  const [benefits, setBenefits]     = useState<BenefitsStat[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(400);

  const panelResizing    = useRef(false);
  const panelResizeStart = useRef({ mx: 0, pw: 400 });

  useEffect(() => {
    fetch("/api/v1/emails?limit=20")
      .then(r => r.json())
      .then((d: ApiResponse<EmailListItem[]>) => setEmails(d.data ?? []))
      .catch(() => {});
    fetch("/api/v1/stats")
      .then(r => r.json())
      .then((d: ApiResponse<typeof MOCK_STATS & { benefits: BenefitsStat[] }>) => setBenefits(d.data?.benefits ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panelResizing.current) return;
      const newW = Math.min(680, Math.max(300, panelResizeStart.current.pw - (e.clientX - panelResizeStart.current.mx)));
      setPanelWidth(newW);
    };
    const onUp = () => {
      if (!panelResizing.current) return;
      panelResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onPanelResizeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    panelResizing.current = true;
    panelResizeStart.current = { mx: e.clientX, pw: panelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [panelWidth]);

  const todayStr    = new Date().toISOString().slice(0, 10);
  const todayMsgs   = emails.filter(e => e.received_at.startsWith(todayStr));
  const classified  = emails.filter(e => e.status !== "pending");
  const pending     = emails.filter(e => e.status === "pending");
  const recentEmails = [...emails].sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()).slice(0, 5);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <div style={{ maxWidth: 900 }}>

          {/* Header */}
          <div style={{ marginBottom: 22, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--fg)", margin: 0, letterSpacing: "-0.02em" }}>總覽</h1>
              <p style={{ fontSize: 13, color: "var(--fg-subtle)", margin: "3px 0 0" }}>
                IP Winner · 今日 {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
              </p>
            </div>
            <Link href="/app/setup" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, textDecoration: "none",
              background: "var(--fg)",
              color: "var(--bg)", fontSize: 12, fontWeight: 600,
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}>
              <Sparkles size={13} />
              新手設定精靈
            </Link>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard label="今日收到" value={`${todayMsgs.length} 封`} sub={`本週共 ${MOCK_STATS.this_week} 封`} icon={<Mail size={15} />} />
            <StatCard label="AI 已歸類" value={`${classified.length} 封`} sub={`準確率 ${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%`} icon={<TrendingUp size={15} />} />
            <StatCard label="待人工確認" value={`${pending.length} 封`} sub={pending.length > 0 ? "需要審核" : "全部完成 ✓"} icon={<AlertCircle size={15} />} accent={pending.length > 0} />
            <StatCard label="分類準確率" value={`${(MOCK_STATS.accuracy_rate * 100).toFixed(1)}%`} sub="收發碼 100%" icon={<CheckCircle size={15} />} />
          </div>

          {/* Pending section */}
          {pending.length > 0 && (
            <div style={{ marginBottom: 20, border: "1px solid #fde68a", borderRadius: 8, overflow: "hidden", background: "#fffbeb" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} color="#d97706" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{pending.length} 封需要人工確認</span>
                </div>
                <button onClick={() => router.push("/app/emails?status=pending")}
                  style={{ fontSize: 12, color: "#b45309", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  前往確認全部 <ChevronRight size={12} />
                </button>
              </div>
              {pending.map((e, i) => {
                const r = PENDING_REASONS[e.id] ?? DEFAULT_REASON;
                const isSelected = selectedId === e.id;
                return (
                  <div key={e.id}
                    onClick={() => setSelectedId(isSelected ? null : e.id)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: i < pending.length - 1 ? "1px solid #fde68a" : "none",
                      cursor: "pointer", transition: "background 0.1s",
                      background: isSelected ? "#fef9c3" : "transparent",
                    }}
                    onMouseEnter={el => { if (!isSelected) el.currentTarget.style.background = "#fef9c3"; }}
                    onMouseLeave={el => { if (!isSelected) el.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0, marginTop: 1, color: codeColor[e.direction_code ?? ""] ?? "#6b7280", background: `${codeColor[e.direction_code ?? ""] ?? "#6b7280"}18`, border: `1px solid ${codeColor[e.direction_code ?? ""] ?? "#6b7280"}30` }}>
                        {e.direction_code ?? "?"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subject}</div>
                        <div style={{ fontSize: 11, color: "#78716c", marginTop: 2 }}>
                          {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
                          <HelpCircle size={11} color={r.tagColor} style={{ flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, marginRight: 6, color: r.tagColor, background: `${r.tagColor}18` }}>{r.tag}</span>
                            <span style={{ fontSize: 11, color: "#78716c" }}>{r.detail}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={13} color={isSelected ? "#d97706" : "#a8a29e"} style={{ flexShrink: 0, marginTop: 2, transform: isSelected ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Two columns: recent emails + chart */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>

            {/* Recent emails */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--sl2)" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>最近信件</span>
                <button onClick={() => router.push("/app/emails")} style={{ fontSize: 12, color: "var(--fg-muted)", background: "none", border: "none", cursor: "pointer" }}>查看全部 →</button>
              </div>
              {recentEmails.map((e, i) => {
                const isSelected = selectedId === e.id;
                return (
                  <div key={e.id}
                    onClick={() => setSelectedId(isSelected ? null : e.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                      borderBottom: i < recentEmails.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", transition: "background 0.1s",
                      background: isSelected ? "var(--sl3)" : "transparent",
                    }}
                    onMouseEnter={el => { if (!isSelected) el.currentTarget.style.background = "var(--sl2)"; }}
                    onMouseLeave={el => { if (!isSelected) el.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, flexShrink: 0, color: codeColor[e.direction_code ?? ""] ?? "#6b7280", background: `${codeColor[e.direction_code ?? ""] ?? "#6b7280"}15` }}>
                      {e.direction_code ?? "?"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: isSelected ? 600 : 400 }}>{e.subject}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 1 }}>
                        {e.sender_name} · {new Date(e.received_at).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {e.status === "pending"   && <AlertCircle  size={13} color="#d97706" style={{ flexShrink: 0 }} />}
                    {e.status === "confirmed" && <CheckCircle  size={13} color="var(--green)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            {/* Right: daily chart */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--sl2)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>
                近 5 日處理量
              </div>
              {benefits.slice(-5).map((b) => {
                const maxVal = Math.max(...benefits.map(x => x.emails_processed), 1);
                const pct = Math.round((b.emails_processed / maxVal) * 100);
                return (
                  <div key={b.date} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, color: "var(--fg-subtle)", minWidth: 32 }}>{b.date.slice(5)}</span>
                    <div style={{ flex: 1, height: 6, background: "var(--sl4)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--fg)", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--fg-muted)", minWidth: 20, textAlign: "right" }}>{b.emails_processed}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right detail panel ── */}
      <div style={{
        width: selectedId ? panelWidth : 0,
        overflow: "hidden",
        borderLeft: selectedId ? "1px solid var(--border)" : "none",
        background: "var(--bg)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
        position: "relative",
        transition: selectedId ? "none" : "width 0.2s",
      }}>
        {selectedId && (
          <>
            <div onMouseDown={onPanelResizeDown} style={{
              position: "absolute", left: -3, top: 0, bottom: 0, width: 6,
              cursor: "col-resize", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 2, height: 32, borderRadius: 2, background: "var(--sl7)", opacity: 0.5 }} />
            </div>
            <EmailDetailPanel
              emailId={selectedId}
              onClose={() => setSelectedId(null)}
              onNavigate={(url) => router.push(url)}
            />
          </>
        )}
      </div>
    </div>
  );
}

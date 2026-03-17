"use client";

import { Mail, Briefcase } from "lucide-react";
import { MOCK_STAFF, MOCK_CASES, type StaffMember } from "@/lib/mock-cases";

const ROLE_LABELS: Record<string, string> = {
  attorney:  "專利師",
  paralegal: "助理",
  admin:     "行政",
  intern:    "實習生",
};

const ROLE_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  attorney:  { fg: "#1d4ed8", bg: "#eff6ff",  border: "#bfdbfe" },
  paralegal: { fg: "#065f46", bg: "#ecfdf5",  border: "#a7f3d0" },
  admin:     { fg: "#6b7280", bg: "#f9fafb",  border: "#e5e7eb" },
  intern:    { fg: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
};

const SPECIALTY_COLORS = [
  { fg: "#1d4ed8", bg: "#eff6ff" },
  { fg: "#065f46", bg: "#ecfdf5" },
  { fg: "#7c3aed", bg: "#f5f3ff" },
  { fg: "#92400e", bg: "#fffbeb" },
  { fg: "#0e7490", bg: "#ecfeff" },
];

function workloadColor(count: number) {
  if (count >= 30) return "#dc2626";
  if (count >= 20) return "#d97706";
  return "#166534";
}

function StaffCard({ member }: { member: StaffMember }) {
  const roleColor = ROLE_COLORS[member.role] ?? ROLE_COLORS.admin;
  const cases     = MOCK_CASES.filter(c => c.assignee_id === member.id);
  const active    = cases.filter(c => !["granted", "abandoned", "rejected"].includes(c.status));
  const oaCount   = cases.filter(c => c.status === "oa_issued").length;

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
      background: "var(--bg)",
    }}>
      {/* Card header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--sl1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
            background: roleColor.bg, border: `1px solid ${roleColor.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: roleColor.fg,
          }}>
            {member.avatar_initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{member.name}</span>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3,
                color: roleColor.fg, background: roleColor.bg, border: `1px solid ${roleColor.border}`,
              }}>
                {ROLE_LABELS[member.role]}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginTop: 2 }}>{member.title}</div>
          </div>
        </div>

        {/* Contact */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, color: "var(--fg-muted)" }}>
          <Mail size={11} />
          <span>{member.email}</span>
        </div>
        {member.bar_number && (
          <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 4 }}>
            證照：{member.bar_number}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--border)" }}>
        {[
          { label: "進行中案件", value: active.length,         color: workloadColor(active.length) },
          { label: "OA 待答辯",  value: oaCount,               color: oaCount > 0 ? "#d97706" : "var(--fg-muted)" },
          { label: "總案件",     value: cases.length,           color: "var(--fg)" },
        ].map(({ label, value, color }, i) => (
          <div key={label} style={{
            padding: "10px 14px",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--fg-subtle)", marginTop: 2, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Specialties */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          專業領域
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {member.specialties.map((s, i) => {
            const sc = SPECIALTY_COLORS[i % SPECIALTY_COLORS.length];
            return (
              <span key={s} style={{
                fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 4,
                color: sc.fg, background: sc.bg,
              }}>
                {s}
              </span>
            );
          })}
        </div>
      </div>

      {/* Recent cases snippet */}
      {active.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            近期案件
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {active.slice(0, 3).map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 10, fontFamily: "ui-monospace, monospace", fontWeight: 600,
                  color: "var(--fg-muted)", background: "var(--sl3)",
                  padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)",
                  flexShrink: 0,
                }}>
                  {c.case_number}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-subtle)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title}
                </span>
              </div>
            ))}
            {active.length > 3 && (
              <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>…還有 {active.length - 3} 件</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffPage() {
  const attorneys  = MOCK_STAFF.filter(s => s.role === "attorney");
  const paralegals = MOCK_STAFF.filter(s => s.role === "paralegal" || s.role === "admin");
  const interns    = MOCK_STAFF.filter(s => s.role === "intern");

  const totalActive = MOCK_CASES.filter(c => !["granted","abandoned","rejected"].includes(c.status)).length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* Summary bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--bg)" }}>
        {[
          { label: "專利師", value: attorneys.length,  color: "#1d4ed8" },
          { label: "助理",   value: paralegals.length, color: "#065f46" },
          { label: "實習生", value: interns.length,    color: "#7c3aed" },
          {
            label: "平均案件負荷",
            value: attorneys.length > 0
              ? `${Math.round(totalActive / attorneys.length)} 件/人`
              : "—",
            color: "var(--fg)",
          },
        ].map(({ label, value, color }, i, arr) => (
          <div key={label} style={{
            flex: 1, padding: "14px 20px",
            borderRight: i < arr.length - 1 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.02em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Attorneys section */}
      <SectionTitle icon={<Briefcase size={13} />} label="專利師 / 工程師" count={attorneys.length} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
        {attorneys.map(s => <StaffCard key={s.id} member={s} />)}
      </div>

      {/* Paralegals section */}
      {paralegals.length > 0 && (
        <>
          <SectionTitle icon={<Briefcase size={13} />} label="助理 / 行政" count={paralegals.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28 }}>
            {paralegals.map(s => <StaffCard key={s.id} member={s} />)}
          </div>
        </>
      )}

      {/* Interns */}
      {interns.length > 0 && (
        <>
          <SectionTitle icon={<Briefcase size={13} />} label="實習生" count={interns.length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {interns.map(s => <StaffCard key={s.id} member={s} />)}
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
      <span style={{ color: "var(--fg-muted)" }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{label}</span>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "var(--fg-subtle)",
        background: "var(--sl3)", border: "1px solid var(--border)",
        padding: "0 6px", borderRadius: 10,
      }}>
        {count}
      </span>
    </div>
  );
}

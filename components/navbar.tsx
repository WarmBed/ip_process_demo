"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, Settings, ChevronDown } from "lucide-react";

const NAV_ITEMS = [
  { href: "/app",           label: "總覽" },
  { href: "/app/cases",     label: "案件" },
  { href: "/app/deadlines", label: "期限" },
  { href: "/app/emails",    label: "信件" },
  { href: "/app/todo",      label: "待辦" },
  { href: "/app/clients",   label: "客戶" },
  { href: "/app/staff",     label: "人員" },
  { href: "/app/reports",   label: "月報" },
  { href: "/app/stats",     label: "統計" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header style={{
      height: "var(--navbar-height)",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 8,
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16, textDecoration: "none" }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6,
          background: "var(--fg)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={14} color="var(--bg)" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em" }}>
          IP Winner
        </span>
      </Link>

      {/* Nav items */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, overflowX: "auto" }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`nav-link${isActive ? " active" : ""}`}>
              {label}
            </Link>
          );
        })}
        <Link href="/app/settings" className={`nav-link${pathname.startsWith("/app/settings") ? " active" : ""}`}>
          <Settings size={13} />
          設定
        </Link>
      </nav>

      {/* Right: tenant + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {/* Tenant badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 6,
          border: "1px solid var(--border)", background: "var(--sl2)",
          fontSize: 12, color: "var(--fg-muted)", cursor: "pointer",
        }}>
          <span style={{ fontWeight: 500, color: "var(--fg)" }}>IP Winner</span>
          <ChevronDown size={11} />
        </div>

        {/* User avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "var(--sl4)", display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: "var(--fg-muted)",
          cursor: "pointer",
        }}>
          U
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, IconButton } from "@radix-ui/themes";
import {
  Mail,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Globe,
  Briefcase,
  Clock,
  CheckSquare,
  Users,
  UserCog,
  Receipt,
  BarChart3,
  TrendingUp,
  GitBranch,
  FolderOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app",           label: "總覽",     icon: LayoutDashboard },
  { href: "/app/patent",    label: "IP概況",   icon: Globe },
  { href: "/app/cases",     label: "案件",     icon: Briefcase },
  { href: "/app/deadlines", label: "期限",     icon: Clock },
  { href: "/app/emails",    label: "信件",     icon: Mail },
  { href: "/app/todo",      label: "待辦",     icon: CheckSquare },
  { href: "/app/clients",   label: "客戶",     icon: Users },
  { href: "/app/staff",     label: "人員",     icon: UserCog },
  { href: "/app/fees",      label: "費用",     icon: Receipt },
  { href: "/app/workflows", label: "工作流程", icon: GitBranch },
  { href: "/app/files",     label: "檔案",     icon: FolderOpen },
  { href: "/app/grid",      label: "總表",     icon: BarChart3 },
  { href: "/app/reports",   label: "月報",     icon: BarChart3 },
  { href: "/app/stats",     label: "統計",     icon: TrendingUp },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header style={{
      height: "var(--navbar-height)",
      borderBottom: "1px solid var(--gray-6)",
      background: "var(--color-background)",
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      gap: 6,
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/app" style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 10, textDecoration: "none", flexShrink: 0 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: "var(--green-9)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={13} color="white" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-12)", letterSpacing: "-0.02em" }}>
          IP Winner
        </span>
      </Link>

      {/* Nav items — horizontal scroll, compact */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flex: 1,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        maskImage: "linear-gradient(to right, transparent 0, black 0, black calc(100% - 20px), transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0, black 0, black calc(100% - 20px), transparent 100%)",
      }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--green-11)" : "var(--gray-11)",
                background: isActive ? "var(--green-3)" : "transparent",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "background 0.12s, color 0.12s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--gray-3)";
                  e.currentTarget.style.color = "var(--gray-12)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--gray-11)";
                }
              }}
            >
              <Icon size={13} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <Link href="/app/settings" style={{ textDecoration: "none", flexShrink: 0 }}>
        <IconButton
          variant="ghost"
          size="1"
          color={pathname.startsWith("/app/settings") ? "green" : "gray"}
          highContrast={pathname.startsWith("/app/settings")}
        >
          <Settings size={15} />
        </IconButton>
      </Link>

      {/* Tenant + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <button
          className="col-hide-m"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 5,
            border: "1px solid var(--gray-6)", background: "var(--gray-2)",
            fontSize: 12, color: "var(--gray-11)", cursor: "pointer",
          }}
        >
          <span style={{ fontWeight: 500, color: "var(--gray-12)" }}>IP Winner</span>
          <ChevronDown size={10} />
        </button>
        <Avatar size="2" fallback="U" color="gray" radius="full" />
      </div>
    </header>
  );
}

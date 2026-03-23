"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Avatar } from "@radix-ui/themes";
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
          background: "var(--green-9)", display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={14} color="white" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--gray-12)", letterSpacing: "-0.02em" }}>
          IP Winner
        </span>
      </Link>

      {/* Nav items */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <Button
                variant="ghost"
                size="1"
                color={isActive ? "green" : "gray"}
                highContrast={isActive}
                style={{ gap: 5, fontWeight: isActive ? 500 : 400 }}
              >
                <Icon size={13} />
                {label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <Link href="/app/settings" style={{ textDecoration: "none" }}>
        <Button
          variant="ghost"
          size="1"
          color={pathname.startsWith("/app/settings") ? "green" : "gray"}
          highContrast={pathname.startsWith("/app/settings")}
        >
          <Settings size={15} />
        </Button>
      </Link>

      {/* Tenant + user */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Button variant="outline" size="1" color="gray" className="col-hide-m" style={{ gap: 6 }}>
          <span style={{ fontWeight: 500, color: "var(--gray-12)" }}>IP Winner</span>
          <ChevronDown size={11} />
        </Button>
        <Avatar size="2" fallback="U" color="gray" radius="full" />
      </div>
    </header>
  );
}

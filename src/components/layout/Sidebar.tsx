"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { BarChart3, BookOpen, Flag, Gauge, GraduationCap, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const groups: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; roles?: Role[] }>;
}> = [
  {
    label: "Monitor",
    items: [
      { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 }
    ]
  },
  {
    label: "Records",
    items: [
      { href: "/reports", label: "Reports", icon: Gauge },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/lecturers", label: "Lecturers", icon: GraduationCap }
    ]
  },
  {
    label: "Governance",
    items: [
      { href: "/flags", label: "Flags", icon: Flag },
      { href: "/contests", label: "Contests", icon: ShieldCheck }
    ]
  },
  {
    label: "Setup",
    items: [
      { href: "/admin", label: "Admin", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["QA_OFFICER", "QA_ASSISTANT"] as Role[] }
    ]
  }
];

export function Sidebar({ children, role }: { children?: React.ReactNode; role?: Role }) {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
      <div className="border-b border-slate-100 px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-lg transition hover:opacity-85" aria-label="Open Command Center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy font-display text-lg font-bold text-white">S</div>
          <div>
            <p className="font-display text-xl font-bold text-navy">ShowUp</p>
            <p className="text-xs font-medium text-muted">Quality assurance</p>
          </div>
        </Link>
      </div>
      <nav className="space-y-6 px-4 py-5">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.roles || (role && item.roles.includes(role)));
          if (!visibleItems.length) return null;
          return (
            <div key={group.label}>
              <p className="mb-2 px-2 text-xs font-bold text-muted">{group.label}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                        isActive
                          ? "bg-navy text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-navy"
                      )}
                    >
                      <item.icon className="h-4 w-4" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
        {children}
      </nav>
    </aside>
  );
}

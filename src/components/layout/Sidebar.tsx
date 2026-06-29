"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { BarChart3, BookOpen, Flag, Gauge, GraduationCap, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";

const items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; roles?: Role[] }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: Gauge },
  { href: "/lecturers", label: "Lecturers", icon: GraduationCap },
  { href: "/flags", label: "Flags", icon: Flag },
  { href: "/contests", label: "Contests", icon: ShieldCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["QA_OFFICER"] as Role[] }
];

export function Sidebar({ children, role }: { children?: React.ReactNode; role?: Role }) {
  const pathname = usePathname();
  const visibleItems = items.filter((item) => !item.roles || (role && item.roles.includes(role)));
  return (
    <aside className="hidden w-64 shrink-0 bg-navy text-white md:block">
      <div className="px-6 py-6 font-display text-2xl font-bold">ShowUp</div>
      <nav className="space-y-1 px-3">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
          <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${isActive ? "bg-white text-navy shadow-sm" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </Link>
        );})}
        {children}
      </nav>
    </aside>
  );
}

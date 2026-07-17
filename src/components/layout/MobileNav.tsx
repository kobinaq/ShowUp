"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { BarChart3, BookOpen, FileText, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { pathRoles, roleHome } from "@/lib/auth/roles";

export function MobileNav({ role }: { role?: Role }) {
  const pathname = usePathname();
  const homeHref = role ? roleHome[role] : "/dashboard";
  const candidates = [
    { href: homeHref, Icon: Home, label: "Home", match: homeHref },
    { href: "/analytics", Icon: BarChart3, label: "Insights", match: "/analytics" },
    { href: "/reports", Icon: FileText, label: "Reports", match: "/reports" },
    { href: "/courses", Icon: BookOpen, label: "Courses", match: "/courses" },
    { href: "/students", Icon: Users, label: "Students", match: "/students" }
  ];
  const items = candidates.filter((item) => {
    const key = item.match === homeHref ? (homeHref.startsWith("/rep") ? "/rep" : homeHref) : item.match;
    const allowed = pathRoles[key] ?? pathRoles[item.match];
    if (item.label === "Home") return true;
    return !allowed || (role && allowed.includes(role));
  }).slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      {items.map(({ href, Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={`${label}-${href}`}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", isActive ? "text-navy" : "text-muted")}
          >
            <span className={cn("rounded-full px-3 py-1", isActive ? "bg-accent/20" : "")}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { BarChart3, BookOpen, FileText, Home, UserRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MobileNav({ role }: { role?: Role }) {
  const pathname = usePathname();
  const homeHref = role === "VC" ? "/analytics" : "/dashboard";
  const items = [
    { href: homeHref, Icon: Home, label: "Home" },
    { href: "/analytics", Icon: BarChart3, label: "Insights" },
    { href: "/reports", Icon: FileText, label: "Reports" },
    { href: "/courses", Icon: BookOpen, label: "Courses" },
    { href: "/lecturers", Icon: UserRound, label: "People" }
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      {items.map(({ href, Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
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

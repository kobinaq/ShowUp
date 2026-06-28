"use client";

import Link from "next/link";
import { BookOpen, FileText, Home, UserRound } from "lucide-react";

export function MobileNav() {
  const items = [
    { href: "/dashboard", Icon: Home, label: "Home" },
    { href: "/courses", Icon: BookOpen, label: "Courses" },
    { href: "/reports", Icon: FileText, label: "Reports" },
    { href: "/lecturers", Icon: UserRound, label: "People" }
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-white md:hidden">
      {items.map(({ href, Icon, label }) => (
        <Link key={href} href={href} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs">
          <Icon className="h-5 w-5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

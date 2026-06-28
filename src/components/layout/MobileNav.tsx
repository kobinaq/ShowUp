"use client";

import Link from "next/link";
import { BookOpen, FileText, Home, UserRound } from "lucide-react";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-white md:hidden">
      {[
        ["/dashboard", Home, "Home"],
        ["/courses", BookOpen, "Courses"],
        ["/reports", FileText, "Reports"],
        ["/lecturers", UserRound, "People"]
      ].map(([href, Icon, label]) => (
        <Link key={href as string} href={href as string} className="flex min-h-14 flex-col items-center justify-center gap-1 text-xs">
          {/* @ts-expect-error tuple icon */}
          <Icon className="h-5 w-5" aria-hidden />
          {label as string}
        </Link>
      ))}
    </nav>
  );
}

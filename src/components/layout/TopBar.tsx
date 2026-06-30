import type { Role } from "@prisma/client";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function TopBar({ role, email, university, department }: { role?: Role; email?: string | null; university?: string | null; department?: string | null }) {
  return (
    <header className="sticky top-0 z-20 grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-lg font-bold text-navy md:text-xl">{dashboardTitle(role)}</h1>
        {department ? <p className="mt-0.5 hidden truncate text-xs font-semibold text-muted sm:block">{department}</p> : null}
      </div>
      <div className="hidden max-w-[42vw] truncate text-center font-display text-sm font-bold text-navy sm:block md:text-base">
        {university ?? ""}
      </div>
      <div className="flex items-center justify-end gap-3">
        <div className="hidden text-right text-sm text-muted lg:block">{email}</div>
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}

function dashboardTitle(role?: Role) {
  if (role === "SUPER_ADMIN") return "Super Admin Dashboard";
  if (role === "VC") return "VC Dashboard";
  if (role === "QA_OFFICER") return "QA Dashboard";
  if (role === "HOD") return "HOD Dashboard";
  if (role === "HOD_ASSISTANT") return "HOD Assistant Dashboard";
  if (role === "CLASS_REP") return "Class Rep Dashboard";
  return "Dashboard";
}

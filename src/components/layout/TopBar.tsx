import type { Role } from "@prisma/client";

export function TopBar({ role, email }: { role?: Role; email?: string | null }) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b bg-white px-4 md:px-8">
      <div>
        <h1 className="font-display text-xl font-bold">{dashboardTitle(role)}</h1>
      </div>
      <div className="text-right text-sm text-muted">{email}</div>
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

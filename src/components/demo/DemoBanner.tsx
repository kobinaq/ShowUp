import Link from "next/link";

export function DemoBanner({ role }: { role: string }) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950 md:px-8">
      <span className="font-semibold">Live demo mode</span>
      <span className="mx-2 text-amber-700">·</span>
      Exploring as {role.replaceAll("_", " ")}
      <span className="mx-2 text-amber-700">·</span>
      <Link href="/demo" className="font-semibold underline underline-offset-2">
        Demo console
      </Link>
    </div>
  );
}

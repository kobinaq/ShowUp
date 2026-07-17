import Link from "next/link";
import { DemoExperience } from "@/components/demo/DemoExperience";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <div className="mb-8">
          <Link href="/" className="text-sm font-semibold text-muted hover:text-navy">
            ← Back to ShowUp
          </Link>
          <h1 className="mt-4 font-display text-4xl font-bold text-navy">Live demo</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
            Pitch-ready walkthrough with auth skipped, seeded university data, role switching, and real SMS notifications.
          </p>
        </div>
        <DemoExperience />
      </div>
    </main>
  );
}

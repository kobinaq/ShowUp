"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function RosterProposalForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/roster-proposals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        realName: form.get("realName"),
        realEmail: form.get("realEmail"),
        realPhone: form.get("realPhone")
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not submit proposal");
      return;
    }
    toast.success("Roster proposal sent to QA");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-navy">Propose a roster member</p>
      <input name="realName" required placeholder="Student name" className="h-10 rounded-md border px-3 text-sm" />
      <input name="realEmail" required type="email" placeholder="Student email" className="h-10 rounded-md border px-3 text-sm" />
      <input name="realPhone" required placeholder="Student phone" className="h-10 rounded-md border px-3 text-sm" />
      <button disabled={loading} className="h-10 rounded-md bg-navy px-3 text-sm font-semibold text-white disabled:opacity-60">
        {loading ? "Sending..." : "Send to QA"}
      </button>
    </form>
  );
}

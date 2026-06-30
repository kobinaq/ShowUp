"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";

export function ReporterAssignmentForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/reps`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        realName: form.get("realName"),
        realEmail: form.get("realEmail"),
        realPhone: form.get("realPhone"),
        rotationOrder: Number(form.get("rotationOrder") || 1),
        rotationWeeks: Number(form.get("rotationWeeks") || 4)
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not assign reporter");
      return;
    }
    toast.success("Reporter assigned");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-navy">Assign student reporter</p>
      <input name="realName" required placeholder="Student name" className="h-10 rounded-md border px-3 text-sm" />
      <input name="realEmail" required type="email" placeholder="Student email" className="h-10 rounded-md border px-3 text-sm" />
      <input name="realPhone" required placeholder="Student phone" className="h-10 rounded-md border px-3 text-sm" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="rotationOrder" required type="number" min={1} defaultValue={1} aria-label="Rotation order" className="h-10 rounded-md border px-3 text-sm" />
        <input name="rotationWeeks" required type="number" min={1} max={16} defaultValue={4} aria-label="Rotation weeks" className="h-10 rounded-md border px-3 text-sm" />
      </div>
      <button disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-navy disabled:opacity-60">
        <Plus className="h-4 w-4" aria-hidden />
        {loading ? "Assigning..." : "Assign reporter"}
      </button>
    </form>
  );
}

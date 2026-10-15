"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function DigestToggle({ lecturerId, enabled }: { lecturerId: string; enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const response = await fetch(`/api/lecturers/${lecturerId}/digest`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ digestEmailEnabled: !enabled })
    });
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not update digest setting");
      return;
    }
    toast.success(!enabled ? "Daily digest enabled" : "Daily digest disabled");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void toggle()} disabled={loading} className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold disabled:opacity-60">
      {loading ? "Saving..." : enabled ? "Disable daily digest" : "Enable daily digest"}
    </button>
  );
}

"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function SessionConfirmButton({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);

  async function confirm(presence: "PRESENT" | "ABSENT" | "SUBSTITUTE") {
    setBusy(true);
    const response = await fetch(`/api/timetable/sessions/${sessionId}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ presence })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toast.error(body.error ?? "Confirmation failed");
      return;
    }
    if (body.data?.discrepancy) {
      toast.success("Confirmed — disagreement opened in discrepancies");
    } else {
      toast.success("Session confirmed");
    }
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void confirm("PRESENT")}
        className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800 disabled:opacity-60"
      >
        Confirm present
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void confirm("ABSENT")}
        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-800 disabled:opacity-60"
      >
        Confirm absent
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function LecturerFlagRespond({ flagId }: { flagId: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(action: "ACKNOWLEDGED" | "RESPONDED") {
    setBusy(true);
    const response = await fetch(`/api/flags/${flagId}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() || undefined })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toast.error(body.error ?? "Could not save response");
      return;
    }
    toast.success(action === "ACKNOWLEDGED" ? "Flag acknowledged" : "Response recorded");
    setNote("");
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Optional note for QA (e.g. evidence, context)"
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void send("ACKNOWLEDGED")}
          className="h-10 rounded-md border border-slate-200 px-3 text-xs font-semibold disabled:opacity-60"
        >
          Acknowledge
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void send("RESPONDED")}
          className="h-10 rounded-md bg-navy px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          Send response
        </button>
      </div>
    </div>
  );
}

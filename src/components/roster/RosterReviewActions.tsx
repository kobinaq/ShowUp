"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function RosterReviewActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function review(status: "APPROVED" | "REJECTED") {
    setLoading(status);
    const response = await fetch(`/api/roster-proposals/${proposalId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    setLoading(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not review proposal");
      return;
    }
    toast.success(status === "APPROVED" ? "Added to the course roster" : "Proposal rejected");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button type="button" disabled={loading !== null} onClick={() => void review("APPROVED")} className="h-9 rounded-md bg-navy px-3 text-xs font-semibold text-white disabled:opacity-60">
        {loading === "APPROVED" ? "Saving..." : "Approve"}
      </button>
      <button type="button" disabled={loading !== null} onClick={() => void review("REJECTED")} className="h-9 rounded-md border px-3 text-xs font-semibold disabled:opacity-60">
        {loading === "REJECTED" ? "Saving..." : "Reject"}
      </button>
    </div>
  );
}

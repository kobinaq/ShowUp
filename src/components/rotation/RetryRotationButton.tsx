"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function RetryRotationButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function retry() {
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/reps`, { method: "PUT" });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Rotation retry failed");
      return;
    }
    toast.success("Rotation retried");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void retry()} disabled={loading} className="h-9 rounded-md bg-navy px-3 text-xs font-semibold text-white disabled:opacity-60">
      {loading ? "Retrying..." : "Retry"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { usePingWindow } from "@/hooks/usePingWindow";

type Props = {
  courseId: string;
  scheduleId: string;
  classStartTime: string;
  classEndTime: string;
  thresholdMinutes: number;
  lectureDate: string;
  initialPingSent: boolean;
  initialPingSentAt?: string | null;
};

export function PingCard({ courseId, scheduleId, classStartTime, classEndTime, thresholdMinutes, lectureDate, initialPingSent, initialPingSentAt }: Props) {
  const [pingSent, setPingSent] = useState(initialPingSent);
  const [pingSentAt, setPingSentAt] = useState(initialPingSentAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pingWindow = usePingWindow(classStartTime, classEndTime, thresholdMinutes, new Date(lectureDate), pingSent);

  async function handlePing() {
    if (!pingWindow.canPing || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, scheduleId, lectureDate })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Failed to send ping.");
        return;
      }
      setPingSent(true);
      setPingSentAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  if (pingWindow.status === "pre-class") return null;
  if (pingWindow.status === "class-ended" && !pingSent) return null;

  return (
    <section className="rounded-card border bg-white p-4 shadow-card">
      {pingWindow.status === "waiting" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-sm font-semibold text-amber-800">Lecturer not yet present</p>
          <p className="mt-1 text-sm text-amber-700">Ping available in {pingWindow.minutesUntilPing} minute{pingWindow.minutesUntilPing === 1 ? "" : "s"}.</p>
        </div>
      ) : null}

      {pingWindow.status === "ping-available" && !pingSent ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-sm font-semibold text-amber-800">Lecturer is {pingWindow.minutesLate} minutes late</p>
          <p className="mt-1 text-xs text-amber-700">Notify the lecturer and QA immediately.</p>
          <button type="button" onClick={() => void handlePing()} disabled={loading} className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-amber-500 font-semibold text-white disabled:opacity-60">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
            {loading ? "Sending alert..." : "Ping Lecturer"}
          </button>
          {error ? <p className="mt-2 text-center text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}

      {pingSent ? (
        <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-green-800">Lecturer notified</p>
            {pingSentAt ? <p className="text-xs text-green-700">Alert sent at {pingSentAt}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

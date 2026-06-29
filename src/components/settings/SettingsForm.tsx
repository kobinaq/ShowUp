"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function SettingsForm({ initialThreshold }: { initialThreshold: number }) {
  const [threshold, setThreshold] = useState(initialThreshold);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ latePingThresholdMinutes: threshold })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not save settings");
      return;
    }
    toast.success("Settings saved");
  }

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h2 className="font-display text-xl font-bold">Late Ping threshold</h2>
      <p className="mt-1 text-sm text-muted">How many minutes after class start the reporter can ping the lecturer.</p>
      <div className="mt-5">
        <input type="range" min={15} max={60} step={5} value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="w-full accent-amber-500" />
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>15 min</span>
          <span className="font-semibold text-navy">{threshold} min</span>
          <span>60 min</span>
        </div>
      </div>
      <button type="button" onClick={() => void save()} disabled={loading} className="mt-5 h-11 rounded-md bg-accent px-4 text-sm font-semibold text-navy disabled:opacity-60">
        {loading ? "Saving..." : "Save settings"}
      </button>
    </section>
  );
}

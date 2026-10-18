"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { SectionPanel } from "@/components/shared/Panels";

type Blackout = {
  id: string;
  type: string;
  title: string;
  startDate: string;
  endDate: string;
  suppressesFlags: boolean;
  department: { name: string } | null;
};

export function BlackoutPanel() {
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("HOLIDAY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const response = await fetch("/api/calendar/blackouts");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Could not load blackouts");
        return;
      }
      setBlackouts(body.data ?? []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function createBlackout() {
    const response = await fetch("/api/calendar/blackouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, type, startDate, endDate, suppressesFlags: true })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error ?? "Could not create blackout");
      return;
    }
    toast.success("Blackout saved — flags will be suppressed for this window");
    setTitle("");
    load();
  }

  async function removeBlackout(id: string) {
    const response = await fetch(`/api/calendar/blackouts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete");
      return;
    }
    toast.success("Removed");
    load();
  }

  return (
    <div className="space-y-5">
      <SectionPanel title="Academic calendar blackouts" description="Holidays, exam weeks, strikes, and closures suppress lecturer flags.">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="Founders' Day" />
          </label>
          <label className="text-sm font-semibold">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm">
              <option value="HOLIDAY">Holiday</option>
              <option value="EXAM_WEEK">Exam week</option>
              <option value="STRIKE">Strike</option>
              <option value="CLOSURE">Closure</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Start
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <label className="text-sm font-semibold">
            End
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
        </div>
        <button
          type="button"
          disabled={pending || !title || !startDate || !endDate}
          onClick={() => void createBlackout()}
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Add university-wide blackout
        </button>
      </SectionPanel>

      <SectionPanel title="Scheduled blackouts" description="University-wide and department-scoped windows.">
        <ul className="space-y-3">
          {blackouts.map((blackout) => (
            <li key={blackout.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="font-semibold text-navy">{blackout.title}</p>
                <p className="text-sm text-slate-700">
                  {blackout.type.replaceAll("_", " ")} · {new Date(blackout.startDate).toLocaleDateString()} –{" "}
                  {new Date(blackout.endDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted">
                  {blackout.department?.name ?? "University-wide"}
                  {blackout.suppressesFlags ? " · suppresses flags" : ""}
                </p>
              </div>
              <button type="button" onClick={() => void removeBlackout(blackout.id)} className="text-sm font-semibold text-rose-700">
                Remove
              </button>
            </li>
          ))}
          {!blackouts.length ? <p className="text-sm text-muted">No blackouts scheduled.</p> : null}
        </ul>
      </SectionPanel>
    </div>
  );
}

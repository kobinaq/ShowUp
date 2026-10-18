"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { SectionPanel } from "@/components/shared/Panels";

const SAMPLE = `course_code,lecturer_email,room_code,room_name,day,start_time,end_time,class_group
CENG301,ceng.lecturer1@atu.edu.gh,A101,Engineering Lab 1,Mon,08:00,10:00,Morning
CS101,cs.lecturer1@atu.edu.gh,B201,Computer Lab 2,Tue,13:00,15:00,Evening`;

export function TimetableImportPanel() {
  const [csv, setCsv] = useState(SAMPLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    rooms: number;
    groups: number;
    errors: string[];
  } | null>(null);

  async function importCsv() {
    setLoading(true);
    const response = await fetch("/api/timetable/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv })
    });
    setLoading(false);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error ?? "Import failed");
      return;
    }
    setResult(body.data);
    toast.success(`Imported: ${body.data.created} created, ${body.data.updated} updated`);
  }

  return (
    <SectionPanel
      title="Import semester timetable"
      description="CSV by faculty/department: course, lecturer, room, day/time, and optional class group."
      action={
        <button
          type="button"
          disabled={loading}
          onClick={() => void importCsv()}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Importing…" : "Import CSV"}
        </button>
      }
    >
      <textarea
        value={csv}
        onChange={(event) => setCsv(event.target.value)}
        rows={10}
        className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700"
        aria-label="Timetable CSV"
      />
      {result ? (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>
            Created {result.created} · Updated {result.updated} · Rooms touched {result.rooms} · Groups {result.groups}
          </p>
          {result.errors.length ? (
            <ul className="list-disc space-y-1 pl-5 text-amber-800">
              {result.errors.slice(0, 8).map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </SectionPanel>
  );
}

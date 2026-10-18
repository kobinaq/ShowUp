"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { SectionPanel } from "@/components/shared/Panels";

type SessionRow = {
  id: string;
  lectureDate: string;
  status: string;
  reason: string | null;
  attributedToFacilities: boolean;
  course: { code: string; title: string };
  schedule: { id: string; startTime: string; endTime: string; venue: string | null };
  room: { code: string; name: string } | null;
  substituteLecturer: { firstName: string; lastName: string } | null;
  classGroups: Array<{ classGroup: { code: string; name: string } }>;
};

const STATUS_OPTIONS = [
  "SCHEDULED",
  "ON_TIME",
  "DELAYED",
  "ROOM_CHANGED",
  "RESCHEDULED",
  "CANCELLED_WITH_NOTICE",
  "CANCELLED_NO_NOTICE",
  "MAKE_UP"
] as const;

export function SessionStatusBoard() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const response = await fetch("/api/timetable/sessions");
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(body.error ?? "Could not load sessions");
        return;
      }
      setSessions(body.data ?? []);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(session: SessionRow, status: string) {
    const response = await fetch("/api/timetable/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scheduleId: session.schedule.id,
        lectureDate: session.lectureDate,
        status,
        reason: status === "DELAYED" || status.startsWith("CANCELLED") ? "OTHER" : null
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error ?? "Update failed");
      return;
    }
    toast.success("Session updated");
    load();
  }

  return (
    <SectionPanel title="Lecture session status" description="Track on-time, delayed, room-changed, cancelled, and make-up lectures.">
      {pending && !sessions.length ? <p className="text-sm text-muted">Loading sessions…</p> : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-2">Course</th>
              <th className="px-2 py-2">When</th>
              <th className="px-2 py-2">Room</th>
              <th className="px-2 py-2">Groups</th>
              <th className="px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-100 align-top">
                <td className="px-2 py-3">
                  <p className="font-semibold text-navy">{session.course.code}</p>
                  <p className="text-xs text-muted">{session.course.title}</p>
                </td>
                <td className="px-2 py-3 text-xs">
                  {new Date(session.lectureDate).toLocaleDateString()} · {session.schedule.startTime}–{session.schedule.endTime}
                </td>
                <td className="px-2 py-3 text-xs">{session.room ? session.room.code : session.schedule.venue ?? "—"}</td>
                <td className="px-2 py-3 text-xs">
                  {session.classGroups.length
                    ? session.classGroups.map((link) => link.classGroup.code).join(", ")
                    : "—"}
                  {session.attributedToFacilities ? (
                    <span className="mt-1 block font-semibold text-amber-700">Facilities</span>
                  ) : null}
                </td>
                <td className="px-2 py-3">
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={session.status}
                    onChange={(event) => void updateStatus(session, event.target.value)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  {session.substituteLecturer ? (
                    <p className="mt-1 text-xs text-muted">
                      Sub: {session.substituteLecturer.firstName} {session.substituteLecturer.lastName}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sessions.length && !pending ? (
          <p className="mt-4 text-sm text-muted">No dated lecture sessions yet. Import a timetable or submit a report to materialize sessions.</p>
        ) : null}
      </div>
    </SectionPanel>
  );
}

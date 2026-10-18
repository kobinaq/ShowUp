"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SectionPanel } from "@/components/shared/Panels";

type Mark = "PRESENT" | "ABSENT" | "LATE";

type RecordRow = {
  id: string;
  studentId: string;
  status: Mark;
  student: { studentNumber: string; fullName: string; email: string | null };
};

export function AttendanceMarkSheet({
  sessionId,
  courseId,
  initialStatus,
  initialRecords,
  canManage
}: {
  sessionId: string;
  courseId: string;
  initialStatus: "OPEN" | "CLOSED";
  initialRecords: RecordRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [records, setRecords] = useState(initialRecords);
  const [loading, setLoading] = useState(false);

  async function saveMarks(next: Array<{ studentId: string; status: Mark }>, markAllPresent = false) {
    setLoading(true);
    const response = await fetch(`/api/attendance/sessions/${sessionId}/records`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(markAllPresent ? { markAllPresent: true } : { marks: next })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return toast.error(body.error ?? "Could not save marks");
    }
    const body = await response.json();
    setRecords(body.data);
    toast.success("Attendance updated");
    router.refresh();
  }

  async function setMark(studentId: string, nextStatus: Mark) {
    const next = records.map((record) =>
      record.studentId === studentId ? { studentId, status: nextStatus } : { studentId: record.studentId, status: record.status }
    );
    setRecords((current) => current.map((record) => (record.studentId === studentId ? { ...record, status: nextStatus } : record)));
    await saveMarks(next);
  }

  async function toggleSession() {
    setLoading(true);
    const response = await fetch(`/api/attendance/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: status === "OPEN" ? "CLOSED" : "OPEN" })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return toast.error(body.error ?? "Could not update session");
    }
    setStatus(status === "OPEN" ? "CLOSED" : "OPEN");
    toast.success(status === "OPEN" ? "Session closed" : "Session re-opened");
    router.refresh();
  }

  return (
    <SectionPanel
      title="Manual roster"
      description="Mark each student present, absent, or late. No QR or session codes — lecturer-controlled only."
      action={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              disabled={loading || status === "CLOSED"}
              onClick={() => void saveMarks([], true)}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-navy disabled:opacity-50"
            >
              Mark all present
            </button>
            <button disabled={loading} onClick={() => void toggleSession()} className="rounded-md border px-3 py-2 text-sm font-semibold">
              {status === "OPEN" ? "Close session" : "Re-open session"}
            </button>
            <a href={`/courses/${courseId}`} className="rounded-md border px-3 py-2 text-sm font-semibold text-navy">
              Back to course
            </a>
          </div>
        ) : null
      }
    >
      <p className="mb-3 text-sm text-muted">Session status: <strong>{status}</strong></p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-2 py-2">ID</th>
              <th className="px-2 py-2">Student</th>
              <th className="px-2 py-2">Mark</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-t border-slate-100">
                <td className="px-2 py-3 font-mono text-xs">{record.student.studentNumber}</td>
                <td className="px-2 py-3 font-semibold text-navy">{record.student.fullName}</td>
                <td className="px-2 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(["PRESENT", "LATE", "ABSENT"] as Mark[]).map((mark) => (
                      <button
                        key={mark}
                        disabled={!canManage || loading || status === "CLOSED"}
                        onClick={() => void setMark(record.studentId, mark)}
                        className={`rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                          record.status === mark
                            ? mark === "ABSENT"
                              ? "bg-red-600 text-white"
                              : mark === "LATE"
                                ? "bg-amber-500 text-white"
                                : "bg-emerald-600 text-white"
                            : "border border-slate-200 text-slate-600"
                        }`}
                      >
                        {mark}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );
}

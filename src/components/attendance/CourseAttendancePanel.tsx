"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { SectionPanel } from "@/components/shared/Panels";

type StudentRow = {
  id: string;
  studentNumber: string;
  fullName: string;
  email: string | null;
  attendancePercent: number | null;
  presentLike: number;
  totalSessions: number;
  lowAttendance: boolean;
};

type SessionRow = {
  id: string;
  lectureDate: string;
  status: "OPEN" | "CLOSED";
  presentCount: number;
  recordCount: number;
};

export function CourseAttendancePanel({
  courseId,
  initialStudents,
  initialSessions,
  canManage
}: {
  courseId: string;
  initialStudents: StudentRow[];
  initialSessions: SessionRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [sessions, setSessions] = useState(initialSessions);
  const [csv, setCsv] = useState("student_number,full_name,email\n");
  const [studentNumber, setStudentNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const average = useMemo(() => {
    const scored = students.filter((student) => student.attendancePercent !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, student) => sum + (student.attendancePercent ?? 0), 0) / scored.length);
  }, [students]);

  async function refresh() {
    const [studentRes, sessionRes] = await Promise.all([
      fetch(`/api/courses/${courseId}/students`).then((res) => res.json()),
      fetch(`/api/courses/${courseId}/attendance/sessions`).then((res) => res.json())
    ]);
    if (studentRes.data?.students) setStudents(studentRes.data.students);
    if (sessionRes.data) setSessions(sessionRes.data);
    router.refresh();
  }

  async function importCsv() {
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return toast.error(body.error ?? "Import failed");
    }
    const body = await response.json();
    toast.success(`Imported ${body.data.imported} students`);
    await refresh();
  }

  async function addStudent() {
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentNumber, fullName, email })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return toast.error(body.error ?? "Could not add student");
    }
    setStudentNumber("");
    setFullName("");
    setEmail("");
    toast.success("Student enrolled");
    await refresh();
  }

  async function openSession(markAllPresent: boolean) {
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/attendance/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lectureDate: new Date().toISOString(), markAllPresent })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return toast.error(body.error ?? "Could not open session");
    }
    const body = await response.json();
    toast.success("Attendance session opened");
    router.push(`/courses/${courseId}/attendance/${body.data.id}`);
  }

  return (
    <div className="space-y-4">
      <SectionPanel
        title="Class roster"
        description={
          average === null
            ? `${students.length} enrolled students. Open a session to begin marking.`
            : `${students.length} enrolled · course average ${average}% attendance.`
        }
        action={
          canManage ? (
            <a
              className="rounded-md border px-3 py-2 text-sm font-semibold text-navy"
              href={`/api/courses/${courseId}/attendance/export`}
            >
              Export CSV
            </a>
          ) : null
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-mono text-xs">{student.studentNumber}</td>
                  <td className="px-2 py-2 font-semibold text-navy">{student.fullName}</td>
                  <td className="px-2 py-2 text-slate-600">{student.email ?? "—"}</td>
                  <td className="px-2 py-2">
                    {student.attendancePercent === null ? (
                      "—"
                    ) : (
                      <span className={student.lowAttendance ? "font-semibold text-red-600" : "font-semibold text-emerald-700"}>
                        {student.attendancePercent}%
                        {student.lowAttendance ? " · low" : ""}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!students.length ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-sm text-muted">
                    No students enrolled yet. Import a class list CSV to get started.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionPanel title="Add student" description="Students are records only — no student login.">
            <div className="grid gap-3">
              <input
                className="h-11 rounded-md border px-3"
                placeholder="Student ID"
                value={studentNumber}
                onChange={(event) => setStudentNumber(event.target.value)}
              />
              <input
                className="h-11 rounded-md border px-3"
                placeholder="Full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
              <input
                className="h-11 rounded-md border px-3"
                placeholder="Email (optional)"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                disabled={loading || !studentNumber || !fullName}
                onClick={() => void addStudent()}
                className="h-11 rounded-md bg-navy font-semibold text-white disabled:opacity-50"
              >
                Enroll student
              </button>
            </div>
          </SectionPanel>
          <SectionPanel title="Bulk CSV import" description="Columns: student_number, full_name, email (optional).">
            <textarea className="min-h-36 w-full rounded-md border p-3 font-mono text-xs" value={csv} onChange={(event) => setCsv(event.target.value)} />
            <button
              disabled={loading}
              onClick={() => void importCsv()}
              className="mt-3 h-11 rounded-md bg-accent font-semibold text-navy disabled:opacity-50"
            >
              Import class list
            </button>
          </SectionPanel>
        </div>
      ) : null}

      <SectionPanel
        title="Attendance sessions"
        description="Lecturers open a session and mark each student present, absent, or late."
        action={
          canManage ? (
            <div className="flex gap-2">
              <button disabled={loading || !students.length} onClick={() => void openSession(false)} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Open session
              </button>
              <button
                disabled={loading || !students.length}
                onClick={() => void openSession(true)}
                className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Open + mark all present
              </button>
            </div>
          ) : null
        }
      >
        <div className="space-y-2">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/courses/${courseId}/attendance/${session.id}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-navy">{new Date(session.lectureDate).toLocaleString()}</p>
                <p className="text-xs text-muted">
                  {session.presentCount}/{session.recordCount} present/late · {session.status}
                </p>
              </div>
              <span className="text-sm font-semibold text-navy">Open sheet →</span>
            </Link>
          ))}
          {!sessions.length ? <p className="text-sm text-muted">No attendance sessions yet.</p> : null}
        </div>
      </SectionPanel>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { PingCard } from "@/components/reports/PingCard";

type SchedulePayload = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  submittedToday: boolean;
  ping: { createdAt: string; acknowledgedAt: string | null } | null;
};

type CoursePayload = {
  id: string;
  code: string;
  title: string;
  schedule: SchedulePayload[];
  outline: { topics: Array<{ id: string; title: string; weekNumber: number | null }> } | null;
};

type AssignmentPayload = {
  id: string;
  course: CoursePayload;
};

type ReportPayload = {
  courseId: string;
  scheduleId: string;
  lectureDate: string;
  lecturerPresent: FormDataEntryValue | null;
  arrivalStatus?: FormDataEntryValue | null;
  lateMinutes?: number;
  earlyDismissal: boolean;
  dismissedEarlyMinutes?: number;
  topicIds: FormDataEntryValue[];
  previousTopicsRevisited: boolean;
  teachingAids: FormDataEntryValue[];
  wasInteractive?: FormDataEntryValue | null;
  studentCount?: number;
  additionalNotes?: FormDataEntryValue | null;
};

export function ReportForm({ assignments, pingThresholdMinutes }: { assignments: AssignmentPayload[]; pingThresholdMinutes: number }) {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [presence, setPresence] = useState("PRESENT");
  const [selectedCourseId, setSelectedCourseId] = useState(assignments[0]?.course.id ?? "");
  const selectedCourse = useMemo(
    () => assignments.find((assignment) => assignment.course.id === selectedCourseId)?.course ?? assignments[0]?.course,
    [assignments, selectedCourseId]
  );
  const todayDay = new Date().getDay();
  const firstTodaySchedule = selectedCourse?.schedule.find((schedule) => schedule.dayOfWeek === todayDay);
  const [selectedScheduleId, setSelectedScheduleId] = useState(firstTodaySchedule?.id ?? selectedCourse?.schedule[0]?.id ?? "");
  const selectedSchedule = selectedCourse?.schedule.find((schedule) => schedule.id === selectedScheduleId) ?? selectedCourse?.schedule[0];
  const topics = useMemo(() => selectedCourse?.outline?.topics ?? [], [selectedCourse?.outline?.topics]);
  const isAbsent = presence === "ABSENT";
  const alreadySubmitted = Boolean(selectedSchedule?.submittedToday) || submitted;
  const [pendingPayload, setPendingPayload] = useState<ReportPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function handleCourseChange(courseId: string) {
    const nextCourse = assignments.find((assignment) => assignment.course.id === courseId)?.course;
    const nextSchedule = nextCourse?.schedule.find((schedule) => schedule.dayOfWeek === todayDay) ?? nextCourse?.schedule[0];
    setSelectedCourseId(courseId);
    setSelectedScheduleId(nextSchedule?.id ?? "");
  }

  function prepareSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourse || !selectedSchedule) return toast.error("Select a course session first");
    if (alreadySubmitted) return toast.error("A report has already been submitted for this session");
    const form = new FormData(event.currentTarget);
    const teachingAids = form.getAll("teachingAids");
    const normalizedTeachingAids = isAbsent || teachingAids.length === 0 || teachingAids.includes("NONE") ? ["NONE"] : teachingAids;
    setPendingPayload({
      courseId: selectedCourse.id,
      scheduleId: selectedSchedule.id,
      lectureDate: new Date().toISOString(),
      lecturerPresent: form.get("lecturerPresent"),
      arrivalStatus: isAbsent ? undefined : form.get("arrivalStatus") || undefined,
      lateMinutes: isAbsent ? undefined : Number(form.get("lateMinutes") || 0) || undefined,
      earlyDismissal: isAbsent ? false : form.get("earlyDismissal") === "on",
      dismissedEarlyMinutes: isAbsent ? undefined : Number(form.get("dismissedEarlyMinutes") || 0) || undefined,
      topicIds: isAbsent ? [] : form.getAll("topicIds"),
      previousTopicsRevisited: isAbsent ? false : form.get("previousTopicsRevisited") === "on",
      teachingAids: normalizedTeachingAids,
      wasInteractive: isAbsent ? undefined : form.get("wasInteractive"),
      studentCount: isAbsent ? undefined : Number(form.get("studentCount") || 0) || undefined,
      additionalNotes: form.get("additionalNotes") || undefined
    });
  }

  async function submitConfirmed() {
    if (!pendingPayload) return;
    setSubmitting(true);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pendingPayload)
    });
    setSubmitting(false);
    setPendingPayload(null);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return toast.error(reportErrorMessage(body));
    }
    setSubmitted(true);
    toast.success("Report submitted");
  }

  if (!selectedCourse || !selectedSchedule) {
    return <div className="rounded-card border bg-white p-6 text-center shadow-card"><h1 className="font-display text-2xl font-bold">No class sessions available</h1><p className="mt-2 text-muted">Your active assignment does not have a class schedule yet.</p></div>;
  }

  return (
    <>
      <form onSubmit={prepareSubmit} className="space-y-4 pb-24">
        {!online ? <div className="sticky top-0 z-10 rounded-md bg-warning px-4 py-3 text-sm font-semibold">Offline. Reconnect before submitting.</div> : null}
        <Header course={selectedCourse} schedule={selectedSchedule} />
        <Section title="Class session">
          <Select name="course" options={assignments.map((assignment) => assignment.course.id)} labels={Object.fromEntries(assignments.map((assignment) => [assignment.course.id, `${assignment.course.code} - ${assignment.course.title}`]))} value={selectedCourse.id} onChange={handleCourseChange} />
          <Select name="schedule" options={selectedCourse.schedule.map((schedule) => schedule.id)} labels={Object.fromEntries(selectedCourse.schedule.map((schedule) => [schedule.id, `${dayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}${schedule.venue ? `, ${schedule.venue}` : ""}`]))} value={selectedSchedule.id} onChange={setSelectedScheduleId} />
          {selectedSchedule.dayOfWeek !== todayDay ? <p className="rounded-md bg-amber-50 px-3 py-3 text-sm font-medium text-amber-700">This session is not scheduled for today.</p> : null}
          {alreadySubmitted ? <p className="rounded-md bg-green-50 px-3 py-3 text-sm font-medium text-green-700">A report has already been submitted for this session.</p> : null}
        </Section>
        <PingCard
          courseId={selectedCourse.id}
          scheduleId={selectedSchedule.id}
          classStartTime={selectedSchedule.startTime}
          classEndTime={selectedSchedule.endTime}
          thresholdMinutes={pingThresholdMinutes}
          lectureDate={new Date().toISOString()}
          initialPingSent={Boolean(selectedSchedule.ping)}
          initialPingSentAt={selectedSchedule.ping ? new Date(selectedSchedule.ping.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined}
        />
        <Section title="Presence">
          <Select name="lecturerPresent" options={["PRESENT", "ABSENT", "SUBSTITUTE"]} value={presence} onChange={setPresence} />
          {isAbsent ? <p className="rounded-md bg-red-50 px-3 py-3 text-sm font-medium text-red-700">Only notes are needed when the lecturer is absent.</p> : (
            <>
              <Select name="arrivalStatus" options={["ON_TIME", "LATE"]} />
              <NumberInput name="lateMinutes" label="Minutes late" />
              <label className="flex min-h-12 items-center gap-3"><input type="checkbox" name="earlyDismissal" /> Class ended early</label>
              <NumberInput name="dismissedEarlyMinutes" label="Minutes short" />
            </>
          )}
        </Section>
        {!isAbsent ? (
          <>
            <Section title="Topic coverage">
              {topics.length ? topics.map((topic) => <label key={topic.id} className="flex min-h-12 items-center gap-3 rounded-md border px-3"><input type="checkbox" name="topicIds" value={topic.id} />{topic.title}</label>) : <p className="text-sm text-muted">No outline topics have been uploaded for this course.</p>}
              <label className="flex min-h-12 items-center gap-3"><input type="checkbox" name="previousTopicsRevisited" /> Previous topics revisited</label>
            </Section>
            <Section title="Teaching quality">
              <div className="grid grid-cols-2 gap-2">{["SLIDES", "WHITEBOARD", "HANDOUTS", "VIDEO", "NONE", "OTHER"].map((aid) => <label key={aid} className="flex min-h-12 items-center gap-2 rounded-md border px-3"><input type="checkbox" name="teachingAids" value={aid} />{aid}</label>)}</div>
              <Select name="wasInteractive" options={["YES", "SOMEWHAT", "NO"]} />
              <NumberInput name="studentCount" label="Estimated attendance" />
            </Section>
          </>
        ) : null}
        <Section title="Notes">
          <textarea name="additionalNotes" className="min-h-28 w-full rounded-md border p-3" maxLength={1200} />
        </Section>
        <button disabled={submitting || !online || alreadySubmitted} className="fixed inset-x-4 bottom-4 flex h-14 items-center justify-center gap-2 rounded-md bg-accent font-semibold text-navy shadow-card disabled:opacity-60">
          <Send className="h-5 w-5" aria-hidden /> {submitting ? "Submitting..." : alreadySubmitted ? "Already submitted" : "Submit report"}
        </button>
      </form>
      {pendingPayload ? (
        <div className="fixed inset-0 z-50 flex items-end bg-navy/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-card bg-white p-5 shadow-card">
            <h2 className="font-display text-xl font-bold">Submit this report?</h2>
            <p className="mt-2 text-sm text-muted">Once submitted, this report cannot be edited.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setPendingPayload(null)} className="h-11 flex-1 rounded-md border px-4 font-semibold">Cancel</button>
              <button type="button" onClick={submitConfirmed} disabled={submitting} className="h-11 flex-1 rounded-md bg-accent px-4 font-semibold text-navy disabled:opacity-60">{submitting ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Header({ course, schedule }: { course: CoursePayload; schedule: SchedulePayload }) {
  return <div className="rounded-card bg-navy p-5 text-white shadow-card"><p className="font-mono text-sm text-white/70">{course.code}</p><h1 className="font-display text-2xl font-bold">{course.title}</h1><p className="mt-2 text-sm text-white/70">{dayName(schedule.dayOfWeek)} {schedule.startTime}-{schedule.endTime}{schedule.venue ? `, ${schedule.venue}` : ""}</p></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-card border bg-white p-4 shadow-card"><h2 className="font-display text-lg font-bold">{title}</h2>{children}</section>;
}

function Select({ name, options, labels, value, onChange }: { name: string; options: string[]; labels?: Record<string, string>; value?: string; onChange?: (value: string) => void }) {
  return <select name={name} value={value} onChange={(event) => onChange?.(event.target.value)} className="h-12 w-full rounded-md border px-3" required>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select>;
}

function NumberInput({ name, label }: { name: string; label: string }) {
  return <input name={name} aria-label={label} type="number" min={0} className="h-12 w-full rounded-md border px-3" placeholder={label} />;
}

function dayName(day: number) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] ?? "Scheduled day";
}

function reportErrorMessage(body: unknown) {
  if (!body || typeof body !== "object") return "Report could not be submitted";
  const error = "error" in body && typeof body.error === "string" ? body.error : "Report could not be submitted";
  const details = "details" in body && body.details && typeof body.details === "object" ? body.details : null;
  const fieldErrors = details && "fieldErrors" in details && details.fieldErrors && typeof details.fieldErrors === "object" ? details.fieldErrors : null;
  if (!fieldErrors) return error;
  const first = Object.entries(fieldErrors).find(([, messages]) => Array.isArray(messages) && messages.length > 0);
  if (!first) return error;
  const [field, messages] = first as [string, string[]];
  return `${field}: ${messages[0]}`;
}

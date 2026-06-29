"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";

type CoursePayload = {
  id: string;
  code: string;
  title: string;
  schedule: Array<{ id: string; startTime: string; endTime: string }>;
  outline: { topics: Array<{ id: string; title: string; weekNumber: number | null }> } | null;
};

export function ReportForm({ course }: { course: CoursePayload }) {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [presence, setPresence] = useState("PRESENT");
  const topics = useMemo(() => course.outline?.topics.slice(0, 6) ?? [], [course.outline?.topics]);
  const isAbsent = presence === "ABSENT";

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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirm("Once submitted, this report cannot be edited.")) return;
    const form = new FormData(event.currentTarget);
    const teachingAids = form.getAll("teachingAids");
    const normalizedTeachingAids = isAbsent || teachingAids.length === 0 || teachingAids.includes("NONE") ? ["NONE"] : teachingAids;
    setSubmitting(true);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        scheduleId: course.schedule[0]?.id,
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
      })
    });
    setSubmitting(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      return toast.error(reportErrorMessage(body));
    }
    setSubmitted(true);
    toast.success("Report submitted");
  }

  if (submitted) {
    return <div className="rounded-card border bg-white p-6 text-center shadow-card"><h1 className="font-display text-2xl font-bold">Submitted</h1><p className="mt-2 text-muted">Your report has been recorded anonymously.</p></div>;
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-24">
      {!online ? <div className="sticky top-0 z-10 rounded-md bg-warning px-4 py-3 text-sm font-semibold">Offline. Reconnect before submitting.</div> : null}
      <Header course={course} />
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
            {topics.map((topic) => <label key={topic.id} className="flex min-h-12 items-center gap-3 rounded-md border px-3"><input type="checkbox" name="topicIds" value={topic.id} />{topic.title}</label>)}
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
      <button disabled={submitting || !online} className="fixed inset-x-4 bottom-4 flex h-14 items-center justify-center gap-2 rounded-md bg-accent font-semibold text-navy shadow-card disabled:opacity-60">
        <Send className="h-5 w-5" aria-hidden /> {submitting ? "Submitting..." : "Submit report"}
      </button>
    </form>
  );
}

function Header({ course }: { course: CoursePayload }) {
  return <div className="rounded-card bg-navy p-5 text-white shadow-card"><p className="font-mono text-sm text-white/70">{course.code}</p><h1 className="font-display text-2xl font-bold">{course.title}</h1></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3 rounded-card border bg-white p-4 shadow-card"><h2 className="font-display text-lg font-bold">{title}</h2>{children}</section>;
}

function Select({ name, options, value, onChange }: { name: string; options: string[]; value?: string; onChange?: (value: string) => void }) {
  return <select name={name} value={value} onChange={(event) => onChange?.(event.target.value)} className="h-12 w-full rounded-md border px-3" required>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function NumberInput({ name, label }: { name: string; label: string }) {
  return <input name={name} aria-label={label} type="number" min={0} className="h-12 w-full rounded-md border px-3" placeholder={label} />;
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

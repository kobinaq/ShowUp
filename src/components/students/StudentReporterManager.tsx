"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search, UserMinus } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";

type Reporter = {
  id: string;
  alias: string;
  realName?: string | null;
  realEmail?: string | null;
  realPhone?: string | null;
  isActive: boolean;
  createdAt: string;
};

type ReportSummary = {
  reporter: string;
  presence: string;
  arrivalStatus?: string | null;
  lateMinutes?: number | null;
  studentCount?: number | null;
  topics: string[];
  notes?: string | null;
};

type Comparison = {
  id: string;
  date: string;
  session: string;
  reports: ReportSummary[];
};

export type StudentCourse = {
  id: string;
  code: string;
  title: string;
  department: string;
  lecturer: string;
  reporters: Reporter[];
  comparisons: Comparison[];
};

export function StudentReporterManager({ courses }: { courses: StudentCourse[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => {
      const reporterText = course.reporters.map((reporter) => `${reporter.alias} ${reporter.realName ?? ""} ${reporter.realEmail ?? ""}`).join(" ");
      return `${course.code} ${course.title} ${course.department} ${course.lecturer} ${reporterText}`.toLowerCase().includes(normalized);
    });
  }, [courses, query]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses, departments, lecturers, or reporters..."
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
        />
      </div>

      <div className="grid gap-4">
        {filtered.map((course) => (
          <CourseReporterCard key={course.id} course={course} />
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <p className="font-semibold text-navy">No courses match this search.</p>
            <p className="mt-1 text-sm text-muted">Try the course code, lecturer, department, or reporter name.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CourseReporterCard({ course }: { course: StudentCourse }) {
  const activeReporters = course.reporters.filter((reporter) => reporter.isActive);
  const openSlots = Math.max(0, 2 - activeReporters.length);

  return (
    <article className="rounded-lg border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href={`/courses/${course.id}`} className="font-display text-lg font-bold text-navy hover:text-primary">
            {course.code} - {course.title}
          </Link>
          <p className="mt-1 text-sm text-muted">{course.department} · {course.lecturer}</p>
        </div>
        <StatusBadge tone={activeReporters.length === 2 ? "green" : activeReporters.length === 1 ? "amber" : "red"}>
          {activeReporters.length}/2 active reporters
        </StatusBadge>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((slotIndex) => {
              const reporter = activeReporters[slotIndex];
              return reporter ? (
                <ReporterSlot key={reporter.id} courseId={course.id} reporter={reporter} slotNumber={slotIndex + 1} />
              ) : (
                <EmptySlot key={`empty-${slotIndex}`} slotNumber={slotIndex + 1} />
              );
            })}
          </div>
          {openSlots > 0 ? <AddReporterForm courseId={course.id} nextSlot={activeReporters.length + 1} /> : null}
          {course.reporters.some((reporter) => !reporter.isActive) ? (
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-navy">Previous reporters</summary>
              <div className="mt-3 grid gap-2">
                {course.reporters.filter((reporter) => !reporter.isActive).map((reporter) => (
                  <p key={reporter.id} className="rounded-md bg-white px-3 py-2 text-sm text-slate-600">
                    <span className="font-mono text-navy">{reporter.alias}</span>
                    {reporter.realName ? ` · ${reporter.realName}` : ""}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-navy">Recent report comparisons</p>
          {course.comparisons.length ? course.comparisons.map((comparison) => (
            <ComparisonCard key={comparison.id} comparison={comparison} />
          )) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-muted">
              Comparisons will appear after two reporters submit for the same class session.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ReporterSlot({ courseId, reporter, slotNumber }: { courseId: string; reporter: Reporter; slotNumber: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    if (!window.confirm("Deactivate this reporter for the course?")) return;
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/reps`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignmentId: reporter.id })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not deactivate reporter");
      return;
    }
    toast.success("Reporter deactivated");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Reporter {slotNumber}</p>
          <p className="mt-2 font-semibold text-navy">{reporter.realName ?? "Student reporter"}</p>
          <p className="mt-1 font-mono text-xs text-slate-600">{reporter.alias}</p>
          {reporter.realEmail ? <p className="mt-2 text-sm text-muted">{reporter.realEmail}</p> : null}
          {reporter.realPhone ? <p className="text-sm text-muted">{reporter.realPhone}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void deactivate()}
          disabled={loading}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          aria-label={`Deactivate ${reporter.realName ?? reporter.alias}`}
          title="Deactivate reporter"
        >
          <UserMinus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function EmptySlot({ slotNumber }: { slotNumber: number }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Reporter {slotNumber}</p>
      <p className="mt-2 text-sm text-muted">Open reporter slot</p>
    </div>
  );
}

function AddReporterForm({ courseId, nextSlot }: { courseId: string; nextSlot: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch(`/api/courses/${courseId}/reps`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        realName: form.get("realName"),
        realEmail: form.get("realEmail"),
        realPhone: form.get("realPhone"),
        rotationOrder: nextSlot,
        rotationWeeks: Number(form.get("rotationWeeks") || 4)
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not assign reporter");
      return;
    }
    toast.success("Reporter assigned");
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-bold text-navy">Assign reporter {nextSlot}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <input name="realName" required placeholder="Student name" className="h-10 rounded-md border px-3 text-sm" />
        <input name="realEmail" required type="email" placeholder="Student email" className="h-10 rounded-md border px-3 text-sm" />
        <input name="realPhone" required placeholder="Student phone" className="h-10 rounded-md border px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input name="rotationWeeks" required type="number" min={1} max={16} defaultValue={4} aria-label="Rotation weeks" className="h-10 rounded-md border px-3 text-sm sm:w-40" />
        <button disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-navy disabled:opacity-60">
          <Plus className="h-4 w-4" aria-hidden />
          {loading ? "Assigning..." : "Assign reporter"}
        </button>
      </div>
    </form>
  );
}

function ComparisonCard({ comparison }: { comparison: Comparison }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-muted">{comparison.date} · {comparison.session}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {comparison.reports.slice(0, 2).map((report) => (
          <div key={report.reporter} className="rounded-md bg-white p-3 text-sm">
            <p className="font-mono text-xs font-semibold text-navy">{report.reporter}</p>
            <dl className="mt-2 space-y-1 text-slate-600">
              <Detail label="Presence" value={report.presence} />
              <Detail label="Arrival" value={report.arrivalStatus ?? "-"} />
              <Detail label="Late" value={typeof report.lateMinutes === "number" ? `${report.lateMinutes} mins` : "-"} />
              <Detail label="Students" value={typeof report.studentCount === "number" ? report.studentCount.toString() : "-"} />
              <Detail label="Topics" value={report.topics.length ? report.topics.join(", ") : "-"} />
            </dl>
            {report.notes ? <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-muted">{report.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[74px_1fr] gap-2">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

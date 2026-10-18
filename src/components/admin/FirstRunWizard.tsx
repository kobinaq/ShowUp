"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Circle } from "lucide-react";
import { SectionPanel } from "@/components/shared/Panels";

const steps = [
  { id: "structure", title: "University structure", detail: "Faculties, departments, and active semester", href: "#setup" },
  { id: "people", title: "Lecturers & logins", detail: "Create lecturer records, then link LECTURER users", href: "#setup" },
  { id: "courses", title: "Courses & reps", detail: "Add courses, then assign primary/backup class reps", href: "/courses" },
  { id: "students", title: "Student rosters", detail: "Enroll students for manual attendance sheets", href: "/students" },
  { id: "timetable", title: "Timetable CSV", detail: "Import the semester timetable by faculty/department", href: "/timetable" }
] as const;

export function FirstRunWizard({
  completedAt,
  completeness
}: {
  completedAt: string | null;
  completeness: Array<{ label: string; value: number }>;
}) {
  const [marking, setMarking] = useState(false);
  const openGaps = completeness.filter((item) => item.value > 0);
  const done = Boolean(completedAt) && openGaps.length === 0;

  async function markComplete() {
    setMarking(true);
    const response = await fetch("/api/admin/setup/wizard", { method: "POST" });
    setMarking(false);
    if (!response.ok) {
      toast.error("Could not mark wizard complete");
      return;
    }
    toast.success("Setup wizard marked complete");
  }

  if (done) return null;

  return (
    <SectionPanel
      title="First-run setup wizard"
      description="Import structure, people, reps, students, and timetable before the university demo. Existing flows keep working while you fill gaps."
    >
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3 rounded-md border border-slate-200 px-3 py-3">
            <span className="mt-0.5 text-muted">
              {openGaps.length === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : <Circle className="h-5 w-5" aria-hidden />}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy">
                {index + 1}. {step.title}
              </p>
              <p className="text-xs text-muted">{step.detail}</p>
              <Link href={step.href} className="mt-1 inline-block text-xs font-semibold text-navy underline">
                Continue
              </Link>
            </div>
          </li>
        ))}
      </ol>
      {openGaps.length ? (
        <ul className="mt-4 space-y-1 text-sm text-muted">
          {openGaps.map((gap) => (
            <li key={gap.label}>
              {gap.label}: <span className="font-semibold text-navy">{gap.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          disabled={marking || Boolean(completedAt)}
          onClick={() => void markComplete()}
          className="mt-4 h-11 rounded-md bg-accent px-4 text-sm font-semibold text-navy disabled:opacity-60"
        >
          {completedAt ? "Wizard completed" : marking ? "Saving…" : "Mark wizard complete"}
        </button>
      )}
    </SectionPanel>
  );
}

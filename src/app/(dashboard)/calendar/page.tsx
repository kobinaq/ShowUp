import { BlackoutPanel } from "@/components/calendar/BlackoutPanel";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Academic calendar</h1>
        <p className="mt-1 text-sm text-muted">Blackouts for holidays, exams, strikes, and closures that suppress quality flags.</p>
      </div>
      <BlackoutPanel />
    </div>
  );
}

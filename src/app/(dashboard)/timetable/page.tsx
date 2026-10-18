import { TimetableImportPanel } from "@/components/timetable/TimetableImportPanel";
import { SessionStatusBoard } from "@/components/timetable/SessionStatusBoard";

export default function TimetablePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Timetable</h1>
        <p className="mt-1 text-sm text-muted">Import the semester timetable and manage dated lecture session status.</p>
      </div>
      <TimetableImportPanel />
      <SessionStatusBoard />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Clock, Settings2 } from "lucide-react";
import { SectionPanel } from "@/components/shared/Panels";

type SettingsIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
type NewSemesterState = { name: string; startDate: string; endDate: string; makeActive: boolean };

type SettingsState = {
  latePingThresholdMinutes: number;
  submissionWindowHours: number;
  flagCoverageWeek6: number;
  flagCoverageWeek10: number;
  flagRepeatThreshold: number;
  lecturerAbsenceSmsEnabled: boolean;
  lecturerAbsenceEmailEnabled: boolean;
  latePingSmsEnabled: boolean;
  latePingEmailEnabled: boolean;
  qaLatePingEmailEnabled: boolean;
  showUpAiEnabled: boolean;
  activeSemesterId: string | null;
};

type Props = {
  initialSettings: SettingsState;
  semesters: Array<{ id: string; name: string }>;
};

export function SettingsForm({ initialSettings, semesters }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [newSemester, setNewSemester] = useState<NewSemesterState>({ name: "", startDate: "", endDate: "", makeActive: true });
  const [loading, setLoading] = useState(false);

  async function save() {
    const semesterPayload = newSemester.name.trim() || newSemester.startDate || newSemester.endDate
      ? { newSemester: { ...newSemester, name: newSemester.name.trim() } }
      : {};
    setLoading(true);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...settings, ...semesterPayload })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not save settings");
      return;
    }
    setNewSemester({ name: "", startDate: "", endDate: "", makeActive: true });
    toast.success("Settings saved");
    router.refresh();
  }

  function update<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <SectionPanel
        title="Reporting"
        description="Control report timing and the active academic period for this university."
        action={<SaveButton loading={loading} onClick={() => void save()} />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberField
            label="Submission window"
            helper="Reports close this many hours after the scheduled class end time."
            value={settings.submissionWindowHours}
            min={1}
            max={6}
            suffix="hours"
            onChange={(value) => update("submissionWindowHours", value)}
          />
          <label className="space-y-2 text-sm font-semibold">
            <span>Active semester</span>
            <select
              value={settings.activeSemesterId ?? ""}
              onChange={(event) => update("activeSemesterId", event.target.value || null)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent"
            >
              <option value="">No active semester</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </select>
            <span className="block text-xs font-normal leading-5 text-muted">Only one semester can be active for a university.</span>
          </label>
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
            <p className="text-sm font-bold text-navy">Add semester</p>
            <div className="grid gap-3 md:grid-cols-3">
              <input value={newSemester.name} onChange={(event) => setNewSemester((current) => ({ ...current, name: event.target.value }))} placeholder="2026/2027 Second Semester" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" />
              <input type="date" value={newSemester.startDate} onChange={(event) => setNewSemester((current) => ({ ...current, startDate: event.target.value }))} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" />
              <input type="date" value={newSemester.endDate} onChange={(event) => setNewSemester((current) => ({ ...current, endDate: event.target.value }))} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700" />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input type="checkbox" checked={newSemester.makeActive} onChange={(event) => setNewSemester((current) => ({ ...current, makeActive: event.target.checked }))} />
              Set as active semester when saved
            </label>
          </div>
          <ReadOnlySetting icon={CheckCircle2} title="Absent report shortcut" description="Enabled. Reporters can submit an absence without teaching details." />
          <ReadOnlySetting icon={Clock} title="Duplicate report policy" description="One report is allowed per schedule and class date." />
        </div>
      </SectionPanel>

      <SectionPanel title="Late Ping" description="Control when reporters can alert lecturers and which follow-up messages are sent.">
        <div className="grid gap-4 lg:grid-cols-2">
          <NumberField
            label="Late ping threshold"
            helper="Reporter can ping this many minutes after class starts."
            value={settings.latePingThresholdMinutes}
            min={15}
            max={60}
            step={5}
            suffix="minutes"
            onChange={(value) => update("latePingThresholdMinutes", value)}
          />
          <div className="grid gap-3">
            <Toggle label="Send lecturer SMS for late pings" checked={settings.latePingSmsEnabled} onChange={(value) => update("latePingSmsEnabled", value)} />
            <Toggle label="Send lecturer email for late pings" checked={settings.latePingEmailEnabled} onChange={(value) => update("latePingEmailEnabled", value)} />
            <Toggle label="Email QA after late ping" checked={settings.qaLatePingEmailEnabled} onChange={(value) => update("qaLatePingEmailEnabled", value)} />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Notifications" description="Control absence notices and preview the read-only lecturer message.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <Toggle label="Send lecturer SMS for absences" checked={settings.lecturerAbsenceSmsEnabled} onChange={(value) => update("lecturerAbsenceSmsEnabled", value)} />
            <Toggle label="Send lecturer email for absences" checked={settings.lecturerAbsenceEmailEnabled} onChange={(value) => update("lecturerAbsenceEmailEnabled", value)} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-bold text-navy">Absence message preview</p>
            <p className="mt-2">
              You were reported absent for your CENG301 class today at 3pm. Contact your HOD if incorrect. Do not reply to this message.
            </p>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Quality Rules" description="Thresholds used when ShowUp flags repeat issues and topic coverage risk.">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="Repeat issue threshold" helper="Repeated absence/lateness flag count." value={settings.flagRepeatThreshold} min={2} max={10} onChange={(value) => update("flagRepeatThreshold", value)} />
          <NumberField label="Week 6 coverage" helper="Minimum topic coverage by week 6." value={settings.flagCoverageWeek6} min={0} max={100} suffix="%" onChange={(value) => update("flagCoverageWeek6", value)} />
          <NumberField label="Week 10 coverage" helper="Minimum topic coverage by week 10." value={settings.flagCoverageWeek10} min={0} max={100} suffix="%" onChange={(value) => update("flagCoverageWeek10", value)} />
        </div>
      </SectionPanel>

      <SectionPanel title="ShowUp AI" description="Control database-only assistant access for this university.">
        <Toggle label="Enable ShowUp AI" checked={settings.showUpAiEnabled} onChange={(value) => update("showUpAiEnabled", value)} />
      </SectionPanel>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <SaveButton loading={loading} onClick={() => void save()} />
      </div>
    </div>
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-card disabled:opacity-60">
      <Settings2 className="h-4 w-4" aria-hidden />
      {loading ? "Saving..." : "Save settings"}
    </button>
  );
}

function NumberField({
  label,
  helper,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange
}: {
  label: string;
  helper: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-primary" />
        <span className="min-w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-center font-mono text-sm text-navy">
          {value}{suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-10 w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-accent"
      />
      <span className="block text-xs font-normal leading-5 text-muted">{helper}</span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex min-h-12 items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold transition hover:border-primary">
      <span>{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? "bg-primary" : "bg-slate-300"}`} aria-hidden>
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function ReadOnlySetting({ icon: Icon, title, description }: { icon: SettingsIcon; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Icon className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
      <div>
        <p className="text-sm font-bold text-navy">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const [settings, semesters, activeSemester] = await Promise.all([
        prisma.universitySettings.upsert({
          where: { universityId: profile.universityId },
          update: {},
          create: { universityId: profile.universityId }
        }),
        prisma.semester.findMany({ where: { universityId: profile.universityId }, orderBy: { startDate: "desc" } }),
        prisma.semester.findFirst({ where: { universityId: profile.universityId, isActive: true }, select: { id: true } })
      ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">University-level operational settings.</p>
      </header>
      <SettingsForm
        initialSettings={{
          latePingThresholdMinutes: settings.latePingThresholdMinutes,
          submissionWindowHours: settings.submissionWindowHours,
          flagCoverageWeek6: settings.flagCoverageWeek6,
          flagCoverageWeek10: settings.flagCoverageWeek10,
          flagRepeatThreshold: settings.flagRepeatThreshold,
          lecturerAbsenceSmsEnabled: settings.lecturerAbsenceSmsEnabled,
          lecturerAbsenceEmailEnabled: settings.lecturerAbsenceEmailEnabled,
          latePingSmsEnabled: settings.latePingSmsEnabled,
          latePingEmailEnabled: settings.latePingEmailEnabled,
          qaLatePingEmailEnabled: settings.qaLatePingEmailEnabled,
          showUpAiEnabled: settings.showUpAiEnabled,
          activeSemesterId: activeSemester?.id ?? null
        }}
        semesters={semesters.map((semester) => ({ id: semester.id, name: semester.name }))}
      />
    </div>
  );
}

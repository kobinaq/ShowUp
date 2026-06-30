import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { universityId: true } }) : null;
  const [settings, semesters, activeSemester] = profile
    ? await Promise.all([
        prisma.universitySettings.upsert({
          where: { universityId: profile.universityId },
          update: {},
          create: { universityId: profile.universityId }
        }),
        prisma.semester.findMany({ where: { universityId: profile.universityId }, orderBy: { startDate: "desc" } }),
        prisma.semester.findFirst({ where: { universityId: profile.universityId, isActive: true }, select: { id: true } })
      ])
    : [null, [], null] as const;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">University-level operational settings.</p>
      </header>
      {settings ? (
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
          providerStatus={{
            groqConfigured: Boolean(process.env.GROQ_API_KEY),
            arkeselConfigured: Boolean(process.env.ARKESEL_API_KEY && process.env.ARKESEL_SENDER_ID),
            resendConfigured: Boolean(process.env.RESEND_API_KEY)
          }}
        />
      ) : null}
    </div>
  );
}

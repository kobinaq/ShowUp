import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { universityId: true } }) : null;
  const settings = profile
    ? await prisma.universitySettings.upsert({
        where: { universityId: profile.universityId },
        update: {},
        create: { universityId: profile.universityId }
      })
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">University-level operational settings.</p>
      </header>
      <SettingsForm initialThreshold={settings?.latePingThresholdMinutes ?? 30} />
    </div>
  );
}

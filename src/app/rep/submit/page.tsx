import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/reports/ReportForm";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function RepSubmitPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id } }) : null;
  const today = new Date();
  const assignments = profile
    ? await prisma.repAssignment.findMany({
        where: { profileId: profile.id, isActive: true },
        include: {
          course: {
            include: {
              schedule: {
                include: {
                  reports: {
                    where: {
                      submittedById: profile.id,
                      lectureDate: { gte: startOfDay(today), lte: endOfDay(today) }
                    },
                    select: { id: true }
                  },
                  latePings: {
                    where: {
                      lectureDate: { gte: startOfDay(today), lte: endOfDay(today) }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                  }
                },
                orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
              },
              outline: { include: { topics: { orderBy: { order: "asc" } } } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      })
    : null;
  if (!assignments?.length) return <EmptyState title="No active reporting assignment." />;
  const settings = await prisma.universitySettings.findUnique({ where: { universityId: profile!.universityId } });
  const payload = assignments.map((assignment) => ({
    id: assignment.id,
    course: {
      id: assignment.course.id,
      code: assignment.course.code,
      title: assignment.course.title,
      outline: assignment.course.outline
        ? {
            topics: assignment.course.outline.topics.map((topic) => ({
              id: topic.id,
              title: topic.title,
              weekNumber: topic.weekNumber
            }))
          }
        : null,
      schedule: assignment.course.schedule.map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        venue: schedule.venue,
        submittedToday: schedule.reports.length > 0,
        ping: schedule.latePings[0]
          ? {
              createdAt: schedule.latePings[0].createdAt.toISOString(),
              acknowledgedAt: schedule.latePings[0].acknowledgedAt?.toISOString() ?? null
            }
          : null
      }))
    }
  }));
  return (
    <div className="space-y-4">
      <ReportForm assignments={payload} pingThresholdMinutes={settings?.latePingThresholdMinutes ?? 30} />
    </div>
  );
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

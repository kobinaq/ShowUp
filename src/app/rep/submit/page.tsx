import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { ReportForm } from "@/components/reports/ReportForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { sessionDayRange } from "@/lib/utils/sessionTime";
import { redirect } from "next/navigation";

export default async function RepSubmitPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const today = new Date();
  const assignments = await prisma.repAssignment.findMany({
        where: { profileId: profile.id, isActive: true },
        include: {
          course: {
            include: {
              schedule: {
                include: {
                  reports: {
                    where: {
                      submittedById: profile.id,
                      lectureDate: sessionDayRange(today)
                    },
                    select: { id: true }
                  },
                  latePings: {
                    where: {
                      lectureDate: sessionDayRange(today)
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
      });
  if (!assignments.length) return <EmptyState title="No active reporting assignment." />;
  const settings = await prisma.universitySettings.findUnique({ where: { universityId: profile.universityId } });
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
      <ReportForm assignments={payload} pingThresholdMinutes={settings?.latePingThresholdMinutes ?? 30} submissionWindowHours={settings?.submissionWindowHours ?? 2} />
    </div>
  );
}

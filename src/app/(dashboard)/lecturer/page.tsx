import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard, SectionPanel } from "@/components/shared/Panels";
import { EmptyState } from "@/components/shared/EmptyState";
import { LecturerFlagRespond } from "@/components/lecturer/LecturerFlagRespond";
import { buildLecturerAttention } from "@/lib/services/role-attention";

export default async function LecturerHomePage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "LECTURER" && profile.role !== "SUPER_ADMIN") redirect("/dashboard");
  if (!profile.lecturerId) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Lecturer" title="Your home" description="Link this login to a Lecturer record to see your scorecard and tasks." />
        <EmptyState
          title="Lecturer profile not linked"
          description="Ask IT to create your user with a lecturerId, or complete the admin setup wizard."
          action={<Link href="/support" className="text-sm font-semibold text-navy underline">Contact IT support</Link>}
        />
      </div>
    );
  }

  const lecturerId = profile.lecturerId;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [lecturer, flags, openAttendance, recentSessions, facilitiesOpen, scorecardReports] = await Promise.all([
    prisma.lecturer.findUnique({
      where: { id: lecturerId },
      include: {
        courses: {
          include: {
            schedule: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
            department: { select: { name: true } }
          },
          orderBy: { code: "asc" }
        }
      }
    }),
    prisma.flag.findMany({
      where: { lecturerId, isResolved: false },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.attendanceSession.findMany({
      where: { course: { lecturerId }, status: "OPEN" },
      include: { course: { select: { id: true, code: true } } },
      orderBy: { lectureDate: "desc" },
      take: 8
    }),
    prisma.lectureSession.findMany({
      where: {
        course: { lecturerId },
        lectureDate: { gte: todayStart },
        confirmation: null
      },
      include: { course: { select: { code: true } } },
      orderBy: { lectureDate: "asc" },
      take: 8
    }),
    prisma.facilitiesIssue.count({
      where: {
        status: "OPEN",
        OR: [{ session: { course: { lecturerId } } }, { room: { sessions: { some: { course: { lecturerId } } } } }]
      }
    }),
    prisma.lectureReport.findMany({
      where: { course: { lecturerId }, isVoided: false },
      include: { lectureSession: { select: { attributedToFacilities: true } } }
    })
  ]);

  if (!lecturer) {
    return (
      <EmptyState title="Lecturer record missing" description="Your account points at a lecturer id that no longer exists." />
    );
  }

  const held = scorecardReports.filter((r) => r.lecturerPresent !== "ABSENT").length;
  const punctual = scorecardReports.filter((r) => {
    if (r.lectureSession?.attributedToFacilities) return true;
    return r.arrivalStatus !== "LATE";
  }).length;
  const attendanceRate = scorecardReports.length ? Math.round((held / scorecardReports.length) * 100) : 0;
  const punctualityRate = scorecardReports.length ? Math.round((punctual / scorecardReports.length) * 100) : 0;

  const attention = buildLecturerAttention({
    openFlags: flags.map((f) => ({ id: f.id, type: f.type, message: f.message })),
    openAttendanceSessions: openAttendance.map((s) => ({
      id: s.id,
      courseCode: s.course.code,
      courseId: s.course.id
    })),
    pendingConfirmSessions: recentSessions.map((s) => ({ id: s.id, courseCode: s.course.code })),
    facilitiesOpen
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lecturer"
        title={`Hello, ${lecturer.firstName}`}
        description="What needs your attention today — scorecard, open flags, attendance, and session confirmation."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Attendance rate" value={`${attendanceRate}%`} helper="Held vs reported sessions" tone="green" />
        <MetricCard label="Punctuality" value={`${punctualityRate}%`} helper="Facilities delays excluded" tone="green" />
        <MetricCard label="Open flags" value={flags.length} helper="Respond below — QA resolves" tone={flags.length ? "amber" : "green"} />
        <MetricCard label="Open attendance" value={openAttendance.length} helper="Roster sessions still open" tone={openAttendance.length ? "blue" : "green"} />
      </div>

      <SectionPanel title="Needs attention today" description="Highest-signal items for your courses.">
        {attention.length ? (
          <ul className="space-y-2">
            {attention.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex flex-col rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-navy/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy">{item.title}</p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </div>
                  <span className="mt-2 text-xs font-semibold text-navy sm:mt-0">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing urgent right now." description="New flags, open attendance sheets, and unconfirmed sessions will appear here." />
        )}
      </SectionPanel>

      <SectionPanel title="Open flags — respond" description="Acknowledge or add a note. QA still resolves flags.">
        {flags.length ? (
          <ul className="space-y-3">
            {flags.map((flag) => (
              <li key={flag.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-semibold text-navy">{flag.type.replaceAll("_", " ")}</p>
                <p className="mt-1 text-sm text-muted">{flag.message}</p>
                <LecturerFlagRespond flagId={flag.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No open flags." description="When a class-rep report raises a flag on your sessions, you can respond here." />
        )}
      </SectionPanel>

      <SectionPanel title="Your courses" description={`${lecturer.courses.length} course${lecturer.courses.length === 1 ? "" : "s"} this semester.`}>
        {lecturer.courses.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {lecturer.courses.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`} className="block rounded-md border border-slate-200 px-3 py-3 hover:border-navy/30">
                  <p className="font-mono text-xs text-muted">{course.code}</p>
                  <p className="font-semibold text-navy">{course.title}</p>
                  <p className="mt-1 text-xs text-muted">{course.department.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No courses assigned." description="IT can assign courses to your lecturer record in the setup wizard." />
        )}
      </SectionPanel>
    </div>
  );
}

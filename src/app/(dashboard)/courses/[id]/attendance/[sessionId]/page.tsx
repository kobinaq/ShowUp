import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { andWhere, courseScope } from "@/lib/auth/scope";
import { attendanceManagers } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/PageHeader";
import { AttendanceMarkSheet } from "@/components/attendance/AttendanceMarkSheet";

export default async function AttendanceSessionPage({
  params
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const session = await prisma.attendanceSession.findFirst({
    where: andWhere({ id: sessionId, courseId: id }, { course: courseScope(profile) }),
    include: {
      course: { select: { code: true, title: true } },
      records: {
        include: { student: true },
        orderBy: { student: { fullName: "asc" } }
      }
    }
  });
  if (!session) notFound();
  const canManage = attendanceManagers.includes(profile.role);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: session.course.code, href: `/courses/${id}` },
          { label: "Attendance" }
        ]}
        eyebrow="Student attendance"
        title={`${session.course.code} · ${new Date(session.lectureDate).toLocaleDateString()}`}
        description={`${session.course.title}. Manual roster marking only — no student accounts.`}
      />
      <AttendanceMarkSheet
        sessionId={session.id}
        courseId={id}
        initialStatus={session.status}
        canManage={canManage}
        initialRecords={session.records.map((record) => ({
          id: record.id,
          studentId: record.studentId,
          status: record.status,
          student: {
            studentNumber: record.student.studentNumber,
            fullName: record.student.fullName,
            email: record.student.email
          }
        }))}
      />
    </div>
  );
}

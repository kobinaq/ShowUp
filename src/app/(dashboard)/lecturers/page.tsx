import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function LecturersPage() {
  const lecturers = await prisma.lecturer.findMany({ include: { department: true, courses: true, flags: true }, orderBy: { lastName: "asc" } });
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {lecturers.map((lecturer) => (
        <Link key={lecturer.id} href={`/lecturers/${lecturer.id}`} className="rounded-card bg-white p-5 shadow-card hover:ring-2 hover:ring-accent">
          <h2 className="font-display text-xl font-bold">{lecturer.firstName} {lecturer.lastName}</h2>
          <p className="text-sm text-muted">{lecturer.department.name}</p>
          <div className="mt-4 flex gap-4 font-mono text-sm">
            <span>{lecturer.courses.length} courses</span>
            <span>{lecturer.flags.length} flags</span>
          </div>
        </Link>
      ))}
    </section>
  );
}

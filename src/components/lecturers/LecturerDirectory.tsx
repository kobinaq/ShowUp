"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type LecturerDirectoryItem = {
  id: string;
  href: string;
  name: string;
  department: string;
  email: string;
  courseCount: number;
  flagCount: number;
  courses: Array<{ id: string; code: string; title: string }>;
};

export function LecturerDirectory({ lecturers }: { lecturers: LecturerDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [courseId, setCourseId] = useState("all");

  const departments = useMemo(
    () => ["all", ...Array.from(new Set(lecturers.map((lecturer) => lecturer.department))).sort((a, b) => a.localeCompare(b))],
    [lecturers]
  );

  const courses = useMemo(() => {
    const map = new Map<string, { id: string; code: string; title: string }>();
    lecturers.forEach((lecturer) => lecturer.courses.forEach((course) => map.set(course.id, course)));
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [lecturers]);

  const visibleCourses = useMemo(() => {
    if (department === "all") return courses;
    const courseIds = new Set(
      lecturers
        .filter((lecturer) => lecturer.department === department)
        .flatMap((lecturer) => lecturer.courses.map((course) => course.id))
    );
    return courses.filter((course) => courseIds.has(course.id));
  }, [courses, department, lecturers]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return lecturers.filter((lecturer) => {
      const matchesDepartment = department === "all" || lecturer.department === department;
      const matchesCourse = courseId === "all" || lecturer.courses.some((course) => course.id === courseId);
      const searchable = `${lecturer.name} ${lecturer.email} ${lecturer.department} ${lecturer.courses
        .map((course) => `${course.code} ${course.title}`)
        .join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesDepartment && matchesCourse && matchesQuery;
    });
  }, [courseId, department, lecturers, query]);

  function selectDepartment(nextDepartment: string) {
    setDepartment(nextDepartment);
    if (nextDepartment === "all") return;
    const nextCourseIds = new Set(
      lecturers
        .filter((lecturer) => lecturer.department === nextDepartment)
        .flatMap((lecturer) => lecturer.courses.map((course) => course.id))
    );
    if (courseId !== "all" && !nextCourseIds.has(courseId)) setCourseId("all");
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search lecturers, departments, courses, email..."
          className="min-h-12 w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-muted">Departments</p>
        <div className="flex flex-wrap gap-2">
          {departments.map((item) => {
            const active = department === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => selectDepartment(item)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5",
                  active ? "border-navy bg-navy text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-navy"
                )}
              >
                {item === "all" ? "All departments" : item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-xl space-y-2">
        <label htmlFor="lecturer-course-filter" className="text-sm font-bold text-muted">
          Course
        </label>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <select
            id="lecturer-course-filter"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="min-h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          >
            <option value="all">All courses</option>
            {visibleCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_0.7fr_0.7fr] bg-slate-50 px-4 py-3 text-sm font-bold text-muted max-md:hidden">
          <span>Lecturer</span>
          <span>Department</span>
          <span>Courses</span>
          <span>Flags</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((lecturer, index) => (
            <Link
              key={lecturer.id}
              href={lecturer.href}
              className="grid gap-3 px-4 py-4 text-sm transition duration-200 hover:bg-accent/5 focus:bg-accent/5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_0.7fr_0.7fr]"
              style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}
            >
              <span className="animate-[showup-row-in_220ms_ease-out_both]">
                <span className="block font-semibold text-navy">{lecturer.name}</span>
                <span className="mt-1 block truncate text-xs text-muted">{lecturer.email}</span>
              </span>
              <span className="animate-[showup-row-in_220ms_ease-out_both] text-slate-700">{lecturer.department}</span>
              <span className="animate-[showup-row-in_220ms_ease-out_both] font-mono font-semibold text-slate-700">{lecturer.courseCount}</span>
              <span className={cn("animate-[showup-row-in_220ms_ease-out_both] font-mono font-semibold", lecturer.flagCount > 0 ? "text-red-600" : "text-slate-500")}>
                {lecturer.flagCount}
              </span>
            </Link>
          ))}
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-semibold text-navy">No lecturers match these filters.</p>
              <p className="mt-1 text-sm text-muted">Try a different department, course, or search term.</p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-navy">{filtered.length}</span> of <span className="font-semibold text-navy">{lecturers.length}</span> lecturers.
      </p>
    </div>
  );
}

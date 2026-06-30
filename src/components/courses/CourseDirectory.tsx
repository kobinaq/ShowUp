"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CourseDirectoryItem = {
  id: string;
  href: string;
  code: string;
  title: string;
  department: string;
  lecturer: { id: string; name: string };
  schedule: string;
  topicCount: number;
};

export function CourseDirectory({ courses }: { courses: CourseDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [lecturerId, setLecturerId] = useState("all");

  const departments = useMemo(
    () => ["all", ...Array.from(new Set(courses.map((course) => course.department))).sort((a, b) => a.localeCompare(b))],
    [courses]
  );

  const lecturers = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    courses.forEach((course) => map.set(course.lecturer.id, course.lecturer));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [courses]);

  const visibleLecturers = useMemo(() => {
    if (department === "all") return lecturers;
    const ids = new Set(courses.filter((course) => course.department === department).map((course) => course.lecturer.id));
    return lecturers.filter((lecturer) => ids.has(lecturer.id));
  }, [courses, department, lecturers]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesDepartment = department === "all" || course.department === department;
      const matchesLecturer = lecturerId === "all" || course.lecturer.id === lecturerId;
      const searchable = `${course.code} ${course.title} ${course.department} ${course.lecturer.name} ${course.schedule}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesDepartment && matchesLecturer && matchesQuery;
    });
  }, [courses, department, lecturerId, query]);

  function selectDepartment(nextDepartment: string) {
    setDepartment(nextDepartment);
    if (nextDepartment === "all") return;
    const lecturerIds = new Set(courses.filter((course) => course.department === nextDepartment).map((course) => course.lecturer.id));
    if (lecturerId !== "all" && !lecturerIds.has(lecturerId)) setLecturerId("all");
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses, lecturers, departments..."
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
        <label htmlFor="course-lecturer-filter" className="text-sm font-bold text-muted">
          Lecturer
        </label>
        <div className="relative">
          <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <select
            id="course-lecturer-filter"
            value={lecturerId}
            onChange={(event) => setLecturerId(event.target.value)}
            className="min-h-12 w-full appearance-none rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          >
            <option value="all">All lecturers</option>
            {visibleLecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-[0.7fr_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_0.6fr] bg-slate-50 px-4 py-3 text-sm font-bold text-muted max-lg:hidden">
          <span>Code</span>
          <span>Course</span>
          <span>Department</span>
          <span>Lecturer</span>
          <span>Topics</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((course, index) => (
            <Link
              key={course.id}
              href={course.href}
              className="grid gap-3 px-4 py-4 text-sm transition duration-200 hover:bg-accent/5 focus:bg-accent/5 lg:grid-cols-[0.7fr_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_0.6fr]"
              style={{ animationDelay: `${Math.min(index, 8) * 24}ms` }}
            >
              <span className="animate-[showup-row-in_220ms_ease-out_both] font-mono font-semibold text-navy">{course.code}</span>
              <span className="animate-[showup-row-in_220ms_ease-out_both]">
                <span className="block font-semibold text-navy">{course.title}</span>
                <span className="mt-1 block text-xs text-muted">{course.schedule}</span>
              </span>
              <span className="animate-[showup-row-in_220ms_ease-out_both] text-slate-700">{course.department}</span>
              <span className="animate-[showup-row-in_220ms_ease-out_both] text-slate-700">{course.lecturer.name}</span>
              <span className="animate-[showup-row-in_220ms_ease-out_both] font-mono font-semibold text-slate-700">{course.topicCount}</span>
            </Link>
          ))}
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="font-semibold text-navy">No courses match these filters.</p>
              <p className="mt-1 text-sm text-muted">Try a different department, lecturer, or search term.</p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-navy">{filtered.length}</span> of <span className="font-semibold text-navy">{courses.length}</span> courses.
      </p>
    </div>
  );
}

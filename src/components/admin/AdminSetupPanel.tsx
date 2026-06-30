"use client";

import { Role } from "@prisma/client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Building2, CalendarDays, GraduationCap, LibraryBig, Plus, School, UserCog, UserRound } from "lucide-react";

type Option = { id: string; name: string };
type LecturerOption = Option & { departmentId: string };

type Props = {
  role: Role;
  scopeLabel: string;
  universities: Option[];
  faculties: Option[];
  departments: Option[];
  semesters: Option[];
  lecturers: LecturerOption[];
};

const cards = [
  { type: "university", title: "University", icon: School },
  { type: "faculty", title: "Faculty", icon: Building2 },
  { type: "department", title: "Department", icon: LibraryBig },
  { type: "semester", title: "Semester", icon: CalendarDays },
  { type: "lecturer", title: "Lecturer", icon: UserRound },
  { type: "course", title: "Course", icon: GraduationCap },
  { type: "user", title: "User", icon: UserCog }
] as const;

type CardType = (typeof cards)[number]["type"];

export function AdminSetupPanel({ role, scopeLabel, universities, faculties, departments, semesters, lecturers }: Props) {
  const router = useRouter();
  const visibleCards = useMemo(() => getVisibleCards(role), [role]);
  const [type, setType] = useState<CardType>(visibleCards[0]?.type ?? "lecturer");
  const [loading, setLoading] = useState(false);
  const showUniversityFields = role === "SUPER_ADMIN";
  const showDepartmentFields = role === "SUPER_ADMIN" || role === "IT";

  if (role === "VC") {
    return (
      <section className="rounded-card bg-white p-5 shadow-card">
        <h2 className="font-display text-xl font-bold">University administration</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Leadership access is scoped to {scopeLabel}. Operational setup actions are handled by IT.
        </p>
      </section>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    for (const key of Object.keys(payload)) {
      if (payload[key] === "") delete payload[key];
    }
    setLoading(true);
    const response = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, ...payload, isActive: payload.isActive === "on" })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not save setup item");
      return;
    }
    toast.success(`${label(type)} saved`);
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Administration setup</h2>
          <p className="text-sm text-muted">Create records within {scopeLabel}.</p>
        </div>
      </div>
      <div className="mb-5 grid gap-2 md:grid-cols-6">
        {visibleCards.map((card) => (
          <button
            type="button"
            key={card.type}
            onClick={() => setType(card.type)}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold ${type === card.type ? "border-accent bg-accent/10 text-navy" : "bg-white text-muted hover:border-slate-300 hover:text-navy"}`}
          >
            <card.icon className="h-4 w-4" aria-hidden />
            {card.title}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
        <Fields
          type={type}
          universities={universities}
          faculties={faculties}
          departments={departments}
          semesters={semesters}
          lecturers={lecturers}
          showUniversityFields={showUniversityFields}
          showDepartmentFields={showDepartmentFields}
        />
        <div className="md:col-span-2">
          <button disabled={loading} className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-navy disabled:opacity-60">
            <Plus className="h-4 w-4" aria-hidden />
            {loading ? "Saving..." : `Save ${label(type)}`}
          </button>
        </div>
      </form>
    </section>
  );
}

function getVisibleCards(role: Role) {
  if (role === "SUPER_ADMIN") return cards;
  if (role === "IT") return cards.filter((card) => card.type !== "university");
  return [];
}

function Fields({
  type,
  universities,
  faculties,
  departments,
  semesters,
  lecturers,
  showUniversityFields,
  showDepartmentFields
}: Omit<Props, "role" | "scopeLabel"> & { type: CardType; showUniversityFields: boolean; showDepartmentFields: boolean }) {
  if (type === "university") return <><Input name="name" label="Name" /><Input name="address" label="Address" /></>;
  if (type === "faculty") return <><Input name="name" label="Name" />{showUniversityFields ? <Select name="universityId" label="University" options={universities} /> : null}</>;
  if (type === "department") return <><Input name="name" label="Name" /><Select name="facultyId" label="Faculty" options={faculties} /></>;
  if (type === "semester") return <><Input name="name" label="Name" />{showUniversityFields ? <Select name="universityId" label="University" options={universities} /> : null}<Input name="startDate" label="Start date" type="date" /><Input name="endDate" label="End date" type="date" /><label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked /> Active semester</label></>;
  if (type === "lecturer") return <><Input name="firstName" label="First name" /><Input name="lastName" label="Last name" /><Input name="email" label="Email" type="email" /><Input name="phone" label="Phone" /><Input name="staffId" label="Staff ID" />{showDepartmentFields ? <Select name="departmentId" label="Department" options={departments} /> : null}</>;
  if (type === "user") return <><Input name="displayName" label="Display name" /><Input name="email" label="Email" type="email" /><Input name="phone" label="Phone" required={false} />{showUniversityFields ? <Select name="universityId" label="University" options={universities} /> : null}<Select name="role" label="Role" options={[{ id: "VC", name: "VC" }, { id: "QA_OFFICER", name: "QA Officer" }, { id: "QA_ASSISTANT", name: "QA Assistant" }, { id: "IT", name: "IT" }, { id: "HOD", name: "HOD" }, { id: "HOD_ASSISTANT", name: "HOD Assistant" }]} /><Select name="departmentId" label="Department for HOD roles" options={[{ id: "", name: "No department" }, ...departments]} required={false} /></>;
  return <><Input name="code" label="Code" /><Input name="title" label="Title" />{showDepartmentFields ? <Select name="departmentId" label="Department" options={departments} /> : null}<Select name="semesterId" label="Semester" options={semesters} /><Select name="lecturerId" label="Lecturer" options={lecturers} /><Input name="creditHours" label="Credit hours" type="number" defaultValue="3" /><Input name="classSize" label="Class size" type="number" defaultValue="60" /><Select name="dayOfWeek" label="Day" options={[{ id: "1", name: "Monday" }, { id: "2", name: "Tuesday" }, { id: "3", name: "Wednesday" }, { id: "4", name: "Thursday" }, { id: "5", name: "Friday" }]} /><Input name="startTime" label="Start time" defaultValue="08:00" /><Input name="endTime" label="End time" defaultValue="10:00" /><Input name="venue" label="Venue" /></>;
}

function Input({ name, label, type = "text", defaultValue, required }: { name: string; label: string; type?: string; defaultValue?: string; required?: boolean }) {
  const isRequired = required ?? (name !== "address" && name !== "venue");
  return <label className="text-sm font-medium">{label}<input name={name} type={type} defaultValue={defaultValue} className="mt-1 h-11 w-full rounded-md border px-3" required={isRequired} /></label>;
}

function Select({ name, label, options, required = true }: { name: string; label: string; options: Option[]; required?: boolean }) {
  return <label className="text-sm font-medium">{label}<select name={name} className="mt-1 h-11 w-full rounded-md border px-3" required={required}>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>;
}

function label(type: string) {
  return type.slice(0, 1).toUpperCase() + type.slice(1);
}

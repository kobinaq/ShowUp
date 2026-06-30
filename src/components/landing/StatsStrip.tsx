const stats = [
  { value: "100%", label: "Of lecture sessions accounted for, so no class goes unreported.", green: false },
  { value: "Zero", label: "Reporters identifiable to lecturers or classmates, by design.", green: true },
  { value: "1", label: "Dashboard for QA, HOD, and VC, with the same data and role-scoped views.", green: false }
];

export function StatsStrip() {
  return (
    <section className="bg-[#F4F6F9] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.value} className="rounded-lg border border-[#D8DEE8] bg-white p-6 shadow-sm">
            <p className={`font-display text-4xl font-bold ${stat.green ? "text-[#00C48C]" : "text-[#0D1F3C]"}`}>{stat.value}</p>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

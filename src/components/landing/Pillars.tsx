const pillars = [
  {
    number: "01",
    title: "Anonymous & Rotating",
    body: "Class reps report without fear of being identified. Roles rotate automatically, so no single student carries the risk all semester."
  },
  {
    number: "02",
    title: "Outline vs. Reality",
    body: "Every lecture is checked against the submitted course outline, producing a real, defensible topic coverage percentage per course."
  },
  {
    number: "03",
    title: "Live Accountability",
    body: "If a lecturer is late, the system alerts them and QA in real time, before the after-class report is even filed."
  }
];

export function Pillars() {
  return (
    <section className="bg-[#0D1F3C] px-4 pb-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.number} className="rounded-lg border border-white/10 bg-white/8 p-6 transition hover:-translate-y-1 hover:bg-white/12">
            <p className="font-mono text-sm font-bold text-[#00C48C]">{pillar.number}</p>
            <h2 className="mt-4 font-display text-2xl font-bold">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/68">{pillar.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const features = [
  {
    title: "Course coverage engine",
    body: "Compare reported teaching progress against the submitted course outline, so leaders can see when a class is behind the weekly academic plan.",
    className: "lg:col-span-2"
  },
  {
    title: "Anonymous rotation",
    body: "Class reps submit structured reports without becoming permanent targets for pressure or victimisation.",
    className: ""
  },
  {
    title: "Ask ShowUp AI",
    body: "Leadership can ask operational questions and receive fast answers from verified lecture data.",
    className: "lg:row-span-2"
  },
  {
    title: "Late alerts",
    body: "Escalate patterns of lateness, missed lectures, and reporting gaps to the right academic office.",
    className: ""
  },
  {
    title: "Role-based dashboards",
    body: "Different views for QA, HODs, Registrars, and Vice-Chancellors without overloading any user.",
    className: ""
  }
];

export function ModuleGrid() {
  return (
    <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto mb-12 max-w-3xl text-center">
          <div className="showup-kicker">Core platform</div>
          <h2 className="showup-section-title">A calm operating system for academic quality.</h2>
          <p className="mt-5 text-lg leading-8 text-[#475467]">
            Soft, role-based dashboards turn lecture activity into early warnings, coverage intelligence, and leadership-ready reports.
          </p>
        </div>

        <div className="grid auto-rows-fr gap-5 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article key={feature.title} className={`reveal group rounded-[32px] border border-[rgba(16,24,40,0.08)] bg-white/85 p-7 shadow-[0_16px_40px_rgba(18,32,58,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(18,32,58,0.12)] ${feature.className}`}>
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-[16px] border border-[#2a9d8f]/15 bg-white font-black text-[#18796e]">
                {index === 0 ? "%" : index === 1 ? "●" : index === 2 ? "AI" : index === 3 ? "!" : "◇"}
              </div>
              <h3 className="text-2xl font-black tracking-[-0.045em] text-[#12203a]">{feature.title}</h3>
              <p className="mt-3 leading-7 text-[#5c6674]">{feature.body}</p>
              {index === 0 ? (
                <div className="mt-7 grid gap-3 rounded-[22px] bg-[#f8fbfa] p-4">
                  {[
                    ["Topic 4", "100%", "Taught"],
                    ["Topic 5", "35%", "Partial"],
                    ["Topic 6", "0%", "Due"]
                  ].map(([topic, width, status]) => (
                    <div key={topic} className="grid grid-cols-[70px_1fr_58px] items-center gap-3 text-xs font-black text-[#667085]">
                      <span>{topic}</span>
                      <div className="h-2 rounded-full bg-[#edf2f1]">
                        <span className="block h-full rounded-full bg-[#2a9d8f]" style={{ width }} />
                      </div>
                      <span>{status}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {index === 2 ? (
                <div className="mt-7 grid gap-3 rounded-[22px] bg-[#f8fbfa] p-4">
                  {["Who missed the most lectures?", "Which courses are at risk?"].map((query) => (
                    <div key={query} className="rounded-[16px] border border-[rgba(16,24,40,0.07)] bg-white p-4 text-sm font-black text-[#12203a]">
                      {query}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

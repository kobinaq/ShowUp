const steps = [
  ["1", "Class happens", "Lecture details are captured after or during the session through a guided report flow."],
  ["2", "Rep reports", "An anonymous rotating class rep confirms lecturer presence, time, topic and class observations."],
  ["3", "System verifies", "ShowUp compares the report with timetables, course outlines and previous patterns."],
  ["4", "Leaders act", "QA, HODs and university executives see alerts, dashboards and clean evidence trails."]
];

export function Workflow() {
  return (
    <section id="workflow" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto mb-12 max-w-3xl text-center">
          <div className="showup-kicker">How it works</div>
          <h2 className="showup-section-title">From class report to leadership action.</h2>
          <p className="mt-5 text-lg leading-8 text-[#475467]">
            A simple operational flow keeps the product easy for class reps while giving management the evidence required for decisions.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(([number, title, body]) => (
            <article key={number} className="reveal rounded-[30px] border border-[rgba(16,24,40,0.08)] bg-white/85 p-7 shadow-[0_16px_40px_rgba(18,32,58,0.08)] transition hover:-translate-y-1">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dff3ef] text-lg font-black text-[#18796e]">{number}</span>
              <h3 className="mt-6 text-2xl font-black tracking-[-0.045em] text-[#12203a]">{title}</h3>
              <p className="mt-3 leading-7 text-[#667085]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

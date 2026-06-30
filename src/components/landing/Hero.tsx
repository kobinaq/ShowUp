import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

const kpis = [
  ["42", "Sessions", "reported today"],
  ["07", "Late Alerts", "3 escalated"],
  ["12", "Behind Plan", "courses need review"],
  ["18", "AI Queries", "answered this week"]
];

const reports = [
  ["Quality Management", "Level 300 - Started 8:06 AM - Topic 6 taught", "On plan", "ok"],
  ["Interior Project Planning", "Level 200 - Lecturer late by 14 mins", "Late", "warn"],
  ["Research Methods", "Level 400 - Week 6 target, Topic 4 current", "Behind", "risk"]
];

export function Hero() {
  return (
    <header className="relative px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto max-w-4xl text-center">

          <h1 className="mx-auto mt-6 max-w-5xl text-[clamp(3rem,7vw,5.8rem)] font-black leading-[0.94] tracking-[-0.075em] text-[#12203a]">
            Academic delivery, monitored in real time.
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#475467]">
            ShowUp helps universities monitor lecture attendance, punctuality, and course coverage through anonymous class rep reports, live alerts, and role-based quality assurance dashboards.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#demo-request" className="showup-btn showup-btn-primary">
              Request a Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="#features" className="showup-btn showup-btn-secondary">
              Explore platform
            </Link>
          </div>

          <div className="mx-auto mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ["Protected", "anonymous rep reporting"],
              ["Live", "attendance and lateness alerts"],
              ["Measured", "course coverage intelligence"]
            ].map(([strong, label]) => (
              <div key={strong} className="rounded-[18px] border border-[rgba(16,24,40,0.08)] bg-white/75 p-4 text-left shadow-[0_16px_40px_rgba(18,32,58,0.08)]">
                <strong className="block text-xl tracking-[-0.04em] text-[#12203a]">{strong}</strong>
                <span className="mt-1 block text-xs font-bold leading-5 text-[#667085]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="heroVisual" className="reveal relative mt-14 [perspective:1800px]">
          <div className="absolute left-1/2 top-1/2 h-[560px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2a9d8f]/12 blur-3xl" aria-hidden />
          <div className="showup-dashboard relative rounded-[34px] border border-white/70 bg-white/90 p-4 shadow-[0_44px_100px_rgba(18,32,58,0.18),0_8px_24px_rgba(42,157,143,0.08)] backdrop-blur-xl [transform:rotateX(7deg)_rotateY(-5deg)_rotateZ(0.6deg)] [transform-style:preserve-3d]">
            <div className="overflow-hidden rounded-[26px] border border-[rgba(16,24,40,0.08)] bg-[#fbfdfc]">
              <div className="grid gap-3 border-b border-[rgba(16,24,40,0.07)] bg-white p-4 md:grid-cols-[1fr_auto_auto]">
                <div className="flex items-center gap-2 rounded-full border border-[rgba(16,24,40,0.08)] bg-[#f7f9f8] px-4 py-3 text-sm font-bold text-[#475467]">
                  <Search className="h-4 w-4" aria-hidden />
                  Ask ShowUp AI: Which classes are drifting this week?
                </div>
                <div className="rounded-full border border-[#2a9d8f]/20 bg-[#f2faf8] px-4 py-3 text-xs font-black text-[#18796e]">
                  Course coverage engine active
                </div>
                <button className="showup-btn showup-btn-secondary px-4 py-3 text-xs">Run Query</button>
              </div>

              <div className="bg-[#12203a] px-5 py-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black tracking-[-0.02em]">Academic quality dashboard</h2>
                    <p className="text-xs font-semibold text-white/65">Live lecture visibility for today</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-black">
                    <span className="h-2 w-2 rounded-full bg-[#5df0bb] shadow-[0_0_0_7px_rgba(93,240,187,0.12)]" />
                    Live institutional view
                  </span>
                </div>
              </div>

              <div className="grid min-h-[480px] lg:grid-cols-[220px_1.25fr_0.75fr]">
                <aside className="hidden border-r border-[rgba(16,24,40,0.07)] bg-[#f3f7f6] p-4 lg:block">
                  {["Overview", "Reports", "Alerts", "Coverage", "Leaders"].map((item, index) => (
                    <div key={item} className={`mb-2 rounded-[14px] px-3 py-3 text-sm font-bold ${index === 0 ? "bg-white text-[#12203a] shadow-[0_10px_22px_rgba(18,32,58,0.07)]" : "text-[#475467]"}`}>
                      {item}
                    </div>
                  ))}
                </aside>

                <div className="p-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {kpis.map(([value, label, sub]) => (
                      <div key={label} className="rounded-[18px] border border-[rgba(16,24,40,0.07)] bg-white p-4 shadow-[0_12px_22px_rgba(18,32,58,0.05)]">
                        <span className="text-[11px] font-black uppercase tracking-[0.05em] text-[#667085]">{label}</span>
                        <strong className="mt-2 block text-3xl font-black tracking-[-0.06em] text-[#12203a]">{value}</strong>
                        <small className="text-xs font-black text-[#18796e]">{sub}</small>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[rgba(16,24,40,0.07)] bg-white p-4 shadow-[0_12px_22px_rgba(18,32,58,0.05)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-black text-[#12203a]">Live lecture reports</h3>
                      <span className="rounded-full bg-[#dff3ef] px-3 py-1 text-[11px] font-black text-[#18796e]">Anonymous reps</span>
                    </div>
                    {reports.map(([title, meta, status, tone]) => (
                      <div key={title} className="grid gap-3 border-t border-[rgba(16,24,40,0.06)] py-3 first:border-t-0 sm:grid-cols-[1fr_auto]">
                        <div>
                          <div className="text-sm font-black text-[#12203a]">{title}</div>
                          <div className="mt-1 text-xs font-semibold text-[#667085]">{meta}</div>
                        </div>
                        <span className={`h-fit rounded-full px-3 py-2 text-[11px] font-black ${tone === "ok" ? "bg-[#e8f7ed] text-[#247a3e]" : tone === "warn" ? "bg-[#fff1dc] text-[#a05d12]" : "bg-[#feece7] text-[#ad432d]"}`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[rgba(16,24,40,0.07)] bg-white p-4 shadow-[0_12px_22px_rgba(18,32,58,0.05)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-black text-[#12203a]">Course coverage trend</h3>
                      <span className="rounded-full bg-[#dff3ef] px-3 py-1 text-[11px] font-black text-[#18796e]">Week 7</span>
                    </div>
                    <div className="flex h-28 items-end gap-2 pt-3">
                      {[54, 66, 46, 72, 58, 82, 68].map((height, index) => (
                        <span key={height + index} className="showup-bar flex-1 rounded-t-full bg-[#2a9d8f]" style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="grid content-start gap-4 p-5 pt-0 lg:pt-5">
                  <div className="rounded-[22px] border border-[rgba(16,24,40,0.07)] bg-white p-5 shadow-[0_12px_22px_rgba(18,32,58,0.05)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-black text-[#12203a]">Course outline progress</h3>
                      <span className="rounded-full bg-[#feece7] px-3 py-1 text-[11px] font-black text-[#ad432d]">Behind</span>
                    </div>
                    <p className="text-xs leading-5 text-[#667085]">Research Methods should be on Topic 6 this week, but reports show Topic 4.</p>
                    <div className="mt-7 h-2 rounded-full bg-[#edf2f1]">
                      <span className="block h-full w-[54%] rounded-full bg-[#2a9d8f]" />
                    </div>
                    <div className="mt-3 flex justify-between text-[11px] font-black text-[#667085]">
                      <span>Topic 1</span><span>Topic 4</span><span>Topic 6</span>
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-[#12203a] p-5 text-white shadow-[0_18px_34px_rgba(18,32,58,0.18)]">
                    <div className="text-[11px] font-black uppercase tracking-[0.06em] text-white/60">Ask ShowUp AI</div>
                    <div className="mt-3 text-sm font-bold leading-6">Summarise all courses behind their submitted course outline this week.<span className="showup-cursor ml-1 inline-block h-4 w-2 bg-[#2a9d8f] align-[-3px]" /></div>
                  </div>
                </aside>
              </div>
            </div>

            <div className="showup-float absolute right-7 top-[-24px] hidden w-72 rounded-[24px] border border-[#e76f51]/20 bg-white/90 p-4 shadow-[0_16px_40px_rgba(18,32,58,0.08)] backdrop-blur md:block">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#feece7] font-black text-[#e76f51]">!</span>
                <div>
                  <strong className="text-sm text-[#12203a]">Escalation triggered</strong>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">HOD notified: repeated absence detected in Dr. Mensah&apos;s class.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

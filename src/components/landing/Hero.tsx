import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Bot, Flag, Gauge, GraduationCap, LifeBuoy, LogOut, Moon, ShieldCheck, Users } from "lucide-react";

const metrics = [
  ["Lecturer attendance", "67%", "verified sessions attended this week", "Review", "amber"],
  ["Student attendance", "34%", "average class turnout this week", "Low", "amber"],
  ["Course coverage", "58%", "topics completed this semester", "Watch", "amber"],
  ["Late reports", "42", "lecturer lateness alerts this week", "Live", "green"],
  ["Absent reports", "18", "sessions reported absent this week", "Review", "amber"],
  ["Student reports", "192", "class rep submissions this week", "Live", "green"],
  ["Open flags", "11", "delivery risks active now", "Action", "amber"],
  ["Contested reports", "3", "pending challenge reviews", "Review", "amber"]
];

const navGroups = [
  ["Monitor", [["Command Center", Gauge], ["Analytics", BarChart3]]],
  ["Records", [["Reports", Gauge], ["Courses", BookOpen], ["Students", Users], ["Lecturers", GraduationCap]]],
  ["Governance", [["Flags", Flag], ["Contests", ShieldCheck], ["IT Support", LifeBuoy]]]
] as const;

const bars = [55, 57, 61, 62, 66, 67, 67, 69, 73, 74, 75, 76];
const linePoints = [72, 75, 78, 82, 68, 72, 75, 86, 94, 80, 88, 74, 79, 84];

export function Hero() {
  return (
    <header className="relative px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto max-w-5xl text-center">
          <h1 className="mx-auto max-w-5xl text-[clamp(3rem,7vw,5.8rem)] font-black leading-[0.94] tracking-[-0.075em] text-[#12203a]">
            Academic delivery, monitored in real time.
          </h1>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#demo-request" className="showup-btn showup-btn-primary">
              Request a Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="#features" className="showup-btn showup-btn-secondary">
              Explore platform
            </Link>
          </div>

          <div className="mx-auto mt-9 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              ["Audit-ready", "delivery evidence before reviews"],
              ["Live QA", "attendance, lateness, and coverage risk"],
              ["Defensible", "reports, contests, and role-scoped dashboards"]
            ].map(([strong, label]) => (
              <div key={strong} className="rounded-[18px] border border-[rgba(16,24,40,0.08)] bg-white/75 p-4 text-left shadow-[0_16px_40px_rgba(18,32,58,0.08)]">
                <strong className="block text-xl tracking-[-0.04em] text-[#12203a]">{strong}</strong>
                <span className="mt-1 block text-xs font-bold leading-5 text-[#667085]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="heroVisual" className="reveal relative mt-14 [perspective:1800px]">
          <div className="absolute left-1/2 top-1/2 h-[560px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2a9d8f]/14 blur-3xl" aria-hidden />
          <div className="showup-dashboard relative overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_44px_100px_rgba(18,32,58,0.18),0_8px_24px_rgba(42,157,143,0.10)] [transform:rotateX(7deg)_rotateY(-5deg)_rotateZ(0.6deg)] [transform-style:preserve-3d]">
            <div className="grid min-h-[720px] bg-[#f7f9f8] lg:grid-cols-[270px_1fr]">
              <aside className="hidden border-r border-[#d9e8e4] bg-white lg:block">
                <div className="flex items-center gap-3 border-b border-[#dff3ef] px-6 py-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#12203a] font-black text-white shadow-[0_10px_24px_rgba(18,32,58,0.18)]">S</div>
                  <div>
                    <p className="text-xl font-black tracking-[-0.04em] text-[#12203a]">ShowUp</p>
                    <p className="text-xs text-[#667085]">Quality assurance</p>
                  </div>
                </div>
                <nav className="space-y-6 px-4 py-5">
                  {navGroups.map(([group, items]) => (
                    <div key={group}>
                      <p className="mb-2 px-2 text-xs font-bold text-[#667085]">{group}</p>
                      <div className="space-y-1">
                        {items.map(([label, Icon]) => {
                          const active = label === "Analytics";
                          return (
                            <div key={label} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold ${active ? "bg-[#12203a] text-white shadow-[0_10px_24px_rgba(18,32,58,0.16)]" : "text-[#12203a]"}`}>
                              <Icon className="h-4 w-4" aria-hidden />
                              {label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="min-w-0">
                <div className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[#d9e8e4] bg-white/95 px-5">
                  <h2 className="font-black tracking-[-0.035em] text-[#12203a] sm:text-xl">QA Dashboard</h2>
                  <p className="hidden font-black text-[#12203a] md:block">Prampram University</p>
                  <div className="flex items-center justify-end gap-3">
                    {[Bot, Moon, LogOut].map((Icon, index) => (
                      <span key={index} className="grid h-10 w-10 place-items-center rounded-md border border-[#d9e8e4] bg-white text-[#12203a]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 p-5 lg:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#667085]">Prampram University</p>
                      <h3 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#12203a]">Analytics</h3>
                      <p className="mt-3 text-sm text-[#12203a]">Executive indicators for attendance, topic coverage, late alerts, flags, and contested reports.</p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#d9e8e4] bg-white px-3 py-2 text-sm font-black text-[#12203a] shadow-[0_2px_8px_rgba(18,32,58,0.08)]">
                      <span className="h-2 w-2 rounded-full bg-[#2a9d8f]" aria-hidden />
                      This week
                      <span className="text-[#667085]" aria-hidden>▾</span>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map(([label, value, helper, badge, tone]) => (
                      <div key={label} className="rounded-lg border border-[#d9e8e4] bg-[linear-gradient(to_bottom,#ffffff,#f4f8fb)] p-5 shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-[#667085]">{label}</p>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-black shadow-sm ${tone === "green" ? "border-[#cfe9e4] bg-[#eef7f4] text-[#18796e]" : "border-[#ead7bd] bg-[#fff7ed] text-[#9a5a1f]"}`}>
                            {badge}
                          </span>
                        </div>
                        <strong className="mt-5 block text-3xl font-black tracking-[-0.04em] text-[#2a9d8f]">{value}</strong>
                        <p className="mt-6 text-sm font-medium text-[#12203a]">{helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <ChartPanel title="Student attendance by course" description="Reporter headcounts compared with HOD-entered class sizes.">
                      <div className="flex h-52 items-end gap-2 border-l border-b border-dashed border-[#d9e8e4] px-5 pb-4">
                        {bars.map((height, index) => (
                          <span key={index} className="showup-bar flex-1 rounded-t-lg bg-[#2a9d8f]" style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }} />
                        ))}
                      </div>
                    </ChartPanel>
                    <ChartPanel title="Student attendance trend" description="Average reported student attendance across recent sessions.">
                      <div className="relative h-52 border-l border-b border-dashed border-[#d9e8e4]">
                        <svg viewBox="0 0 520 210" className="absolute inset-0 h-full w-full overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#2a9d8f"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={linePoints.map((value, index) => `${20 + index * 37},${190 - value * 1.55}`).join(" ")}
                          />
                          {linePoints.map((value, index) => (
                            <circle key={index} cx={20 + index * 37} cy={190 - value * 1.55} r="4" fill="white" stroke="#2a9d8f" strokeWidth="3" />
                          ))}
                        </svg>
                      </div>
                    </ChartPanel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <MiniPanel title="Audit-ready evidence" items={["Weekly delivery trail complete", "Class rep reports sealed", "Leadership actions timestamped"]} />
                    <MiniPanel title="Courses needing action" items={["Research Methods - Topic 4 of 6", "Procurement Law - 68% coverage"]} />
                    <MiniPanel title="Recent contested reports" items={["CENG301 - Pending review", "MKT302 - Evidence attached"]} />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 hidden h-14 w-14 place-items-center rounded-full bg-[#12203a] text-white shadow-[0_16px_28px_rgba(18,32,58,0.35)] md:grid">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d9e8e4] bg-white shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
      <div className="border-b border-[#dff3ef] px-5 py-4">
        <h4 className="text-lg font-black tracking-[-0.035em] text-[#12203a]">{title}</h4>
        <p className="mt-2 text-sm text-[#667085]">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MiniPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#d9e8e4] bg-white p-5 shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
      <h4 className="text-lg font-black tracking-[-0.035em] text-[#12203a]">{title}</h4>
      <div className="mt-6 space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded-lg border border-[#d9e8e4] px-3 py-2 text-sm text-[#12203a]">{item}</p>
        ))}
      </div>
    </div>
  );
}

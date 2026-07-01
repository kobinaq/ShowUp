import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, Bot, Flag, Gauge, GraduationCap, LifeBuoy, LogOut, Moon, ShieldCheck, Users } from "lucide-react";

const metrics = [
  ["Attendance rate", "92%", "192 reports analyzed", "Healthy", "green"],
  ["Average coverage", "75%", "24 courses in scope", "Review", "amber"],
  ["Absences", "16", "Total absence reports", "Review", "red"],
  ["Lateness", "48", "Total late reports", "Review", "amber"],
  ["Open flags", "64", "64 total flags", "Review", "red"],
  ["Open contests", "1", "Pending challenge reviews", "Review", "red"],
  ["Ping acknowledgement", "0%", "0/0 late pings acknowledged", "-", "grey"],
  ["Student attendance", "79%", "192 sessions with class size", "Review", "amber"]
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#4288c9]/20 bg-white/80 px-4 py-2 text-sm font-black text-[#4288c9] shadow-[0_8px_22px_rgba(66,136,201,0.10)]">
            Make every semester GTEC-ready
          </div>

          <h1 className="mx-auto mt-6 max-w-5xl text-[clamp(3rem,7vw,5.8rem)] font-black leading-[0.94] tracking-[-0.075em] text-[#12203a]">
            Academic delivery, monitored in real time.
          </h1>
          <div className="mx-auto mt-6 max-w-4xl space-y-4 text-lg leading-8 text-[#475467]">
            <p>
              ShowUp helps universities monitor lecture attendance, punctuality, and course coverage through anonymous class rep reports, live alerts, and role-based quality assurance dashboards.
            </p>
            <p>
              ShowUp helps tertiary institutions monitor lecturer attendance, course progress, student feedback, and academic delivery risks as they happen, so leadership can build stronger QA evidence before audits, reviews, and accreditation conversations.
            </p>
            <p className="font-black text-[#12203a]">See the gaps. Act early. Prove delivery.</p>
          </div>

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
          <div className="absolute left-1/2 top-1/2 h-[560px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4288c9]/14 blur-3xl" aria-hidden />
          <div className="showup-dashboard relative overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_44px_100px_rgba(18,32,58,0.18),0_8px_24px_rgba(66,136,201,0.10)] [transform:rotateX(7deg)_rotateY(-5deg)_rotateZ(0.6deg)] [transform-style:preserve-3d]">
            <div className="grid min-h-[720px] bg-[#f4f6f9] lg:grid-cols-[270px_1fr]">
              <aside className="hidden border-r border-[#d8dee8] bg-white lg:block">
                <div className="flex items-center gap-3 border-b border-[#eef2f5] px-6 py-5">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#4288c9] font-black text-white">S</div>
                  <div>
                    <p className="text-xl font-black tracking-[-0.04em] text-[#4288c9]">ShowUp</p>
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
                            <div key={label} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold ${active ? "bg-[#4288c9] text-white" : "text-[#26384f]"}`}>
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
                <div className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[#d8dee8] bg-white/95 px-5">
                  <h2 className="font-black tracking-[-0.035em] text-[#4288c9] sm:text-xl">QA Assistant Dashboard</h2>
                  <p className="hidden font-black text-[#4288c9] md:block">Accra Technical University</p>
                  <div className="flex items-center justify-end gap-3">
                    <span className="hidden truncate text-sm text-[#667085] lg:block">qa.assistant@atu.showup.demo</span>
                    {[Bot, Moon, LogOut].map((Icon, index) => (
                      <span key={index} className="grid h-10 w-10 place-items-center rounded-md border border-[#d8dee8] bg-white text-[#4288c9]">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 p-5 lg:p-8">
                  <div>
                    <p className="text-sm font-bold text-[#667085]">Accra Technical University</p>
                    <h3 className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#4288c9]">Analytics</h3>
                    <p className="mt-3 text-sm text-[#26384f]">Executive indicators for attendance, topic coverage, late alerts, flags, and contested reports.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {metrics.map(([label, value, helper, badge, tone]) => (
                      <div key={label} className="rounded-lg border border-[#d8dee8] bg-[linear-gradient(to_bottom,#ffffff,#eef4fb)] p-5 shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-[#667085]">{label}</p>
                          <span className={`rounded-full border bg-white px-2.5 py-1 text-xs font-black shadow-sm ${tone === "green" ? "border-emerald-100 text-emerald-700" : tone === "red" ? "border-red-100 text-red-600" : tone === "amber" ? "border-amber-100 text-amber-700" : "border-slate-200 text-slate-500"}`}>
                            {badge}
                          </span>
                        </div>
                        <strong className="mt-5 block text-3xl font-black tracking-[-0.04em] text-[#4288c9]">{value}</strong>
                        <p className="mt-6 text-sm font-medium text-black">{helper}</p>
                        <p className="mt-2 text-sm text-[#667085]">{helper}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <ChartPanel title="Student attendance by course" description="Reporter headcounts compared with HOD-entered class sizes.">
                      <div className="flex h-52 items-end gap-2 border-l border-b border-dashed border-[#d8dee8] px-5 pb-4">
                        {bars.map((height, index) => (
                          <span key={index} className="showup-bar flex-1 rounded-t-lg bg-[#3268b7]" style={{ height: `${height}%`, animationDelay: `${index * 60}ms` }} />
                        ))}
                      </div>
                    </ChartPanel>
                    <ChartPanel title="Student attendance trend" description="Average reported student attendance across recent sessions.">
                      <div className="relative h-52 border-l border-b border-dashed border-[#d8dee8]">
                        <svg viewBox="0 0 520 210" className="absolute inset-0 h-full w-full overflow-visible">
                          <polyline
                            fill="none"
                            stroke="#4288c9"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={linePoints.map((value, index) => `${20 + index * 37},${190 - value * 1.55}`).join(" ")}
                          />
                          {linePoints.map((value, index) => (
                            <circle key={index} cx={20 + index * 37} cy={190 - value * 1.55} r="4" fill="white" stroke="#4288c9" strokeWidth="3" />
                          ))}
                        </svg>
                      </div>
                    </ChartPanel>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <MiniPanel title="Top flagged lecturers" items={["Kwesi Nyarko · 3 flags", "Adjoa Appiah · 3 flags", "Ama Addo · 3 flags"]} />
                    <MiniPanel title="Courses behind coverage" items={["Research Methods · Topic 4 of 6", "Procurement Law · 68% coverage"]} />
                    <MiniPanel title="Recent contested reports" items={["CENG301 · Pending", "MKT302 · Dismissed"]} />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-6 right-6 hidden h-14 w-14 place-items-center rounded-full bg-[#4288c9] text-white shadow-[0_16px_28px_rgba(66,136,201,0.35)] md:grid">
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
    <div className="overflow-hidden rounded-lg border border-[#d8dee8] bg-white shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
      <div className="border-b border-[#eef2f5] px-5 py-4">
        <h4 className="text-lg font-black tracking-[-0.035em] text-[#4288c9]">{title}</h4>
        <p className="mt-2 text-sm text-[#667085]">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MiniPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#d8dee8] bg-white p-5 shadow-[0_2px_8px_rgba(18,32,58,0.10)]">
      <h4 className="text-lg font-black tracking-[-0.035em] text-[#4288c9]">{title}</h4>
      <div className="mt-6 space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded-lg border border-[#d8dee8] px-3 py-2 text-sm text-[#26384f]">{item}</p>
        ))}
      </div>
    </div>
  );
}

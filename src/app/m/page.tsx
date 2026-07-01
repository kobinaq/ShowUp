import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Loader2 } from "lucide-react";
import { MobileLeadForm } from "./mobile-lead-form";

const proofStats = [
  ["67%", "lecturer attendance", "verified this week"],
  ["34%", "student attendance", "average class turnout"],
  ["58%", "course coverage", "topics completed"],
  ["42", "late reports", "alerts surfaced"]
];

const features = [
  ["Anonymous class reports", "Rotating student reporters submit structured reports without becoming permanent targets."],
  ["Live QA alerts", "Leadership sees lateness, absence, coverage gaps, and repeat patterns early."],
  ["Role-based dashboards", "QA, HODs, Registrars, and Vice-Chancellors each get the view they need."],
  ["Contests and evidence", "Reports can be reviewed with timestamps, context, and clean evidence trails."]
];

const roles = [
  ["Vice-Chancellor", "Institution-wide delivery health and academic risk."],
  ["QA Director", "Verification, evidence trails, and escalation."],
  ["Head of Department", "Course delivery gaps and lecturer patterns."],
  ["Registrar", "Reliable records for administrative reporting."]
];

const workflow = [
  ["1", "Class happens"],
  ["2", "Rep reports"],
  ["3", "System verifies"],
  ["4", "Leaders act"]
];

export const metadata: Metadata = {
  title: "ShowUp Mobile | University Quality Assurance Platform",
  description: "A mobile-first view of ShowUp for monitoring lecturer attendance, course coverage, alerts, and academic delivery risk."
};

export default function MobileLandingPage() {
  return (
    <main className="showup-landing min-h-screen overflow-x-hidden bg-[#f7f9f8] font-sans text-[#12203a]">
      <header className="sticky top-0 z-40 border-b border-[#d9e8e4] bg-[#f7f9f8]/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/m" className="inline-flex items-center gap-2 font-black tracking-[-0.04em]" aria-label="ShowUp mobile home">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-[#12203a] text-sm text-white">S</span>
            <span>
              ShowUp
              <span className="block text-[11px] font-semibold tracking-normal text-[#667085]">Quality assurance</span>
            </span>
          </Link>
          <Link href="#demo-request" className="rounded-full bg-[#12203a] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(18,32,58,0.18)]">
            Demo
          </Link>
        </div>
      </header>

      <section className="px-4 pb-12 pt-10">
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#18796e]">Make every semester GTEC-ready</p>
          <h1 className="mt-4 text-[3.1rem] font-black leading-[0.92] tracking-[-0.075em] text-[#12203a]">
            Academic delivery, monitored in real time.
          </h1>
          <p className="mt-5 text-base leading-7 text-[#475467]">
            ShowUp helps universities monitor lecture attendance, punctuality, and course coverage through anonymous class rep reports, live alerts, and role-based quality assurance dashboards.
          </p>
          <div className="mt-7 grid gap-3">
            <Link href="#demo-request" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#12203a] px-5 text-sm font-black text-white">
              Request a Demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="#features" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#12203a]/7 px-5 text-sm font-black text-[#12203a]">
              Explore platform
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-md rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_28px_70px_rgba(18,32,58,0.14)]">
          <MobileDashboardPreview />
        </div>
      </section>

      <section className="px-4 pb-12">
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
          {proofStats.map(([value, label, helper]) => (
            <article key={label} className="rounded-[22px] border border-[#d9e8e4] bg-white p-4 shadow-[0_12px_32px_rgba(18,32,58,0.07)]">
              <strong className="block text-3xl font-black tracking-[-0.06em] text-[#2a9d8f]">{value}</strong>
              <span className="mt-2 block text-sm font-black leading-5 text-[#12203a]">{label}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-[#667085]">{helper}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-12" id="problem">
        <div className="mx-auto max-w-md rounded-[28px] bg-[#12203a] p-5 text-white shadow-[0_24px_60px_rgba(18,32,58,0.18)]">
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/42">THE OLD WAY</p>
          <div className="mt-4 rounded-[16px] bg-[#172638] p-4 text-sm font-bold leading-6 text-[#8c99aa]">
            Dr. Mensah didn&apos;t come today again. 3rd time this month I think?
            <p className="mt-1 text-right text-[11px] text-[#6f7c8c]">10:42 AM</p>
          </div>
          <div className="my-5 flex justify-center text-[#2a9d8f]">
            <ArrowRight className="h-6 w-6 rotate-90" aria-hidden />
          </div>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white/42">THE SHOWUP WAY</p>
          <div className="mt-4 rounded-[16px] bg-white p-4 text-[#12203a]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#667085]">CS301 - Dr. Mensah</span>
              <span className="text-xs font-black uppercase text-[#ff4057]">Absent</span>
            </div>
            <div className="mt-3 border-t border-[#e5e7eb] pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#667085]">Topic coverage</span>
                <strong className="text-[#2a9d8f]">58%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-12">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#18796e]">Core platform</p>
          <h2 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.065em]">A calm operating system for academic quality.</h2>
          <div className="mt-6 grid gap-3">
            {features.map(([title, body]) => (
              <article key={title} className="rounded-[24px] border border-[rgba(16,24,40,0.08)] bg-white p-5 shadow-[0_16px_36px_rgba(18,32,58,0.08)]">
                <h3 className="text-xl font-black tracking-[-0.04em]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="px-4 py-12">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#18796e]">Designed for leaders</p>
          <h2 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.065em]">Every leader sees the truth they need.</h2>
          <div className="mt-6 grid gap-3">
            {roles.map(([title, body], index) => (
              <article key={title} className={`rounded-[24px] border p-5 ${index === 0 ? "border-[#12203a] bg-[#12203a] text-white" : "border-[rgba(16,24,40,0.08)] bg-white text-[#12203a]"}`}>
                <h3 className="text-lg font-black tracking-[-0.03em]">{title}</h3>
                <p className={`mt-1 text-sm leading-6 ${index === 0 ? "text-white/70" : "text-[#667085]"}`}>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-12">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#18796e]">How it works</p>
          <h2 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.065em]">From class report to leadership action.</h2>
          <div className="mt-6 grid gap-3">
            {workflow.map(([number, title]) => (
              <article key={number} className="flex items-center gap-4 rounded-[22px] border border-[#d9e8e4] bg-white p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#dff3ef] text-sm font-black text-[#18796e]">{number}</span>
                <h3 className="text-lg font-black tracking-[-0.035em]">{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-12">
        <div className="mx-auto max-w-md rounded-[28px] border border-[#2a9d8f]/25 bg-white p-6 shadow-[0_20px_54px_rgba(18,32,58,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#18796e]">Pricing</p>
          <h2 className="mt-3 text-4xl font-black leading-[0.98] tracking-[-0.065em]">Built for serious academic quality assurance.</h2>
          <div className="mt-5">
            <span className="block text-5xl font-black tracking-[-0.065em]">GHS 60,000</span>
            <span className="mt-1 block text-sm font-bold text-[#667085]">starting annual license fee for small tertiary institutions</span>
          </div>
          <Link href="#demo-request" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#12203a] px-5 text-sm font-black text-white">
            Request pricing walkthrough
          </Link>
        </div>
      </section>

      <MobileLeadForm />

      <footer className="bg-[#12203a] px-4 py-8 text-white">
        <div className="mx-auto max-w-md">
          <div className="inline-flex items-center gap-2 font-black tracking-[-0.04em]">
            <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-white text-sm text-[#12203a]">S</span>
            ShowUp
          </div>
          <p className="mt-3 text-sm leading-6 text-white/58">Copyright 2026 ShowUp. Built for university quality assurance.</p>
          <div className="mt-5 grid gap-1 text-sm font-semibold text-[#2a9d8f]">
            <a href="mailto:info@weareubic.com">info@weareubic.com</a>
            <a href="tel:+233533904720">+233 533 904 720</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MobileDashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#d9e8e4] bg-[#f7f9f8]">
      <div className="flex items-center justify-between border-b border-[#d9e8e4] bg-white px-4 py-3">
        <div>
          <p className="text-xs font-bold text-[#667085]">Prampram University</p>
          <h2 className="text-lg font-black tracking-[-0.04em]">QA Dashboard</h2>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#12203a] text-white">
          <BarChart3 className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {proofStats.slice(0, 4).map(([value, label]) => (
          <div key={label} className="rounded-[16px] border border-[#d9e8e4] bg-white p-3">
            <strong className="block text-2xl font-black tracking-[-0.055em] text-[#2a9d8f]">{value}</strong>
            <span className="mt-1 block text-[11px] font-bold leading-4 text-[#667085]">{label}</span>
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-[16px] border border-[#d9e8e4] bg-white p-4">
          <div className="flex h-28 items-end gap-2 border-l border-b border-dashed border-[#d9e8e4] px-3 pb-3">
            {[50, 64, 48, 72, 58, 80, 67].map((height, index) => (
              <span key={index} className="flex-1 rounded-t-md bg-[#2a9d8f]" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

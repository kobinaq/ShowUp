import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";

const starterFeatures = [
  "Lecture attendance and punctuality monitoring",
  "Course coverage and delivery risk dashboards",
  "Two anonymous student reporters per class",
  "QA evidence trails for audits and reviews",
  "Contests, flags, and leadership-ready reporting"
];

const enterpriseFeatures = [
  "Multi-campus or large institutional rollout",
  "Custom onboarding and admin setup support",
  "Expanded reporting, governance, and leadership workflows",
  "Procurement, compliance, and implementation planning"
];

export function Pricing() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto mb-12 max-w-3xl text-center">
          <div className="showup-kicker">Pricing</div>
          <h2 className="showup-section-title">Built for serious academic quality assurance.</h2>
          <p className="mt-5 text-lg leading-8 text-[#475467]">
            Start with a clear annual license for small tertiary institutions. Larger institutions and enterprise clients can speak with sales for a tailored rollout.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <article className="reveal rounded-[32px] border border-[#4288c9]/20 bg-white p-8 shadow-[0_24px_70px_rgba(18,32,58,0.10)]">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#4288c9]">Small tertiary institutions</p>
            <div className="mt-5 flex flex-wrap items-end gap-3">
              <span className="text-5xl font-black tracking-[-0.06em] text-[#12203a]">GHS 60,000</span>
              <span className="pb-2 text-sm font-bold text-[#667085]">starting annual license fee</span>
            </div>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#475467]">
              A practical entry point for institutions that need stronger QA visibility, audit evidence, and academic delivery monitoring without building internal tooling from scratch.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {starterFeatures.map((feature) => (
                <p key={feature} className="flex gap-3 rounded-[18px] border border-slate-200 bg-[#f7f9f8] p-4 text-sm font-semibold text-[#26384f]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#4288c9]" aria-hidden />
                  {feature}
                </p>
              ))}
            </div>
            <Link href="#demo-request" className="showup-btn showup-btn-primary mt-8">
              Request pricing walkthrough
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>

          <article className="reveal rounded-[32px] bg-[#12203a] p-8 text-white shadow-[0_24px_70px_rgba(18,32,58,0.16)]">
            <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-white/10">
              <Building2 className="h-6 w-6" aria-hidden />
            </div>
            <p className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-[#8df2de]">Enterprise institutions</p>
            <h3 className="mt-4 text-4xl font-black leading-[1] tracking-[-0.06em]">Talk to sales for a tailored license.</h3>
            <p className="mt-5 text-base leading-7 text-white/72">
              For universities, multi-campus groups, and institutions with custom governance, reporting, or deployment requirements.
            </p>
            <div className="mt-7 grid gap-3">
              {enterpriseFeatures.map((feature) => (
                <p key={feature} className="flex gap-3 rounded-[18px] border border-white/10 bg-white/10 p-4 text-sm font-semibold text-white/86">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8df2de]" aria-hidden />
                  {feature}
                </p>
              ))}
            </div>
            <Link href="#demo-request" className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-[#12203a] transition hover:-translate-y-0.5">
              Contact sales
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

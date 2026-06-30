"use client";

import { useState } from "react";

const roles = {
  vc: {
    label: "Vice-Chancellor",
    meta: "Institution-wide visibility and academic risk.",
    title: "Executive view for Vice-Chancellors",
    copy: "See institution-wide lecture delivery health, departments with recurring academic risk, and the evidence behind every escalation. The goal is not surveillance for its own sake; it is early quality protection.",
    metrics: [["12", "courses below coverage threshold"], ["7", "late alerts requiring review"], ["96%", "sessions accounted for today"]]
  },
  qa: {
    label: "QA Director",
    meta: "Verification, evidence trail, and escalation.",
    title: "Evidence trail for QA Directors",
    copy: "Move from anecdotal complaints to structured verification. QA teams can review attendance, punctuality, course coverage, rep reports, and escalation history in one calm workspace.",
    metrics: [["42", "verified reports today"], ["18", "reports pending review"], ["4", "repeat issue patterns detected"]]
  },
  hod: {
    label: "Head of Department",
    meta: "Course delivery gaps and lecturer patterns.",
    title: "Course-level clarity for HODs",
    copy: "HODs see exactly where a lecturer, course, or class is drifting from the plan. This enables constructive intervention before students lose weeks of academic progress.",
    metrics: [["5", "courses needing follow-up"], ["68%", "average coverage this week"], ["3", "lecturers with repeat flags"]]
  },
  registrar: {
    label: "Registrar",
    meta: "Compliance records and administrative reporting.",
    title: "Reliable records for Registrars",
    copy: "Administrative leaders get consistent attendance and compliance records that can support reporting, audit trails, and policy enforcement without chasing scattered WhatsApp updates.",
    metrics: [["100%", "timestamped report trail"], ["24", "departments connected"], ["1", "source of institutional truth"]]
  }
};

type RoleKey = keyof typeof roles;

export function RolePreview() {
  const [activeRole, setActiveRole] = useState<RoleKey>("vc");
  const role = roles[activeRole];

  return (
    <section id="roles" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto mb-12 max-w-3xl text-center">
          <div className="showup-kicker">Designed for institutional leaders</div>
          <h2 className="showup-section-title">Every leader sees the truth they need.</h2>
          <p className="mt-5 text-lg leading-8 text-[#475467]">
            The same lecture data becomes different intelligence depending on the user&apos;s responsibility.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="reveal grid gap-3">
            {(Object.entries(roles) as [RoleKey, typeof roles[RoleKey]][]).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveRole(key)}
                className={`rounded-[24px] border p-5 text-left transition hover:-translate-y-0.5 ${
                  activeRole === key
                    ? "border-[#2a9d8f]/30 bg-white shadow-[0_16px_40px_rgba(18,32,58,0.08)]"
                    : "border-[rgba(16,24,40,0.08)] bg-white/65"
                }`}
              >
                <strong className="block text-lg tracking-[-0.03em] text-[#12203a]">{item.label}</strong>
                <span className="mt-1 block text-sm leading-6 text-[#667085]">{item.meta}</span>
              </button>
            ))}
          </div>

          <div className="reveal rounded-[32px] border border-[rgba(16,24,40,0.08)] bg-[#12203a] p-8 text-white shadow-[0_24px_70px_rgba(18,32,58,0.14)]">
            <h3 className="text-4xl font-black leading-[1] tracking-[-0.06em]">{role.title}</h3>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">{role.copy}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {role.metrics.map(([value, label]) => (
                <div key={label} className="rounded-[22px] border border-white/10 bg-white/10 p-5">
                  <strong className="block text-4xl font-black tracking-[-0.06em] text-[#8df2de]">{value}</strong>
                  <span className="mt-2 block text-xs font-bold leading-5 text-white/68">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

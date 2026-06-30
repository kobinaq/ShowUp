import { ArrowRight } from "lucide-react";

export function EvolutionDevice() {
  return (
    <section id="problem" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="reveal mx-auto mb-10 max-w-3xl text-center">
          <div className="showup-kicker">From informal reporting to defensible evidence</div>
          <h2 className="showup-section-title">Replace uncertainty with structured academic visibility.</h2>
          <p className="mt-5 text-lg leading-8 text-[#475467]">
            Most institutions already rely on informal class rep feedback. ShowUp makes that process anonymous, auditable, measurable, and useful for leadership decisions.
          </p>
        </div>

        <div className="reveal rounded-[28px] border border-white/10 bg-[#182b4f] p-8 shadow-[0_24px_70px_rgba(18,32,58,0.16)] md:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1.05fr]">
            <div>
              <p className="mb-5 font-mono text-[11px] font-black uppercase tracking-[0.28em] text-white/42">THE OLD WAY</p>
              <div className="max-w-md rounded-[10px] rounded-bl-[18px] bg-[#172638] px-5 py-4 text-[#8c99aa] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-sm font-bold leading-6">Dr. Mensah didn&apos;t come today again. 3rd time this month I think?</p>
                <p className="mt-1 text-right text-[11px] font-semibold text-[#6f7c8c]">10:42 AM ✓✓</p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="grid h-11 w-11 place-items-center rounded-full border border-[#2a9d8f]/30 text-[#00d19a]">
                <ArrowRight className="h-5 w-5" aria-hidden />
              </div>
            </div>

            <div>
              <p className="mb-5 font-mono text-[11px] font-black uppercase tracking-[0.28em] text-white/42">THE SHOWUP WAY</p>
              <div className="max-w-md rounded-[10px] bg-white px-5 py-4 text-[#12203a] shadow-[0_20px_44px_rgba(0,0,0,0.16)]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-[#667085]">CS301 — Dr. Mensah</p>
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#ff4057]">
                    <span className="h-2 w-2 rounded-full bg-[#ff4057]" />
                    ABSENT
                  </span>
                </div>
                <div className="mt-4 border-t border-[#e5e7eb] pt-3 text-sm">
                  <p className="text-[#667085]">This semester</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[#667085]">Topic coverage</span>
                    <strong className="text-[#f4a261]">58%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="reveal rounded-[32px] border border-[rgba(16,24,40,0.08)] bg-white/85 p-7 shadow-[0_16px_40px_rgba(18,32,58,0.08)]">
            <h3 className="text-2xl font-black tracking-[-0.045em] text-[#12203a]">The current reality</h3>
            <p className="mt-3 leading-7 text-[#667085]">Reports are scattered across chats, often delayed, and difficult to defend.</p>
          </article>
          <article className="reveal rounded-[32px] border border-[rgba(16,24,40,0.08)] bg-white/85 p-7 shadow-[0_16px_40px_rgba(18,32,58,0.08)]">
            <h3 className="text-2xl font-black tracking-[-0.045em] text-[#12203a]">The ShowUp way</h3>
            <p className="mt-3 leading-7 text-[#667085]">Every lecture report becomes clean, structured evidence for QA, HODs, and executive leadership.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

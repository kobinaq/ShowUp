import { ArrowRight, CheckCircle2 } from "lucide-react";

export function EvolutionDevice() {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-5 pt-10 md:grid-cols-[1fr_auto_1.1fr]">
      <div className="rounded-lg border border-white/10 bg-white/8 p-4 text-white/80 shadow-2xl backdrop-blur">
        <p className="mb-3 text-xs font-semibold text-white/45">Class rep group</p>
        <div className="rounded-lg rounded-bl-sm bg-white/12 px-4 py-3 text-sm leading-6">
          Dr. Mensah did not come today again. 3rd time this month I think?
        </div>
        <p className="mt-3 text-xs text-white/40">Informal, risky, hard to defend.</p>
      </div>
      <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#00C48C]/40 text-[#00C48C] md:flex">
        <ArrowRight className="h-5 w-5" aria-hidden />
      </div>
      <div className="rounded-lg border border-white/10 bg-white p-4 text-[#0D1F3C] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-xs font-bold text-[#6B7280]">Structured report</p>
          <CheckCircle2 className="h-5 w-5 text-[#00C48C]" aria-hidden />
        </div>
        <div className="grid gap-3 text-sm">
          <Field label="Course" value="CENG301" />
          <Field label="Lecturer" value="Dr. K. Mensah" />
          <div className="flex items-center justify-between rounded-md bg-[#F4F6F9] px-3 py-2">
            <span className="text-[#6B7280]">Status</span>
            <span className="rounded-full bg-[#FF4D4D]/10 px-2 py-1 font-mono text-xs font-bold text-[#FF4D4D]">Absent</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-[#F4F6F9] px-3 py-2">
            <span className="text-[#6B7280]">Topic coverage</span>
            <span className="font-mono font-bold text-[#F5A623]">58%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[#F4F6F9] px-3 py-2">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

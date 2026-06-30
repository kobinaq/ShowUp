import Link from "next/link";
import { EvolutionDevice } from "./EvolutionDevice";

export function Hero() {
  return (
    <section className="bg-[#0D1F3C] px-4 pb-16 pt-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center">
        <div className="max-w-4xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#00C48C]">University quality assurance platform</p>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            What is not measured
            <br />
            cannot be <span className="text-[#00C48C]">improved</span>.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">
            QA departments already know they need real visibility into whether lectures are happening as planned. Many have tried to build it themselves informally, with class rep WhatsApp groups. ShowUp is that instinct, done properly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#demo-request" className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#00C48C] px-6 text-sm font-bold text-[#0D1F3C] transition hover:-translate-y-0.5 hover:bg-[#12dca2]">
              Request a Demo
            </Link>
          </div>
        </div>
        <EvolutionDevice />
      </div>
    </section>
  );
}

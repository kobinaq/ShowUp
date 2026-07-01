import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function Nav() {
  return (
    <header className="sticky top-4 z-50 mx-auto mt-4 w-[min(1180px,calc(100%-40px))] rounded-full border border-[rgba(16,24,40,0.08)] bg-white/75 px-3 py-2 shadow-[0_12px_32px_rgba(18,32,58,0.07)] backdrop-blur-xl">
      <div className="flex min-h-12 items-center justify-between">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm font-bold text-[#344054] md:flex">
          <Link href="#problem" className="transition hover:text-[#18796e]">Problem</Link>
          <Link href="#features" className="transition hover:text-[#18796e]">Features</Link>
          <Link href="#roles" className="transition hover:text-[#18796e]">Roles</Link>
          <Link href="#workflow" className="transition hover:text-[#18796e]">Workflow</Link>
          <Link href="#pricing" className="transition hover:text-[#18796e]">Pricing</Link>
        </nav>
        <Link href="#demo-request" className="rounded-full bg-[#12203a] px-5 py-3 text-sm font-black text-white shadow-[0_14px_26px_rgba(18,32,58,0.22)] transition hover:-translate-y-0.5">
          Request a Demo
        </Link>
      </div>
    </header>
  );
}

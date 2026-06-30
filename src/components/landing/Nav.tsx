import Link from "next/link";
import { Wordmark } from "./Wordmark";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D1F3C]/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Wordmark />
        <Link href="#demo-request" className="rounded-md bg-[#00C48C] px-4 py-2 text-sm font-bold text-[#0D1F3C] transition hover:-translate-y-0.5 hover:bg-[#12dca2]">
          Request a Demo
        </Link>
      </div>
    </header>
  );
}

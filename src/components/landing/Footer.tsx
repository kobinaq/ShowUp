import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0D1F3C] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark small />
          <p className="mt-2 text-sm text-white/55">Copyright 2026 ShowUp. Built for university quality assurance.</p>
        </div>
        <a href="mailto:hello@showup.app" className="text-sm font-semibold text-[#00C48C]">hello@showup.app</a>
      </div>
    </footer>
  );
}

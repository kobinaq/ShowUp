import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0D1F3C] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark small />
          <p className="mt-2 text-sm text-white/55">Copyright 2026 ShowUp. Built for university quality assurance.</p>
        </div>
        <div className="flex flex-col gap-1 text-sm font-semibold text-[#00C48C] sm:text-right">
          <a href="mailto:info@weareubic.com">info@weareubic.com</a>
          <a href="tel:+23353394720">+233 53 394 720</a>
        </div>
      </div>
    </footer>
  );
}

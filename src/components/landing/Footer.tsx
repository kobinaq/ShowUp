import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#12203a] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Wordmark small tone="light" />
          <p className="mt-2 text-sm text-white/55">Copyright 2026 ShowUp. Built for university quality assurance.</p>
        </div>
        <div className="flex flex-col gap-1 text-sm font-semibold text-[#00C48C] sm:text-right">
          <a href="mailto:info@weareubic.com">info@weareubic.com</a>
          <a href="tel:+233533904720">+233 533 904 720</a>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

export function Wordmark({ small = false, tone = "dark" }: { small?: boolean; tone?: "dark" | "light" }) {
  const textColor = tone === "light" ? "text-white" : "text-[#12203a]";

  return (
    <Link href="/" className={`inline-flex items-center font-display font-bold tracking-[-0.04em] ${textColor}`} aria-label="ShowUp home">
      <span className={`mr-2 grid h-9 w-9 place-items-center rounded-[13px] text-sm font-black shadow-[0_12px_24px_rgba(42,157,143,0.22)] ${tone === "light" ? "bg-white text-[#12203a]" : "bg-[#12203a] text-white"}`}>
        S
      </span>
      <span className={small ? "text-xl" : "text-2xl"}>Show</span>
      <span className={`relative text-[#00C48C] ${small ? "text-xl" : "text-2xl"}`}>
        <span className="absolute -left-0.5 top-0 h-2 w-4 rotate-[-32deg] rounded-full border-b-2 border-l-2 border-[#00C48C]" aria-hidden />
        Up
      </span>
    </Link>
  );
}

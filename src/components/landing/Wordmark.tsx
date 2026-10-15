import Link from "next/link";

export function Wordmark({ small = false, tone = "dark" }: { small?: boolean; tone?: "dark" | "light" }) {
  const textColor = tone === "light" ? "text-white" : "text-[#12203a]";

  return (
    <Link href="/" className={`inline-flex items-center font-display font-bold tracking-[-0.04em] ${textColor}`} aria-label="Meridiqa home">
      <span className={`mr-2 grid h-9 w-9 place-items-center rounded-[13px] text-sm font-black shadow-[0_12px_24px_rgba(42,157,143,0.22)] ${tone === "light" ? "bg-white text-[#12203a]" : "bg-[#12203a] text-white"}`}>
        M
      </span>
      <span className={small ? "text-xl" : "text-2xl"}>Meridiqa</span>
    </Link>
  );
}

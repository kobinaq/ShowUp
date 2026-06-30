import Link from "next/link";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center font-display font-bold tracking-tight text-white" aria-label="ShowUp home">
      <span className={small ? "text-xl" : "text-2xl"}>Show</span>
      <span className={`relative text-[#00C48C] ${small ? "text-xl" : "text-2xl"}`}>
        <span className="absolute -left-0.5 top-0 h-2 w-4 rotate-[-32deg] rounded-full border-b-2 border-l-2 border-[#00C48C]" aria-hidden />
        Up
      </span>
    </Link>
  );
}

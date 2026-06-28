export const dynamic = "force-dynamic";

export default function RepLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-xl bg-white px-4 py-4">{children}</main>;
}

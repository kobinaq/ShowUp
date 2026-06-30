"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0D1F3C] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--ring)_38%,transparent),transparent_34%),linear-gradient(135deg,#0D1F3C_0%,#143766_52%,#0D1F3C_100%)]" aria-hidden />
      <div className="absolute right-[-8rem] top-16 h-72 w-72 rounded-full bg-[#00C48C]/12 blur-3xl" aria-hidden />
      <form onSubmit={onSubmit} className="relative w-full max-w-sm rounded-card border border-white/20 bg-white p-6 shadow-2xl">
        <h1 className="font-display text-3xl font-bold">ShowUp</h1>
        <p className="mt-1 text-sm text-muted">Sign in with your university or reporter credentials.</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-md border px-3" required />
        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-md border px-3" required />
        <button disabled={loading} className="mt-6 h-12 w-full rounded-md bg-accent font-semibold text-navy disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

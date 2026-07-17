"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 10) return toast.error("Use at least 10 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    const me = await fetch("/api/auth/me").then((res) => res.json()).catch(() => null);
    router.push(typeof me?.home === "string" ? me.home : "/login");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0D1F3C] px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-card border border-white/20 bg-white p-6 shadow-2xl">
        <h1 className="font-display text-3xl font-bold">Set new password</h1>
        <p className="mt-2 text-sm text-muted">Choose a new password for your ShowUp account.</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="password">New password</label>
        <input id="password" type="password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-md border px-3" />
        <label className="mt-4 block text-sm font-medium" htmlFor="confirm">Confirm password</label>
        <input id="confirm" type="password" required minLength={10} value={confirm} onChange={(event) => setConfirm(event.target.value)} className="mt-2 h-12 w-full rounded-md border px-3" />
        <button disabled={loading} className="mt-6 h-12 w-full rounded-md bg-accent font-semibold text-navy disabled:opacity-60">
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </main>
  );
}

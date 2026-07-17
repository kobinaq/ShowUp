"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/api/auth/callback?next=${encodeURIComponent("/update-password")}`
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent if that account exists");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#0D1F3C] px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-card border border-white/20 bg-white p-6 shadow-2xl">
        <h1 className="font-display text-3xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-muted">
          {sent ? "Check your email for a secure reset link." : "Enter your account email and we will send a reset link."}
        </p>
        {!sent ? (
          <>
            <label className="mt-6 block text-sm font-medium" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-md border px-3" />
            <button disabled={loading} className="mt-6 h-12 w-full rounded-md bg-accent font-semibold text-navy disabled:opacity-60">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </>
        ) : null}
        <p className="mt-4 text-center text-sm text-muted">
          <a href="/login" className="font-semibold text-navy underline underline-offset-2">
            Back to sign in
          </a>
        </p>
      </form>
    </main>
  );
}

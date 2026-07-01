"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { LifeBuoy, Send, X } from "lucide-react";

const categories = [
  ["LOGIN_ACCESS", "Login/access"],
  ["COURSE_SETUP", "Course setup"],
  ["REPORTING_ISSUE", "Reporting issue"],
  ["NOTIFICATION_ISSUE", "Notification issue"],
  ["DATA_CORRECTION", "Data correction"],
  ["OTHER", "Other"]
];

export function SupportButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject: form.get("subject"),
        message: form.get("message"),
        category: form.get("category"),
        priority: form.get("priority")
      })
    });
    setLoading(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not send support request");
      return;
    }
    setSubmitted(true);
    toast.success("IT has been notified");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSubmitted(false);
        }}
        className={compact ? "inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-navy hover:border-primary" : "inline-flex h-11 w-11 items-center justify-center rounded-lg bg-navy text-white shadow-card hover:bg-navy/90"}
        aria-label="Ping IT"
        title="Ping IT"
      >
        <LifeBuoy className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-navy/40 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-navy">Ping IT</h2>
                <p className="mt-1 text-sm text-muted">Send an issue to your university IT team.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-muted hover:bg-slate-100" aria-label="Close support form">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {submitted ? (
              <div className="py-8 text-center">
                <p className="font-semibold text-navy">Your request has been sent to IT.</p>
                <p className="mt-2 text-sm text-muted">They will review it from their support dashboard.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 grid gap-3">
                <input name="subject" required minLength={4} maxLength={140} placeholder="Brief subject" className="h-11 rounded-md border px-3 text-sm" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="category" required defaultValue="OTHER" className="h-11 rounded-md border px-3 text-sm">
                    {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <select name="priority" required defaultValue="NORMAL" className="h-11 rounded-md border px-3 text-sm">
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <textarea name="message" required minLength={10} maxLength={1200} placeholder="Describe what you need help with" className="min-h-28 rounded-md border px-3 py-3 text-sm" />
                <button disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-navy disabled:opacity-60">
                  <Send className="h-4 w-4" aria-hidden />
                  {loading ? "Sending..." : "Send to IT"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

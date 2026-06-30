"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

const roles = ["Vice-Chancellor", "Pro Vice-Chancellor", "Registrar", "QA Officer", "Head of Department", "Other"];

const leadSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(100),
  email: z.string().email("Enter a valid work email"),
  institution: z.string().min(2, "Enter your institution").max(150),
  role: z.string().min(2, "Select your role"),
  message: z.string().max(1000).optional()
});

type LeadValues = z.infer<typeof leadSchema>;

export function LeadForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { fullName: "", email: "", institution: "", role: roles[0], message: "" }
  });

  async function onSubmit(values: LeadValues) {
    setServerError("");
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setServerError(body?.error ?? "Could not send your request. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  return (
    <section id="demo-request" className="bg-[#0D1F3C] px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.8fr_1fr] lg:items-start">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#00C48C]">Request access</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight">See it for your institution</h2>
          <p className="mt-4 text-base leading-7 text-white/68">
            Tell us a bit about your university and we will reach out to set up a walkthrough.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white p-5 text-[#0D1F3C] shadow-2xl sm:p-6">
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00C48C]/12 text-[#00C48C]">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-2xl font-bold">Thank you. We will be in touch within 1-2 business days.</h3>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">Your request has been received by the ShowUp team.</p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Full Name" registration={form.register("fullName")} error={form.formState.errors.fullName?.message} />
              <Input label="Work Email" type="email" registration={form.register("email")} error={form.formState.errors.email?.message} />
              <Input label="Institution / University Name" registration={form.register("institution")} error={form.formState.errors.institution?.message} />
              <label className="block text-sm font-bold">
                Role
                <select {...form.register("role")} className="mt-1 min-h-12 w-full rounded-md border border-[#D8DEE8] bg-white px-3 text-sm">
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Message
                <textarea {...form.register("message")} placeholder="Anything specific you would like us to cover?" className="mt-1 min-h-28 w-full rounded-md border border-[#D8DEE8] px-3 py-3 text-sm" />
                {form.formState.errors.message?.message ? <span className="mt-1 block text-xs text-[#FF4D4D]">{form.formState.errors.message.message}</span> : null}
              </label>
              {serverError ? <p className="rounded-md bg-[#FF4D4D]/10 px-3 py-2 text-sm font-semibold text-[#c62828]">{serverError}</p> : null}
              <button disabled={form.formState.isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#00C48C] px-5 text-sm font-bold text-[#0D1F3C] transition hover:bg-[#12dca2] disabled:opacity-70">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {form.formState.isSubmitting ? "Sending..." : "Request a Demo"}
              </button>
              <p className="text-center text-sm text-[#6B7280]">
                Prefer to explore on your own?{" "}
                <a href="https://show-up-six.vercel.app/" target="_blank" rel="noreferrer" className="font-bold text-[#0D1F3C] underline decoration-[#00C48C] underline-offset-4">
                  Try the live demo
                </a>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Input({
  label,
  type = "text",
  registration,
  error
}: {
  label: string;
  type?: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input {...registration} type={type} className="mt-1 min-h-12 w-full rounded-md border border-[#D8DEE8] px-3 text-sm" />
      {error ? <span className="mt-1 block text-xs text-[#FF4D4D]">{error}</span> : null}
    </label>
  );
}

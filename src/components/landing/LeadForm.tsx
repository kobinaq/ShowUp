"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

const roles = ["Vice-Chancellor", "Pro Vice-Chancellor", "Registrar", "QA Officer", "Head of Department", "Other"];

const leadSchema = z.object({
  fullName: z.string().min(2, "Enter your full name").max(100),
  email: z.string().email("Enter a valid email"),
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
    <section id="demo-request" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="reveal mx-auto grid max-w-6xl gap-8 rounded-[36px] bg-[#12203a] p-7 text-white shadow-[0_24px_70px_rgba(18,32,58,0.16)] lg:grid-cols-[0.9fr_1fr] lg:items-start lg:p-10">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-[#8df2de]">Request access</p>
          <h2 className="mt-4 text-4xl font-black leading-[1] tracking-[-0.065em] sm:text-5xl">See how ShowUp can strengthen academic quality assurance in your institution.</h2>
          <p className="mt-5 text-lg leading-8 text-white/68">
            Tell us a bit about your university and we will reach out to set up a walkthrough.
          </p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white p-5 text-[#12203a] shadow-[0_20px_44px_rgba(0,0,0,0.16)] sm:p-6">
          {submitted ? (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00C48C]/12 text-[#00C48C]">
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]">Thank you. We will be in touch within 1-2 business days.</h3>
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">Your request has been received by the ShowUp team.</p>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Full Name" registration={form.register("fullName")} error={form.formState.errors.fullName?.message} />
              <Input label="Email" type="email" registration={form.register("email")} error={form.formState.errors.email?.message} />
              <Input label="Institution / University Name" registration={form.register("institution")} error={form.formState.errors.institution?.message} />
              <label className="block text-sm font-bold">
                Role
                <select {...form.register("role")} className="mt-1 min-h-12 w-full rounded-[14px] border border-[#D8DEE8] bg-white px-3 text-sm outline-none transition focus:border-[#2a9d8f]">
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">
                Message
                <textarea {...form.register("message")} placeholder="Anything specific you would like us to cover?" className="mt-1 min-h-28 w-full rounded-[14px] border border-[#D8DEE8] px-3 py-3 text-sm outline-none transition focus:border-[#2a9d8f]" />
                {form.formState.errors.message?.message ? <span className="mt-1 block text-xs text-[#FF4D4D]">{form.formState.errors.message.message}</span> : null}
              </label>
              {serverError ? <p className="rounded-md bg-[#FF4D4D]/10 px-3 py-2 text-sm font-semibold text-[#c62828]">{serverError}</p> : null}
              <button disabled={form.formState.isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#12203a] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-70">
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {form.formState.isSubmitting ? "Sending..." : "Request a Demo"}
              </button>
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
      <input {...registration} type={type} className="mt-1 min-h-12 w-full rounded-[14px] border border-[#D8DEE8] px-3 text-sm outline-none transition focus:border-[#2a9d8f]" />
      {error ? <span className="mt-1 block text-xs text-[#FF4D4D]">{error}</span> : null}
    </label>
  );
}

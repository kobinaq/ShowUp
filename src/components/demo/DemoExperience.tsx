"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type DemoRole = "QA_OFFICER" | "VC" | "HOD" | "CLASS_REP" | "SUPER_ADMIN" | "IT";

const ROLE_OPTIONS: Array<{ role: DemoRole; label: string; blurb: string }> = [
  { role: "QA_OFFICER", label: "QA Officer", blurb: "Command center, flags, late pings, ShowUp AI" },
  { role: "VC", label: "Vice Chancellor", blurb: "Leadership analytics across the university" },
  { role: "HOD", label: "Head of Department", blurb: "Department courses, contests, coverage" },
  { role: "CLASS_REP", label: "Class Reporter", blurb: "Anonymous lecture report submission" },
  { role: "SUPER_ADMIN", label: "Super Admin", blurb: "University setup and staff provisioning" },
  { role: "IT", label: "IT Officer", blurb: "Support tickets and admin tools" }
];

type SessionState = {
  active: boolean;
  role?: DemoRole;
  phone?: string | null;
  home?: string;
};

export function DemoExperience() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [role, setRole] = useState<DemoRole>("QA_OFFICER");
  const [phone, setPhone] = useState("");
  const [session, setSession] = useState<SessionState>({ active: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [lastAckUrl, setLastAckUrl] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/demo/session")
      .then((res) => res.json())
      .then((data: { enabled?: boolean }) => setEnabled(Boolean(data.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function startDemo() {
    setBusy("start");
    const res = await fetch("/api/demo/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken, role, phone: phone.trim() || undefined })
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast.error(data.error ?? "Could not start demo");
    setSession({ active: true, role: data.role, phone: data.phone, home: data.home });
    toast.success("Live demo session started");
  }

  async function switchRole(nextRole: DemoRole) {
    setBusy(`role-${nextRole}`);
    const res = await fetch("/api/demo/session", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: nextRole, phone: phone.trim() || null })
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast.error(data.error ?? "Could not switch role");
    setRole(nextRole);
    setSession({ active: true, role: data.role, phone: data.phone, home: data.home });
    toast.success(`Now exploring as ${nextRole.replaceAll("_", " ")}`);
  }

  async function savePhone() {
    setBusy("phone");
    const res = await fetch("/api/demo/session", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: phone.trim() || null })
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast.error(data.error ?? "Could not save phone");
    setSession((prev) => ({ ...prev, phone: data.phone }));
    toast.success("Phone saved for live SMS");
  }

  async function sendSms(kind: "test" | "late_ping" | "absence") {
    setBusy(kind);
    const res = await fetch("/api/demo/sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, phone: phone.trim() || undefined })
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) return toast.error(data.error ?? "SMS failed");
    if (data.acknowledgeUrl) setLastAckUrl(data.acknowledgeUrl);
    if (data.status === "sent") toast.success(`SMS sent to ${data.phone}`);
    else toast.error(`SMS status: ${data.status}`);
  }

  async function endDemo() {
    setBusy("end");
    await fetch("/api/demo/session", { method: "DELETE" });
    setBusy(null);
    setSession({ active: false });
    toast.success("Demo session ended");
    router.push("/demo");
    router.refresh();
  }

  function enterApp() {
    const fallback =
      role === "CLASS_REP" ? "/rep/submit" : role === "VC" ? "/analytics" : role === "SUPER_ADMIN" || role === "IT" ? "/admin" : role === "HOD" ? "/courses" : "/dashboard";
    router.push(session.home ?? fallback);
    router.refresh();
  }

  if (enabled === null) {
    return <p className="text-sm text-muted">Checking demo availability…</p>;
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <p className="font-semibold">Live demo is not enabled on this deployment.</p>
        <p className="mt-2">Set <code className="rounded bg-white px-1.5 py-0.5">DEMO_ACCESS_TOKEN</code> and <code className="rounded bg-white px-1.5 py-0.5">DEMO_SESSION_SECRET</code> in the environment, seed the ATU demo data, and configure Arkesel for SMS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!session.active ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-navy">Enter live demo</h2>
          <p className="mt-2 text-sm text-muted">
            Skips Supabase login and drops you into the seeded university with real SMS. Share the access code only with people in the pitch room.
          </p>
          <label className="mt-6 block text-sm font-medium" htmlFor="demo-code">Access code</label>
          <input
            id="demo-code"
            type="password"
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border px-3"
            placeholder="Demo access token"
            autoComplete="off"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="demo-phone">Your phone for live SMS</label>
          <input
            id="demo-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="mt-2 h-12 w-full rounded-md border px-3"
            placeholder="+233…"
          />
          <label className="mt-4 block text-sm font-medium">Start as</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => setRole(option.role)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  role === option.role ? "border-accent bg-accent/10" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-sm font-semibold text-navy">{option.label}</div>
                <div className="mt-1 text-xs text-muted">{option.blurb}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy === "start" || !accessToken.trim()}
            onClick={() => void startDemo()}
            className="mt-6 h-12 w-full rounded-md bg-accent font-semibold text-navy disabled:opacity-60"
          >
            {busy === "start" ? "Starting…" : "Start live demo"}
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Live demo active</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-navy">
                  Exploring as {(session.role ?? role).replaceAll("_", " ")}
                </h2>
                <p className="mt-1 text-sm text-muted">Auth is bypassed. Actions run against seeded ATU demo data.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={enterApp} className="h-11 rounded-md bg-navy px-4 text-sm font-semibold text-white">
                  Open app
                </button>
                <button type="button" onClick={() => void endDemo()} className="h-11 rounded-md border px-4 text-sm font-semibold">
                  End demo
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-display text-xl font-bold text-navy">Switch role</h3>
            <p className="mt-1 text-sm text-muted">Walk the same pitch from QA, leadership, HOD, and reporter perspectives.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.role}
                  type="button"
                  disabled={busy === `role-${option.role}`}
                  onClick={() => void switchRole(option.role)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    session.role === option.role ? "border-accent bg-accent/10" : "border-slate-200"
                  }`}
                >
                  <div className="text-sm font-semibold">{option.label}</div>
                  <div className="mt-1 text-xs text-muted">{option.blurb}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="font-display text-xl font-bold text-navy">Live SMS</h3>
            <p className="mt-1 text-sm text-muted">
              Sends real Arkesel messages to the phone you provide — use a number in the room during the pitch.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-12 flex-1 rounded-md border px-3"
                placeholder="+233…"
              />
              <button type="button" disabled={busy === "phone"} onClick={() => void savePhone()} className="h-12 rounded-md border px-4 text-sm font-semibold">
                Save phone
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button type="button" disabled={!!busy} onClick={() => void sendSms("test")} className="h-12 rounded-md bg-accent px-3 text-sm font-semibold text-navy disabled:opacity-60">
                {busy === "test" ? "Sending…" : "Test SMS"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => void sendSms("late_ping")} className="h-12 rounded-md border px-3 text-sm font-semibold disabled:opacity-60">
                {busy === "late_ping" ? "Sending…" : "Late-ping SMS"}
              </button>
              <button type="button" disabled={!!busy} onClick={() => void sendSms("absence")} className="h-12 rounded-md border px-3 text-sm font-semibold disabled:opacity-60">
                {busy === "absence" ? "Sending…" : "Absence SMS"}
              </button>
            </div>
            {lastAckUrl ? (
              <p className="mt-4 break-all text-xs text-muted">
                Acknowledge link (also in the late-ping SMS):{" "}
                <a className="font-semibold text-navy underline" href={lastAckUrl} target="_blank" rel="noreferrer">
                  {lastAckUrl}
                </a>
              </p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

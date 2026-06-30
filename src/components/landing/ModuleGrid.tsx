import { Bell, Bot, CheckCircle2, ClipboardList } from "lucide-react";

const modules = [
  {
    title: "Attendance & Punctuality",
    body: "Presence, lateness, and early dismissal logged per session, with automatic flags for repeat patterns.",
    tone: "bg-[#00C48C]/12 text-[#008b65]",
    Icon: CheckCircle2
  },
  {
    title: "Topic Coverage Engine",
    body: "Compares what was taught against the HOD-submitted outline, a real percentage, not a self-report.",
    tone: "bg-[#F5A623]/15 text-[#a76a00]",
    Icon: ClipboardList
  },
  {
    title: "Late Alert System",
    body: "Class reps can ping a late lecturer after a configurable threshold; QA and the lecturer are notified instantly.",
    tone: "bg-[#FF4D4D]/12 text-[#c62828]",
    Icon: Bell
  },
  {
    title: "Ask ShowUp",
    body: "QA and the VC can type a plain question, like who has missed the most classes, and get an instant answer.",
    tone: "bg-[#0D1F3C]/10 text-[#0D1F3C]",
    Icon: Bot
  }
];

export function ModuleGrid() {
  return (
    <section className="bg-[#F4F6F9] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="font-display text-4xl font-bold tracking-tight text-[#0D1F3C]">
            What QA actually <span className="text-[#00C48C]">sees</span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#6B7280]">
            Every module feeds the same source of truth: no spreadsheets, no group chats, no guesswork.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {modules.map(({ title, body, tone, Icon }) => (
            <article key={title} className="rounded-lg border border-[#D8DEE8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
              <div className={`flex h-11 w-11 items-center justify-center rounded-md ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold text-[#0D1F3C]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

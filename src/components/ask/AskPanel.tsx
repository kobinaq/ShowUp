"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Message = {
  q: string;
  a: string;
};

const exampleQuestions = [
  "Summarize the biggest risks in my scope",
  "Show unresolved flags",
  "Which lecturers missed the most classes this semester?",
  "Who has been late more than 3 times?",
  "Which courses are behind on their outline?"
];

export function AskPanel({ universityName }: { universityName?: string | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const databaseLabel = universityName ? `${universityName}'s database` : "your selected university database";
  const isSettingsPage = pathname.startsWith("/settings");

  async function handleSubmit() {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q })
      });
      const payload = (await response.json()) as { answer?: string; error?: string };
      setMessages((previous) => [
        ...previous,
        {
          q,
          a: payload.answer ?? payload.error ?? "ShowUp AI could not answer that right now."
        }
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        { q, a: "ShowUp AI could not connect. Please check your connection and try again." }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-2xl shadow-navy/20 transition duration-200 hover:-translate-y-1 hover:scale-105 hover:bg-navy/90 focus:outline-none focus:ring-4 focus:ring-accent/30 md:right-6",
          isSettingsPage ? "bottom-40 md:bottom-24" : "bottom-24 md:bottom-6"
        )}
        aria-label="Open ShowUp AI"
        title="ShowUp AI"
      >
        <MessageSquare className="h-6 w-6" aria-hidden />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-navy/25 backdrop-blur-[1px]"
            aria-label="Close ShowUp AI"
            onClick={() => setIsOpen(false)}
          />
          <aside className={cn(
            "absolute right-3 flex h-[80vh] max-h-[760px] w-[calc(100%-1.5rem)] max-w-[460px] animate-[showup-panel-in_180ms_ease-out] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl md:right-6",
            isSettingsPage ? "bottom-40 md:bottom-24" : "bottom-24 md:bottom-6"
          )}>
            <span className="absolute -top-7 right-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-navy text-white shadow-xl shadow-navy/20">
              <Bot className="h-6 w-6" aria-hidden />
            </span>
            <header className="flex items-center justify-between rounded-t-2xl border-b border-slate-100 px-5 py-4 pr-24">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-navy">
                  <Bot className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-navy">ShowUp AI</h2>
                  <p className="mt-0.5 text-xs text-muted">Answers from your scoped database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-navy"
                aria-label="Close ShowUp AI"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm leading-6 text-blue-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <Sparkles className="h-4 w-4" aria-hidden />
                      Ask about ShowUp data
                    </div>
                    Ask me questions only related to {databaseLabel}.
                  </div>
                  <p className="text-xs font-bold text-muted">Suggested prompts</p>
                  {exampleQuestions.map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => setQuestion(example)}
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 transition-colors hover:border-accent hover:bg-accent/10"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              ) : null}

              {messages.map((message, index) => (
                <div key={`${message.q}-${index}`} className="space-y-2">
                  <div className="ml-8 rounded-2xl rounded-tr-sm bg-navy px-4 py-2.5 text-sm leading-6 text-white">
                    {message.q}
                  </div>
                  <div className="mr-8 rounded-2xl rounded-tl-sm border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
                    {message.a}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="mr-8 flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Checking the data...
                </div>
              ) : null}
            </div>

            <footer className="border-t border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 focus-within:border-accent">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSubmit();
                  }}
                  placeholder="Ask about attendance, coverage, flags..."
                  className="min-h-10 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!question.trim() || loading}
                  className="rounded-md p-2 text-accent transition-colors disabled:text-slate-300"
                  aria-label="Send question"
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">Powered by Groq. Data from ShowUp only.</p>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

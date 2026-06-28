"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send, X } from "lucide-react";

type Message = {
  q: string;
  a: string;
};

const exampleQuestions = [
  "Which lecturers missed the most classes this semester?",
  "What is the topic coverage for the Computer Science department?",
  "Who has been late more than 3 times?",
  "Which courses are behind on their outline?"
];

export function AskPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

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
          a: payload.answer ?? payload.error ?? "Ask ShowUp could not answer that right now."
        }
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        { q, a: "Ask ShowUp could not connect. Please check your connection and try again." }
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
        className="mt-4 flex w-full items-center gap-2 rounded-md bg-accent/10 px-3 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        Ask ShowUp
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-navy/30"
            aria-label="Close Ask ShowUp"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-slate-100 bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Ask ShowUp</h2>
                <p className="mt-0.5 text-xs text-muted">Ask about lecturer performance</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-navy"
                aria-label="Close Ask ShowUp"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted">Try asking</p>
                  {exampleQuestions.map((example) => (
                    <button
                      type="button"
                      key={example}
                      onClick={() => setQuestion(example)}
                      className="block w-full rounded-md bg-slate-50 px-3 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              ) : null}

              {messages.map((message, index) => (
                <div key={`${message.q}-${index}`} className="space-y-2">
                  <div className="ml-8 rounded-2xl rounded-tr-sm bg-navy px-4 py-2.5 text-sm text-white">
                    {message.q}
                  </div>
                  <div className="mr-8 rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-2.5 text-sm leading-relaxed text-slate-700">
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
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2">
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
              <p className="mt-2 text-center text-[10px] text-slate-400">Powered by Claude Haiku. Data from ShowUp only.</p>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}

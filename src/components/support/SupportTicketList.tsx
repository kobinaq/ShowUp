"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { displayText } from "@/lib/utils/displayText";
import { cn } from "@/lib/utils/cn";

export type SupportTicketListItem = {
  id: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  emailStatus: string;
  smsStatus: string;
  createdAt: string;
  requester: { displayName: string | null; email: string | null; role: string };
  assignedTo: { displayName: string | null; email: string | null } | null;
};

const filters = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function SupportTicketList({ tickets, canManage }: { tickets: SupportTicketListItem[]; canManage: boolean }) {
  const [filter, setFilter] = useState("ALL");
  const [items, setItems] = useState(tickets);
  const visible = useMemo(() => items.filter((item) => filter === "ALL" || item.status === filter), [filter, items]);

  async function updateStatus(id: string, status: string) {
    const response = await fetch(`/api/support/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      toast.error("Could not update ticket");
      return;
    }
    const body = await response.json() as { data: SupportTicketListItem };
    setItems((current) => current.map((item) => item.id === id ? { ...item, status: body.data.status } : item));
    toast.success("Ticket updated");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setFilter(item)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-semibold", filter === item ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-muted hover:border-primary")}
          >
            {displayText(item)}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {visible.length ? visible.map((ticket) => (
          <article key={ticket.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-navy">{ticket.subject}</h2>
                  <Badge>{displayText(ticket.status)}</Badge>
                  <Badge>{displayText(ticket.priority)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {displayText(ticket.category)} by {ticket.requester.displayName ?? ticket.requester.email ?? displayText(ticket.requester.role)}
                </p>
              </div>
              {canManage ? (
                <select value={ticket.status} onChange={(event) => void updateStatus(ticket.id, event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold">
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{ticket.message}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-muted">
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              <span>Email: {ticket.emailStatus}</span>
              <span>SMS: {ticket.smsStatus}</span>
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
            <p className="font-semibold text-navy">No support tickets in this view.</p>
            <p className="mt-1 text-sm text-muted">New IT requests will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{children}</span>;
}

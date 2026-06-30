"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { displayText } from "@/lib/utils/displayText";

export type UserLifecycleItem = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
};

export function UserLifecyclePanel({ users }: { users: UserLifecycleItem[] }) {
  const [items, setItems] = useState(users);

  async function setActive(id: string, isActive: boolean) {
    const response = await fetch(`/api/profiles/${id}/status`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      toast.error(body.error ?? "Could not update user");
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, isActive } : item));
    toast.success(isActive ? "User activated" : "User deactivated");
  }

  return (
    <div className="space-y-2">
      {items.length ? items.map((user) => (
        <div key={user.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-navy">{user.displayName ?? user.email ?? "Unnamed user"}</p>
            <p className="mt-1 text-xs text-muted">{displayText(user.role)}{user.email ? ` - ${user.email}` : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => void setActive(user.id, !user.isActive)}
            className={`h-9 rounded-md px-3 text-sm font-semibold ${user.isActive ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      )) : <p className="text-sm text-muted">No users in this scope yet.</p>}
    </div>
  );
}

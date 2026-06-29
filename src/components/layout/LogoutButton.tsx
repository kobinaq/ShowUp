"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={loading}
      className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold text-navy transition hover:border-accent hover:bg-accent/10 disabled:opacity-60"
      aria-label="Log out"
      title="Log out"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{loading ? "Logging out..." : "Log out"}</span>
    </button>
  );
}

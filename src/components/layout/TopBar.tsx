import { createClient } from "@/lib/supabase/server";

export async function TopBar() {
  const { data } = await createClient().auth.getUser();
  return (
    <header className="flex min-h-16 items-center justify-between border-b bg-white px-4 md:px-8">
      <div>
        <p className="text-sm text-muted">Quality assurance workspace</p>
        <h1 className="font-display text-xl font-bold">ShowUp</h1>
      </div>
      <div className="text-right text-sm text-muted">{data.user?.email}</div>
    </header>
  );
}

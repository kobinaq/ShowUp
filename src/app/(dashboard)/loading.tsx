export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-72 rounded-full bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded-full bg-slate-200" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="space-y-4 p-4">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="h-8 w-20 rounded-full bg-slate-200" />
              <div className="h-3 w-36 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white shadow-card" />
    </div>
  );
}

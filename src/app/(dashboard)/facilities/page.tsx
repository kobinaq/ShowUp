import { FacilitiesPanel } from "@/components/facilities/FacilitiesPanel";

export default function FacilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">Facilities</h1>
        <p className="mt-1 text-sm text-muted">Room-not-ready and facilities issues — delays here stay off lecturer scorecards.</p>
      </div>
      <FacilitiesPanel />
    </div>
  );
}

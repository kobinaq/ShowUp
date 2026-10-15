export function rosterFairness(assignments: Array<{ sealedIdentityId: string; createdAt: Date }>) {
  const ordered = [...assignments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const counts = new Map<string, number>();
  for (const assignment of assignments) {
    counts.set(assignment.sealedIdentityId, (counts.get(assignment.sealedIdentityId) ?? 0) + 1);
  }
  const recent = ordered.slice(0, 4);
  const recentCounts = new Map<string, number>();
  for (const assignment of recent) {
    recentCounts.set(assignment.sealedIdentityId, (recentCounts.get(assignment.sealedIdentityId) ?? 0) + 1);
  }
  const concentrated = recent.length >= 4 && [...recentCounts.values()].some((count) => count >= 3);
  return {
    totalCycles: assignments.length,
    byPerson: [...counts.entries()].map(([sealedIdentityId, cycles]) => ({ sealedIdentityId, cycles })),
    concentrated
  };
}

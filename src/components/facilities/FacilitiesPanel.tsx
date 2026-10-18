"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { SectionPanel } from "@/components/shared/Panels";

type Room = { id: string; code: string; name: string; building: string | null };
type Issue = {
  id: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  room: Room;
};
type ProblemRoom = Room & {
  _count: { facilitiesIssues: number };
  facilitiesIssues: Issue[];
};

export function FacilitiesPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [problemRooms, setProblemRooms] = useState<ProblemRoom[]>([]);
  const [roomId, setRoomId] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("ROOM_NOT_READY");
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const [roomsRes, issuesRes] = await Promise.all([fetch("/api/rooms"), fetch("/api/facilities/issues")]);
      const roomsBody = await roomsRes.json().catch(() => ({}));
      const issuesBody = await issuesRes.json().catch(() => ({}));
      if (roomsRes.ok) {
        setRooms(roomsBody.data ?? []);
        if (!roomId && roomsBody.data?.[0]?.id) setRoomId(roomsBody.data[0].id);
      }
      if (issuesRes.ok) {
        setIssues(issuesBody.data?.issues ?? []);
        setProblemRooms(issuesBody.data?.problemRooms ?? []);
      }
    });
  }

  useEffect(() => {
    load();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reportIssue() {
    const response = await fetch("/api/facilities/issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomId, category, description, markSessionDelayed: false })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error ?? "Could not report issue");
      return;
    }
    toast.success("Facilities issue logged");
    setDescription("");
    load();
  }

  async function resolveIssue(id: string) {
    const response = await fetch("/api/facilities/issues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: "RESOLVED" })
    });
    if (!response.ok) {
      toast.error("Could not resolve");
      return;
    }
    toast.success("Resolved");
    load();
  }

  return (
    <div className="space-y-5">
      <SectionPanel title="Quick facilities report" description="Log room-not-ready, power/projector, or other facility blockers.">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold">
            Room
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm">
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.code} — {room.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Reason
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm">
              <option value="ROOM_NOT_READY">Room not ready</option>
              <option value="POWER_PROJECTOR">Power / projector</option>
              <option value="UNIVERSITY_EVENT">University event</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-sm font-semibold md:col-span-3">
            Details
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
              placeholder="Projector failed in A101 before 8am lecture"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={pending || !roomId || description.trim().length < 4}
          onClick={() => void reportIssue()}
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Report issue
        </button>
      </SectionPanel>

      <SectionPanel title="Problem rooms" description="Rooms with open facilities issues.">
        {!problemRooms.length ? (
          <p className="text-sm text-muted">No open room problems.</p>
        ) : (
          <ul className="space-y-3">
            {problemRooms.map((room) => (
              <li key={room.id} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="font-semibold text-navy">
                  {room.code} · {room.name}
                </p>
                <p className="text-xs text-muted">{room._count.facilitiesIssues} open issue(s)</p>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>

      <SectionPanel title="Recent issues" description="Open and recently logged facilities reports.">
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="font-semibold text-navy">
                  {issue.room.code}: {issue.category.replaceAll("_", " ")}
                </p>
                <p className="text-sm text-slate-700">{issue.description}</p>
                <p className="text-xs text-muted">
                  {issue.status} · {new Date(issue.createdAt).toLocaleString()}
                </p>
              </div>
              {issue.status === "OPEN" ? (
                <button type="button" onClick={() => void resolveIssue(issue.id)} className="text-sm font-semibold text-primary">
                  Resolve
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </SectionPanel>
    </div>
  );
}

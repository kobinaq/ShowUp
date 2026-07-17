"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Props = {
  courseId: string;
  hasOutline: boolean;
};

export function OutlineUploadForm({ courseId, hasOutline }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [topicsText, setTopicsText] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = topicsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Add at least one topic (one per line)");
      return;
    }

    const topics = lines.map((title, index) => ({
      title,
      weekNumber: index + 1,
      order: index + 1
    }));

    setLoading(true);
    const res = await fetch(`/api/courses/${courseId}/outline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileUrl: String(form.get("fileUrl") || "").trim(),
        fileName: String(form.get("fileName") || "").trim(),
        outlineType: String(form.get("outlineType") || "WEEKLY"),
        topics
      })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not save outline");
      return;
    }
    toast.success(hasOutline ? "Outline updated" : "Outline uploaded");
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-navy">{hasOutline ? "Replace course outline" : "Upload course outline"}</p>
      <p className="text-xs text-muted">Paste a source URL for the PDF/doc and list topics one per line. Week numbers are assigned in order.</p>
      <input name="fileName" required placeholder="File name (e.g. CS301-outline.pdf)" className="h-10 w-full rounded-md border bg-white px-3 text-sm" />
      <input name="fileUrl" required type="url" placeholder="https://… outline file URL" className="h-10 w-full rounded-md border bg-white px-3 text-sm" />
      <select name="outlineType" className="h-10 w-full rounded-md border bg-white px-3 text-sm" defaultValue="WEEKLY">
        <option value="WEEKLY">Weekly topics</option>
        <option value="FLAT">Flat topic list</option>
      </select>
      <textarea
        value={topicsText}
        onChange={(event) => setTopicsText(event.target.value)}
        placeholder={"Introduction to the course\nCore concepts\nMid-semester review"}
        className="min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm"
        required
      />
      <button type="submit" disabled={loading} className="h-10 rounded-md bg-navy px-4 text-sm font-semibold text-white disabled:opacity-60">
        {loading ? "Saving…" : hasOutline ? "Update outline" : "Upload outline"}
      </button>
    </form>
  );
}

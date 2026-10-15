export function shouldSendLecturerDigest(universityEnabled: boolean, lecturerEnabled: boolean, noticeCount: number) {
  return universityEnabled && lecturerEnabled && noticeCount > 0;
}

export function lecturerDigestBody(notices: Array<{ channel: string; status: string; message: string; sentAt: Date }>) {
  const lines = notices.map((notice) => {
    const when = notice.sentAt.toISOString().slice(0, 16).replace("T", " ");
    return `${when} ${notice.channel} ${notice.status}: ${notice.message}`;
  });
  return `ShowUp sent ${notices.length} notice${notices.length === 1 ? "" : "s"} in the last day.\n\n${lines.join("\n")}`;
}

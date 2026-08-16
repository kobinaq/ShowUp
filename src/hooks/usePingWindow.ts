"use client";

import { useEffect, useState } from "react";
import { timeOnSessionDate } from "@/lib/utils/sessionTime";

type PingWindowState = {
  status: "pre-class" | "waiting" | "ping-available" | "class-ended";
  minutesUntilPing: number | null;
  minutesLate: number | null;
  canPing: boolean;
};

export function usePingWindow(classStartTime: string, classEndTime: string, thresholdMinutes: number, lectureDate: Date, pingAlreadySent: boolean) {
  const [state, setState] = useState<PingWindowState>({ status: "pre-class", minutesUntilPing: null, minutesLate: null, canPing: false });

  useEffect(() => {
    function calculate() {
      const now = new Date();
      const classStart = timeOnSessionDate(lectureDate, classStartTime);
      const classEnd = timeOnSessionDate(lectureDate, classEndTime);
      const pingAvailableAt = new Date(classStart.getTime() + thresholdMinutes * 60 * 1000);

      if (now < classStart) return setState({ status: "pre-class", minutesUntilPing: null, minutesLate: null, canPing: false });
      if (now < pingAvailableAt) {
        return setState({ status: "waiting", minutesUntilPing: Math.ceil((pingAvailableAt.getTime() - now.getTime()) / 60000), minutesLate: null, canPing: false });
      }
      if (now <= classEnd) {
        return setState({ status: "ping-available", minutesUntilPing: null, minutesLate: Math.floor((now.getTime() - classStart.getTime()) / 60000), canPing: !pingAlreadySent });
      }
      return setState({ status: "class-ended", minutesUntilPing: null, minutesLate: null, canPing: false });
    }

    calculate();
    const interval = window.setInterval(calculate, 30000);
    return () => window.clearInterval(interval);
  }, [classStartTime, classEndTime, lectureDate, pingAlreadySent, thresholdMinutes]);

  return state;
}

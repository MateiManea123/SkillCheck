import { useEffect, useState } from "react";
import type { SessionDetailsResponse } from "../types/session";

const FINAL_FEEDBACK_PENDING_KEY = "skillcheck.final-feedback.pending-session.v1";
const FINAL_FEEDBACK_READY_KEY = "skillcheck.final-feedback.ready-data.v1";
const FINAL_FEEDBACK_EVENT = "skillcheck-final-feedback-changed";

function notifyFinalFeedbackChange() {
  window.dispatchEvent(new Event(FINAL_FEEDBACK_EVENT));
}

export function getPendingFinalFeedbackSessionId(): number | null {
  const raw = localStorage.getItem(FINAL_FEEDBACK_PENDING_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function setPendingFinalFeedbackSessionId(sessionId: number) {
  localStorage.setItem(FINAL_FEEDBACK_PENDING_KEY, String(sessionId));
  notifyFinalFeedbackChange();
}

export function clearPendingFinalFeedbackSessionId() {
  localStorage.removeItem(FINAL_FEEDBACK_PENDING_KEY);
  notifyFinalFeedbackChange();
}

export function getReadyFinalFeedbackData(): SessionDetailsResponse | null {
  try {
    const raw = localStorage.getItem(FINAL_FEEDBACK_READY_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionDetailsResponse;
  } catch {
    return null;
  }
}

export function setReadyFinalFeedbackData(data: SessionDetailsResponse) {
  localStorage.setItem(FINAL_FEEDBACK_READY_KEY, JSON.stringify(data));
  notifyFinalFeedbackChange();
}

export function clearReadyFinalFeedbackData() {
  localStorage.removeItem(FINAL_FEEDBACK_READY_KEY);
  notifyFinalFeedbackChange();
}

export function clearAllFinalFeedbackState() {
  localStorage.removeItem(FINAL_FEEDBACK_PENDING_KEY);
  localStorage.removeItem(FINAL_FEEDBACK_READY_KEY);
  notifyFinalFeedbackChange();
}

export function usePendingFinalFeedbackSessionId() {
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(() => getPendingFinalFeedbackSessionId());

  useEffect(() => {
    const sync = () => setPendingSessionId(getPendingFinalFeedbackSessionId());
    const onStorage = (event: StorageEvent) => {
      if (event.key === FINAL_FEEDBACK_PENDING_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(FINAL_FEEDBACK_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FINAL_FEEDBACK_EVENT, sync);
    };
  }, []);

  return pendingSessionId;
}

export function useReadyFinalFeedbackData() {
  const [readyData, setReadyData] = useState<SessionDetailsResponse | null>(() => getReadyFinalFeedbackData());

  useEffect(() => {
    const sync = () => setReadyData(getReadyFinalFeedbackData());
    const onStorage = (event: StorageEvent) => {
      if (event.key === FINAL_FEEDBACK_READY_KEY) {
        sync();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(FINAL_FEEDBACK_EVENT, sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(FINAL_FEEDBACK_EVENT, sync);
    };
  }, []);

  return readyData;
}

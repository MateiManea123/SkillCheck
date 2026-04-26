import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionFlow } from "../hooks/useSessionFlow";
import type { InterviewType, LevelType, RoleType, StartSessionPayload } from "../types/session";
import { usePendingFinalFeedbackSessionId } from "../utils/finalFeedbackTask";

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR"];
const ROLES: RoleType[] = ["FRONTEND", "BACKEND"];
const LEVELS: LevelType[] = ["JUNIOR", "MID", "SENIOR"];
type FeedbackMode = "PER_QUESTION" | "FINAL_ONLY";
const FEEDBACK_MODE_KEY = "skillcheck.feedback.mode.v1";
const CHAT_HISTORY_KEY = "skillcheck.chat.history.v1";

export function InterviewSetup() {
  const navigate = useNavigate();
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [role, setRole] = useState<RoleType>("FRONTEND");
  const [level, setLevel] = useState<LevelType>("JUNIOR");
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(() => {
    const stored = localStorage.getItem(FEEDBACK_MODE_KEY);
    return stored === "FINAL_ONLY" ? "FINAL_ONLY" : "PER_QUESTION";
  });

  const { sessionId, sessionFinished, loading, errors, actions } = useSessionFlow();
  const pendingFinalFeedbackSessionId = usePendingFinalFeedbackSessionId();

  useEffect(() => {
    if (sessionId && !sessionFinished) {
      navigate("/interview/session");
    }
  }, [navigate, sessionFinished, sessionId]);

  const handleStart = () => {
    localStorage.setItem(FEEDBACK_MODE_KEY, feedbackMode);
    localStorage.removeItem(CHAT_HISTORY_KEY);

    const payload: StartSessionPayload =
      interviewType === "HR"
        ? { interview_type: interviewType }
        : { interview_type: interviewType, role, level };

    if (pendingFinalFeedbackSessionId) return;
    actions.startSession(payload);
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-indigo-100/60 backdrop-blur-xl">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-8 text-white sm:px-8">
          <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
            Interview setup
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Configure your interview session</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
            Start here, then move to a dedicated chat workspace where you answer in a real interviewer flow.
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interview type</p>
            <div className="mt-3 grid gap-2">
              {INTERVIEW_TYPES.map((item) => {
                const selected = interviewType === item;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={loading}
                    onClick={() => setInterviewType(item)}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                      selected
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</p>
            <select
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none ring-indigo-400/70 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleType)}
              disabled={loading || interviewType === "HR"}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Only used for technical interviews.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seniority</p>
            <select
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none ring-indigo-400/70 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
              value={level}
              onChange={(e) => setLevel(e.target.value as LevelType)}
              disabled={loading || interviewType === "HR"}
            >
              {LEVELS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Used to adapt question depth and evaluator strictness.</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Feedback style</p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setFeedbackMode("PER_QUESTION")}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                  feedbackMode === "PER_QUESTION"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Show after each question
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setFeedbackMode("FINAL_ONLY")}
                className={`rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition ${
                  feedbackMode === "FINAL_ONLY"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Hide during chat (still generated)
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Both modes keep per-question evaluation on the backend; this only changes chat visibility.</p>
          </article>
        </div>

        <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={handleStart}
            disabled={loading || !!pendingFinalFeedbackSessionId}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {pendingFinalFeedbackSessionId ? "Final feedback in progress..." : loading ? "Starting session..." : "Continue to interview chat"}
          </button>
          {pendingFinalFeedbackSessionId && (
            <p className="mt-2 text-xs text-amber-700">
              Final feedback is generating for session #{pendingFinalFeedbackSessionId}. Starting a new interview is temporarily locked.
            </p>
          )}
          {sessionId && !sessionFinished && (
            <p className="mt-2 text-xs text-slate-600">Existing active session detected. Redirecting to chat...</p>
          )}
          {errors.start && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              Could not start the session.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

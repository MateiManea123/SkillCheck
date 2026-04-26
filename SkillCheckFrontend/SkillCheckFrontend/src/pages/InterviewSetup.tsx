import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionFlow } from "../hooks/useSessionFlow";
import { useTheme } from "../hooks/useTheme";
import type { InterviewType, LevelType, RoleType, StartSessionPayload } from "../types/session";
import { usePendingFinalFeedbackSessionId } from "../utils/finalFeedbackTask";

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR"];
const ROLES: RoleType[] = ["FRONTEND", "BACKEND"];
const LEVELS: LevelType[] = ["JUNIOR", "MID", "SENIOR"];
type FeedbackMode = "PER_QUESTION" | "FINAL_ONLY";
const FEEDBACK_MODE_KEY = "skillcheck.feedback.mode.v1";
const CHAT_HISTORY_KEY = "skillcheck.chat.history.v1";

const interviewDescriptions: Record<InterviewType, string> = {
  TECHNICAL: "Role-based technical questions.",
  HR: "Behavioral and communication practice.",
};

export function InterviewSetup() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
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

  const optionClass = (selected: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm transition ${
      selected
        ? isDark
          ? "border-emerald-300/30 bg-emerald-400/10 text-white"
          : "border-slate-900 bg-slate-900 text-white"
        : isDark
          ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    }`;

  const panelClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm shadow-slate-900/5";

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl border p-6 sm:p-8 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
              Session setup
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Choose your interview settings.</h1>
            <p className={`mt-4 text-base leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Set the interview type, level, and feedback style, then continue to the live session.
            </p>
          </div>

          <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Summary
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Interview</span>
                <span className="font-semibold">{interviewType}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Role</span>
                <span className="font-semibold">{interviewType === "HR" ? "Not required" : role}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Level</span>
                <span className="font-semibold">{interviewType === "HR" ? "Not required" : level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className={`rounded-2xl border p-5 ${panelClass}`}>
            <h2 className="text-xl font-black tracking-[-0.04em]">Interview type</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {INTERVIEW_TYPES.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={loading}
                  onClick={() => setInterviewType(item)}
                  className={optionClass(interviewType === item)}
                >
                  <p className="font-semibold">{item}</p>
                  <p className={`mt-1 text-xs leading-6 ${interviewType === item ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {interviewDescriptions[item]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${panelClass}`}>
            <h2 className="text-xl font-black tracking-[-0.04em]">Technical configuration</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Role</span>
                <select
                  className={`rounded-xl border px-3 py-3 outline-none ${
                    isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-700"
                  }`}
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
              </label>

              <label className="grid gap-2 text-sm">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Seniority</span>
                <select
                  className={`rounded-xl border px-3 py-3 outline-none ${
                    isDark ? "border-white/10 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-700"
                  }`}
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
              </label>
            </div>
          </div>

          <div className={`rounded-2xl border p-5 ${panelClass}`}>
            <h2 className="text-xl font-black tracking-[-0.04em]">Feedback style</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setFeedbackMode("PER_QUESTION")}
                className={optionClass(feedbackMode === "PER_QUESTION")}
              >
                <p className="font-semibold">Show during session</p>
                <p className={`mt-1 text-xs leading-6 ${feedbackMode === "PER_QUESTION" ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                  See feedback after each answer.
                </p>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setFeedbackMode("FINAL_ONLY")}
                className={optionClass(feedbackMode === "FINAL_ONLY")}
              >
                <p className="font-semibold">Show only at the end</p>
                <p className={`mt-1 text-xs leading-6 ${feedbackMode === "FINAL_ONLY" ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Keep the session focused and review everything later.
                </p>
              </button>
            </div>
          </div>
        </div>

        <aside className={`rounded-2xl border p-5 h-fit ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
          <h2 className="text-xl font-black tracking-[-0.04em]">Ready to start?</h2>
          <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Your answers will be evaluated using the selected interview settings.
          </p>

          <button
            type="button"
            onClick={handleStart}
            disabled={loading || !!pendingFinalFeedbackSessionId}
            className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {pendingFinalFeedbackSessionId
              ? "Final feedback in progress..."
              : loading
                ? "Starting session..."
                : "Continue to interview"}
          </button>

          {pendingFinalFeedbackSessionId && (
            <p className={`mt-4 text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
              Final feedback is still being generated for the previous session.
            </p>
          )}
          {sessionId && !sessionFinished && (
            <p className={`mt-4 text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Existing active session detected. Redirecting now.
            </p>
          )}
          {errors.start && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Could not start the session.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

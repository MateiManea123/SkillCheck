import { useState } from "react";
import type { InterviewType, LevelType, RoleType, StartSessionPayload } from "../types/session";

interface SessionControlsProps {
  loading: boolean;
  onStart: (payload: StartSessionPayload) => void;
  onEnd: () => void;
  sessionId: number | null;
  disabled?: boolean;
}

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR"];
const ROLES: RoleType[] = ["FRONTEND", "BACKEND"];
const LEVELS: LevelType[] = ["JUNIOR", "MID", "SENIOR"];

export function SessionControls({ loading, onStart, onEnd, sessionId, disabled = false }: SessionControlsProps) {
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [role, setRole] = useState<RoleType>("FRONTEND");
  const [level, setLevel] = useState<LevelType>("JUNIOR");

  const handleStart = () => {
    if (interviewType === "HR") {
      onStart({ interview_type: interviewType });
      return;
    }

    onStart({
      interview_type: interviewType,
      role,
      level,
    });
  };

  const isTechnical = interviewType === "TECHNICAL";

  return (
    <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-xl shadow-sky-100/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Session Settings</h2>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Step 1: Configure
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">Choose interview type and difficulty before you start.</p>

      <div className="mt-5 grid gap-5">
        <div className="grid gap-2">
          <label className="text-sm font-semibold tracking-wide text-slate-600" htmlFor="interviewType">
            Interview type
          </label>
          <div
            id="interviewType"
            className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1"
            aria-label="Interview type"
          >
            {INTERVIEW_TYPES.map((item) => {
              const selected = interviewType === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInterviewType(item)}
                  disabled={disabled || loading}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold tracking-wide transition ${
                    selected
                      ? "bg-white text-sky-700 shadow-sm ring-1 ring-sky-200"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {isTechnical && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-semibold tracking-wide text-slate-600" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none ring-sky-400/70 transition focus:ring-2"
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleType)}
                  disabled={disabled || loading}
                >
                  {ROLES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold tracking-wide text-slate-600" htmlFor="level">
                  Level
                </label>
                <select
                  id="level"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none ring-sky-400/70 transition focus:ring-2"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as LevelType)}
                  disabled={disabled || loading}
                >
                  {LEVELS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleStart}
          disabled={loading || disabled}
        >
          {loading && !sessionId ? "Starting..." : "Start Session"}
        </button>

        {!!sessionId && (
          <button
            type="button"
            onClick={onEnd}
            disabled={loading}
            className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ending..." : "End Session"}
          </button>
        )}
      </div>

      {sessionId && (
        <p className="mt-3 text-sm text-slate-600">
          <b>Session ID:</b> #{sessionId}
        </p>
      )}

      {!!sessionId && !disabled && (
        <p className="mt-1 text-xs text-slate-500">Active session is ready.</p>
      )}

      {!!sessionId && disabled && (
        <p className="mt-1 text-xs text-slate-500">An active session is in progress. Continue answering questions below.</p>
      )}
    </section>
  );
}

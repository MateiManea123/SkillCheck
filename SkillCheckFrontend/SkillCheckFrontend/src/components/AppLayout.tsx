import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSessionData } from "../api/sessionsApi";
import {
  clearPendingFinalFeedbackSessionId,
  clearReadyFinalFeedbackData,
  setReadyFinalFeedbackData,
  usePendingFinalFeedbackSessionId,
  useReadyFinalFeedbackData,
} from "../utils/finalFeedbackTask";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/interview", label: "Interview" },
  { to: "/about", label: "About" },
];

export function AppLayout() {
  const pendingFinalFeedbackSessionId = usePendingFinalFeedbackSessionId();
  const readyFinalFeedback = useReadyFinalFeedbackData();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const finalFeedbackQuery = useQuery({
    queryKey: ["pendingFinalFeedback", pendingFinalFeedbackSessionId],
    enabled: !!pendingFinalFeedbackSessionId,
    queryFn: () => getSessionData(pendingFinalFeedbackSessionId as number),
    refetchOnWindowFocus: false,
    retry: 2,
  });

  useEffect(() => {
    if (pendingFinalFeedbackSessionId && finalFeedbackQuery.data?.ai_feedback) {
      setReadyFinalFeedbackData(finalFeedbackQuery.data);
      clearPendingFinalFeedbackSessionId();
    }
  }, [finalFeedbackQuery.data, pendingFinalFeedbackSessionId]);

  const closeReadyPopup = () => {
    clearReadyFinalFeedbackData();
    setShowFeedbackModal(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-50 via-indigo-50/50 to-emerald-50/60 text-slate-900">
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full bg-sky-300/45 animate-glow" />
      <div className="pointer-events-none absolute right-[-90px] top-[-20px] h-80 w-80 rounded-full bg-violet-300/40 animate-glow" />
      <div className="pointer-events-none absolute bottom-[-60px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/35 animate-glow" />

      <header className="relative z-10 border-b border-white/70 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <NavLink to="/" className="text-xl font-extrabold tracking-tight text-sky-700 transition hover:text-sky-600">
            SkillCheck
          </NavLink>

          <nav className="flex items-center gap-2 rounded-2xl border border-sky-200/80 bg-white/80 p-1.5 shadow-sm shadow-sky-100">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-200"
                      : "text-slate-600 hover:bg-sky-100 hover:text-sky-700"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {pendingFinalFeedbackSessionId && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-indigo-100 bg-white/95 p-4 shadow-xl shadow-indigo-100 backdrop-blur">
          <p className="text-sm font-semibold text-slate-800">Generating final feedback for latest session</p>
          <p className="mt-1 text-xs text-slate-600">Session #{pendingFinalFeedbackSessionId}. You can browse the app meanwhile.</p>
          <p className="mt-2 text-xs text-amber-700">Starting a new interview is temporarily locked until this finishes.</p>
          {finalFeedbackQuery.isError && (
            <button
              type="button"
              onClick={() => finalFeedbackQuery.refetch()}
              className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Retry now
            </button>
          )}
        </div>
      )}

      {readyFinalFeedback?.ai_feedback && (
        <button
          type="button"
          onClick={() => setShowFeedbackModal(true)}
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-left shadow-xl shadow-emerald-100 backdrop-blur transition hover:-translate-y-0.5"
        >
          <p className="text-sm font-bold text-emerald-800">Final Feedback generated!</p>
          <p className="mt-1 text-xs text-emerald-700">Session #{readyFinalFeedback.session_id}. Click to view.</p>
        </button>
      )}

      {showFeedbackModal && readyFinalFeedback?.ai_feedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/80 bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Final Feedback</h2>
                <p className="mt-1 text-sm text-slate-600">Session #{readyFinalFeedback.session_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700">Final score</h3>
                <p className="mt-1 text-3xl font-black text-slate-900">{readyFinalFeedback.ai_feedback.overall_score}</p>
                <p className="mt-2 text-sm text-slate-600">{readyFinalFeedback.ai_feedback.summary}</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                  {readyFinalFeedback.ai_feedback.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700">Improvements</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
                  {readyFinalFeedback.ai_feedback.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keep for later
              </button>
              <button
                type="button"
                onClick={closeReadyPopup}
                className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Mark as seen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

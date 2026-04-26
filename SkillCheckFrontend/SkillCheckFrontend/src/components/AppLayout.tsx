import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getSessionData, getSessionHistory } from "../api/sessionsApi";
import { useAuth } from "../hooks/AuthProvider";
import { useTheme } from "../hooks/useTheme";
import {
  clearPendingFinalFeedbackSessionId,
  clearReadyFinalFeedbackData,
  setReadyFinalFeedbackData,
  usePendingFinalFeedbackSessionId,
  useReadyFinalFeedbackData,
} from "../utils/finalFeedbackTask";
import type { SessionHistoryItem } from "../types/session";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/interview", label: "Practice" },
  { to: "/about", label: "About" },
];

export function AppLayout() {
  const pendingFinalFeedbackSessionId = usePendingFinalFeedbackSessionId();
  const readyFinalFeedback = useReadyFinalFeedbackData();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<number | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();

  const finalFeedbackQuery = useQuery({
    queryKey: ["pendingFinalFeedback", pendingFinalFeedbackSessionId],
    enabled: !!pendingFinalFeedbackSessionId,
    queryFn: () => getSessionData(pendingFinalFeedbackSessionId as number),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => (query.state.data?.ai_feedback ? false : 2500),
    retry: 2,
  });

  const historyQuery = useQuery({
    queryKey: ["sessionHistory"],
    enabled: isAuthenticated && showProfileMenu,
    queryFn: getSessionHistory,
    refetchOnWindowFocus: false,
  });

  const selectedSessionQuery = useQuery({
    queryKey: ["sessionHistoryDetail", selectedHistorySessionId],
    enabled: !!selectedHistorySessionId,
    queryFn: () => getSessionData(selectedHistorySessionId as number),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (pendingFinalFeedbackSessionId && finalFeedbackQuery.data?.ai_feedback) {
      setReadyFinalFeedbackData(finalFeedbackQuery.data);
      clearPendingFinalFeedbackSessionId();
    }
  }, [finalFeedbackQuery.data, pendingFinalFeedbackSessionId]);

  useEffect(() => {
    if (readyFinalFeedback?.ai_feedback) {
      setShowFeedbackModal(true);
    }
  }, [readyFinalFeedback]);

  const closeReadyPopup = () => {
    clearReadyFinalFeedbackData();
    setShowFeedbackModal(false);
  };

  const closeHistoryModal = () => {
    setSelectedHistorySessionId(null);
  };

  const displayName = useMemo(() => {
    const firstName = user?.first_name?.trim();
    if (firstName) return firstName;
    const username = user?.username?.trim();
    if (username) return username;
    if (user?.email) return user.email.split("@")[0];
    return "Profile";
  }, [user]);

  const selectedHistorySession = selectedSessionQuery.data;

  const sessionLabel = (session: SessionHistoryItem) => {
    const parts: string[] = [session.interview_type];
    if (session.role) parts.push(session.role);
    if (session.level) parts.push(session.level);
    return parts.join(" • ");
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-950"}`}>
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]"
            : "bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]"
        }`}
      />

      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          isDark ? "border-white/10 bg-slate-950/75" : "border-slate-200/80 bg-white/80"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black ${
                isDark ? "border-white/10 bg-white/5 text-emerald-200" : "border-slate-200 bg-white text-emerald-700"
              }`}
            >
              SC
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Interview practice
              </p>
              <p className="text-lg font-black tracking-[-0.05em]">SkillCheck</p>
            </div>
          </NavLink>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <nav
              className={`flex flex-wrap items-center gap-1 rounded-2xl border p-1 ${
                isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              }`}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? isDark
                          ? "bg-emerald-400 text-slate-950"
                          : "bg-slate-900 text-white"
                        : isDark
                          ? "text-slate-300 hover:bg-white/8 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {isAuthenticated ? (
              <div className="relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {displayName}
                </button>

                {showProfileMenu && (
                  <div
                    className={`absolute right-0 top-14 z-40 w-[360px] rounded-2xl border p-4 shadow-2xl ${
                      isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                          Your sessions
                        </p>
                        <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>{user?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={logout}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          isDark
                            ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Logout
                      </button>
                    </div>

                    <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
                      {historyQuery.isLoading && (
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Loading sessions...</p>
                      )}

                      {!historyQuery.isLoading && !historyQuery.data?.length && (
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>No previous sessions yet.</p>
                      )}

                      {historyQuery.data?.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => {
                            setSelectedHistorySessionId(session.id);
                            setShowProfileMenu(false);
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            isDark
                              ? "border-white/10 bg-white/5 hover:bg-white/10"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">Session #{session.id}</p>
                              <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                {sessionLabel(session)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{session.final_overall_score ?? "-"}</p>
                              <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{session.status}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <NavLink
                  to="/login"
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Get started
                </NavLink>
              </div>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:py-10">
        <Outlet />
      </main>

      {pendingFinalFeedbackSessionId && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${
            isDark ? "border-white/10 bg-slate-950/90 shadow-black/30" : "border-slate-200 bg-white/95 shadow-slate-900/10"
          }`}
        >
          <p className="text-sm font-bold">Preparing final feedback</p>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Session #{pendingFinalFeedbackSessionId} is being processed. You can keep browsing in the meantime.
          </p>
          <p className={`mt-3 text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}>
            Starting a new interview is temporarily locked.
          </p>
          {finalFeedbackQuery.isError && (
            <button
              type="button"
              onClick={() => finalFeedbackQuery.refetch()}
              className={`mt-4 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                isDark
                  ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
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
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border p-5 text-left shadow-2xl backdrop-blur-xl transition hover:-translate-y-0.5 ${
            isDark
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-emerald-950/20"
              : "border-emerald-200 bg-white text-slate-900 shadow-slate-900/10"
          }`}
        >
          <p className="text-sm font-bold">Final feedback is ready</p>
          <p className={`mt-1 text-xs ${isDark ? "text-emerald-100/80" : "text-slate-600"}`}>
            Session #{readyFinalFeedback.session_id}. Open report.
          </p>
        </button>
      )}

      {showFeedbackModal && readyFinalFeedback?.ai_feedback && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${isDark ? "bg-slate-950/80" : "bg-slate-950/40"}`}>
          <div
            className={`w-full max-w-4xl rounded-3xl border p-6 shadow-2xl sm:p-8 ${
              isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                  Session report
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">Final feedback</h2>
                <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Session #{readyFinalFeedback.session_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1fr_1fr]">
              <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                  Score
                </p>
                <p className="mt-3 text-5xl font-black tracking-[-0.06em]">{readyFinalFeedback.ai_feedback.overall_score}</p>
                <p className={`mt-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {readyFinalFeedback.ai_feedback.summary}
                </p>
              </div>

              <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Strengths
                </p>
                <ul className={`mt-4 space-y-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {readyFinalFeedback.ai_feedback.strengths.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isDark ? "bg-emerald-300" : "bg-emerald-500"}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Improve next
                </p>
                <ul className={`mt-4 space-y-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                  {readyFinalFeedback.ai_feedback.improvements.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isDark ? "bg-slate-300" : "bg-slate-500"}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFeedbackModal(false)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Later
              </button>
              <button
                type="button"
                onClick={closeReadyPopup}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                Mark as seen
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedHistorySessionId && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${isDark ? "bg-slate-950/80" : "bg-slate-950/40"}`}>
          <div
            className={`w-full max-w-5xl rounded-3xl border p-6 shadow-2xl sm:p-8 ${
              isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                  Session history
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">Session #{selectedHistorySessionId}</h2>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Close
              </button>
            </div>

            {selectedSessionQuery.isLoading && (
              <p className={`mt-6 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Loading transcript...</p>
            )}

            {selectedHistorySession && (
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Transcript
                  </p>
                  <div className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto">
                    {selectedHistorySession.questions.map((item, index) => (
                      <div key={`${selectedHistorySession.session_id}-${index}`} className="space-y-2 rounded-xl border border-inherit p-4">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Interviewer
                          </p>
                          <p className="mt-1 text-sm leading-7">{item.question_text}</p>
                        </div>
                        {item.answer_text && (
                          <div>
                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                              Candidate
                            </p>
                            <p className={`mt-1 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                              {item.answer_text}
                            </p>
                          </div>
                        )}
                        {item.ai_feedback && (
                          <div className={`rounded-lg px-3 py-2 text-sm ${isDark ? "bg-slate-950/80 text-slate-300" : "bg-white text-slate-600"}`}>
                            <span className="font-semibold">Feedback:</span> {item.ai_feedback}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                      Final summary
                    </p>
                    {selectedHistorySession.ai_feedback ? (
                      <>
                        <p className="mt-3 text-5xl font-black tracking-[-0.06em]">
                          {selectedHistorySession.ai_feedback.overall_score}
                        </p>
                        <p className={`mt-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {selectedHistorySession.ai_feedback.summary}
                        </p>
                      </>
                    ) : (
                      <p className={`mt-3 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>Final summary is not available yet.</p>
                    )}
                  </div>

                  {selectedHistorySession.ai_feedback && (
                    <>
                      <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          Strengths
                        </p>
                        <ul className={`mt-4 space-y-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {selectedHistorySession.ai_feedback.strengths.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isDark ? "bg-emerald-300" : "bg-emerald-500"}`} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className={`rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          Improve next
                        </p>
                        <ul className={`mt-4 space-y-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {selectedHistorySession.ai_feedback.improvements.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isDark ? "bg-slate-300" : "bg-slate-500"}`} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

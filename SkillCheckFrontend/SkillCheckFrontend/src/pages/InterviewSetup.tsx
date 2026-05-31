import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionFlow } from "../hooks/useSessionFlow";
import { useTheme } from "../hooks/useTheme";
import type {
  InterviewType,
  LevelType,
  QuestionType,
  RoleType,
  StartSessionPayload,
  TechnologyType,
} from "../types/session";
import { usePendingFinalFeedbackSessionId } from "../utils/finalFeedbackTask";

const INTERVIEW_TYPES: InterviewType[] = ["TECHNICAL", "HR"];
const TRACKS: RoleType[] = ["FRONTEND", "BACKEND", "FULLSTACK"];
const LEVELS: LevelType[] = ["JUNIOR", "MID", "SENIOR"];
const DEFAULT_QUESTION_TYPES: QuestionType[] = [
  "CONCEPTUAL",
  "PRACTICAL",
  "DEBUGGING",
  "ARCHITECTURE",
  "PERFORMANCE",
  "SECURITY",
  "TRADE_OFF",
];

const TRACK_TECHNOLOGIES: Record<RoleType, TechnologyType[]> = {
  FRONTEND: ["HTML", "CSS", "JAVASCRIPT", "TYPESCRIPT", "REACT", "PERFORMANCE", "ACCESSIBILITY"],
  BACKEND: ["PYTHON", "DJANGO", "REST_API", "SQL", "AUTHENTICATION", "SECURITY", "TESTING"],
  FULLSTACK: [
    "HTML",
    "CSS",
    "JAVASCRIPT",
    "TYPESCRIPT",
    "REACT",
    "PERFORMANCE",
    "ACCESSIBILITY",
    "PYTHON",
    "DJANGO",
    "REST_API",
    "SQL",
    "AUTHENTICATION",
    "SECURITY",
    "TESTING",
  ],
};

type FeedbackMode = "PER_QUESTION" | "FINAL_ONLY";
const FEEDBACK_MODE_KEY = "skillcheck.feedback.mode.v1";
const CHAT_HISTORY_KEY = "skillcheck.chat.history.v1";

const interviewDescriptions: Record<InterviewType, string> = {
  TECHNICAL: "Technical interview based on track, difficulty and selected technologies.",
  HR: "Behavioral and communication practice.",
};

const trackDescriptions: Record<RoleType, string> = {
  FRONTEND: "UI, browser behavior, performance and accessibility.",
  BACKEND: "APIs, data, security, auth and testing.",
  FULLSTACK: "A broader mix of frontend and backend topics.",
};

const levelDescriptions: Record<LevelType, string> = {
  JUNIOR: "Core concepts, clean fundamentals and straightforward implementation.",
  MID: "Practical depth, debugging ability and stronger decision-making.",
  SENIOR: "Architecture, trade-offs and advanced problem solving.",
};

const questionTypeDescriptions: Record<QuestionType, string> = {
  CONCEPTUAL: "Theory, principles and core understanding.",
  PRACTICAL: "Hands-on implementation and real coding scenarios.",
  DEBUGGING: "Issue investigation and problem isolation.",
  ARCHITECTURE: "System design and technical structure decisions.",
  PERFORMANCE: "Optimization, bottlenecks and efficiency.",
  SECURITY: "Common risks, safe patterns and protection.",
  TRADE_OFF: "Decision-making between multiple valid approaches.",
};

const prettyTechnologyLabel: Record<TechnologyType, string> = {
  HTML: "HTML",
  CSS: "CSS",
  JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
  REACT: "React",
  PYTHON: "Python",
  DJANGO: "Django",
  REST_API: "REST API",
  SQL: "SQL",
  AUTHENTICATION: "Authentication",
  SECURITY: "Security",
  TESTING: "Testing",
  PERFORMANCE: "Performance",
  ACCESSIBILITY: "Accessibility",
};

export function InterviewSetup() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [role, setRole] = useState<RoleType>("FRONTEND");
  const [level, setLevel] = useState<LevelType>("JUNIOR");
  const [selectedTechnologies, setSelectedTechnologies] = useState<TechnologyType[]>(() => TRACK_TECHNOLOGIES.FRONTEND.slice(0, 2));
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<QuestionType[]>(DEFAULT_QUESTION_TYPES);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>(() => {
    const stored = localStorage.getItem(FEEDBACK_MODE_KEY);
    return stored === "FINAL_ONLY" ? "FINAL_ONLY" : "PER_QUESTION";
  });

  const { sessionId, sessionFinished, loading, errors, actions } = useSessionFlow();
  const pendingFinalFeedbackSessionId = usePendingFinalFeedbackSessionId();

  const availableTechnologies = useMemo(() => TRACK_TECHNOLOGIES[role], [role]);

  useEffect(() => {
    if (sessionId && !sessionFinished) {
      navigate("/interview/session");
    }
  }, [navigate, sessionFinished, sessionId]);

  useEffect(() => {
    setSelectedTechnologies((prev) => {
      const filtered = prev.filter((item) => availableTechnologies.includes(item));
      if (filtered.length > 0) return filtered;
      return availableTechnologies.slice(0, Math.min(2, availableTechnologies.length));
    });
  }, [availableTechnologies]);

  const handleStart = () => {
    localStorage.setItem(FEEDBACK_MODE_KEY, feedbackMode);
    localStorage.removeItem(CHAT_HISTORY_KEY);

    const payload: StartSessionPayload =
      interviewType === "HR"
        ? { interview_type: interviewType }
        : {
            interview_type: interviewType,
            role,
            level,
            selected_technologies: selectedTechnologies,
            question_types: selectedQuestionTypes,
          };

    if (pendingFinalFeedbackSessionId) return;
    actions.startSession(payload);
  };

  const toggleTechnology = (technology: TechnologyType) => {
    setSelectedTechnologies((prev) =>
      prev.includes(technology) ? prev.filter((item) => item !== technology) : [...prev, technology],
    );
  };

  const toggleQuestionType = (questionType: QuestionType) => {
    setSelectedQuestionTypes((prev) =>
      prev.includes(questionType) ? prev.filter((item) => item !== questionType) : [...prev, questionType],
    );
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

  const chipClass = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-semibold transition ${
      selected
        ? isDark
          ? "border-emerald-300/40 bg-emerald-400 text-slate-950"
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
              For technical interviews, choose the track, difficulty and the technologies you want to be assessed on.
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
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Track</span>
                <span className="font-semibold">{interviewType === "HR" ? "Not required" : role}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Difficulty</span>
                <span className="font-semibold">{interviewType === "HR" ? "Not required" : level}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Technologies</span>
                <span className="font-semibold">
                  {interviewType === "HR" ? "Not required" : selectedTechnologies.length}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Question types</span>
                <span className="font-semibold">
                  {interviewType === "HR" ? "Not required" : selectedQuestionTypes.length}
                </span>
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

          {interviewType === "TECHNICAL" && (
            <>
              <div className={`rounded-2xl border p-5 ${panelClass}`}>
                <h2 className="text-xl font-black tracking-[-0.04em]">Technical configuration</h2>
                <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-2 text-sm">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Track</span>
                    <div className="grid gap-3">
                      {TRACKS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          disabled={loading}
                          onClick={() => setRole(item)}
                          className={optionClass(role === item)}
                        >
                          <p className="font-semibold">{item}</p>
                          <p className={`mt-1 text-xs leading-6 ${role === item ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {trackDescriptions[item]}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Difficulty</span>
                    <div className="grid gap-3">
                      {LEVELS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          disabled={loading}
                          onClick={() => setLevel(item)}
                          className={optionClass(level === item)}
                        >
                          <p className="font-semibold">{item}</p>
                          <p className={`mt-1 text-xs leading-6 ${level === item ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"}`}>
                            {levelDescriptions[item]}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-5 ${panelClass}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-black tracking-[-0.04em]">Technologies</h2>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Select one or more technologies for the chosen track.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {availableTechnologies.map((technology) => {
                    const selected = selectedTechnologies.includes(technology);
                    return (
                      <button
                        key={technology}
                        type="button"
                        disabled={loading}
                        onClick={() => toggleTechnology(technology)}
                        className={chipClass(selected)}
                      >
                        {prettyTechnologyLabel[technology]}
                      </button>
                    );
                  })}
                </div>
                {selectedTechnologies.length === 0 && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Select at least one technology to start a technical interview.
                  </p>
                )}
              </div>

              <div className={`rounded-2xl border p-5 ${panelClass}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xl font-black tracking-[-0.04em]">Question types</h2>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Choose one or more directions for the technical interview.
                  </p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {DEFAULT_QUESTION_TYPES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      disabled={loading}
                      onClick={() => toggleQuestionType(item)}
                      className={optionClass(selectedQuestionTypes.includes(item))}
                    >
                      <p className="font-semibold">{item.replaceAll("_", " ")}</p>
                      <p
                        className={`mt-1 text-xs leading-6 ${
                          selectedQuestionTypes.includes(item) ? "text-inherit/80" : isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {questionTypeDescriptions[item]}
                      </p>
                    </button>
                  ))}
                </div>
                {selectedQuestionTypes.length === 0 && (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Select at least one question type to start a technical interview.
                  </p>
                )}
              </div>
            </>
          )}

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
            disabled={
              loading ||
              !!pendingFinalFeedbackSessionId ||
              (interviewType === "TECHNICAL" && (selectedTechnologies.length === 0 || selectedQuestionTypes.length === 0))
            }
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

          {interviewType === "TECHNICAL" && (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
              <p className="font-semibold">Technical session</p>
              <p className="mt-2">Track: {role}</p>
              <p className="mt-1">Difficulty: {level}</p>
              <p className="mt-1">Technologies: {selectedTechnologies.map((item) => prettyTechnologyLabel[item]).join(", ") || "None selected"}</p>
              <p className="mt-1">Question types: {selectedQuestionTypes.map((item) => item.replaceAll("_", " ")).join(", ") || "None selected"}</p>
            </div>
          )}

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

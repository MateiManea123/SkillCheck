import { Link } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";
import { useTheme } from "../hooks/useTheme";

const benefits = [
  {
    title: "Real interview flow",
    text: "Practice in a live question-and-answer format, not in a static questionnaire.",
  },
  {
    title: "Technical and HR sessions",
    text: "Switch between role-based technical interviews and behavioral practice.",
  },
  {
    title: "Clear final feedback",
    text: "Finish each session with a score, strengths, and concrete improvement points.",
  },
];

export function Home() {
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <section className="space-y-6">
      <div
        className={`overflow-hidden rounded-3xl border ${
          isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-xl shadow-slate-900/5"
        }`}
      >
        <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_380px] lg:px-10 lg:py-10">
          <div className="max-w-3xl">
            <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
              AI interview practice
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
              Prepare for interviews with realistic sessions and useful feedback.
            </h1>
            <p className={`mt-4 max-w-2xl text-base leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              SkillCheck helps candidates practice technical and HR interviews in a focused chat experience, then learn
              from structured feedback at the end.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? "/interview" : "/register"}
                className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                  isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isAuthenticated ? "Start practice" : "Create account"}
              </Link>
              <Link
                to="/about"
                className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                  isDark
                    ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Learn more
              </Link>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              What you get
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between border-b border-inherit pb-3">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Interview types</span>
                <span className="font-semibold">Technical, HR</span>
              </div>
              <div className="flex items-center justify-between border-b border-inherit pb-3">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Modes</span>
                <span className="font-semibold">Live chat, voice input</span>
              </div>
              <div className="flex items-center justify-between pb-1">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Outcome</span>
                <span className="font-semibold">Score + feedback</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {benefits.map((item) => (
          <article
            key={item.title}
            className={`rounded-2xl border p-6 ${
              isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm shadow-slate-900/5"
            }`}
          >
            <h2 className="text-xl font-black tracking-[-0.04em]">{item.title}</h2>
            <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

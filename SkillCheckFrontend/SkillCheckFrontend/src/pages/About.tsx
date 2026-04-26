import { useTheme } from "../hooks/useTheme";

const points = [
  "Practice both technical and HR interviews in a conversational format.",
  "Choose role and seniority for technical sessions.",
  "Receive structured feedback that is easy to review and act on.",
];

export function About() {
  const { isDark } = useTheme();

  return (
    <section className="space-y-6">
      <div
        className={`rounded-3xl border px-6 py-8 sm:px-8 lg:px-10 ${
          isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-xl shadow-slate-900/5"
        }`}
      >
        <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
          About SkillCheck
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">
          A simple way to practice interviews before the real one.
        </h1>
        <p className={`mt-4 max-w-3xl text-base leading-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          SkillCheck is built for candidates who want a cleaner way to rehearse interview scenarios, improve answer
          quality, and review feedback after each session.
        </p>
      </div>

      <div
        className={`rounded-2xl border p-6 ${
          isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"
        }`}
      >
        <ul className={`space-y-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {points.map((point) => (
            <li key={point} className="flex gap-3">
              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isDark ? "bg-emerald-300" : "bg-emerald-500"}`} />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

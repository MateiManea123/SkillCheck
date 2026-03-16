export function About() {
  return (
    <section className="space-y-8">
      <div className="animate-fade-up rounded-3xl border border-white/70 bg-white/80 p-7 shadow-xl shadow-sky-100/60 sm:p-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">About SkillCheck</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          SkillCheck helps candidates prepare for technical and HR interviews by simulating a realistic interview flow.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <article className="animate-float rounded-2xl border border-sky-100 bg-white/85 p-6 shadow-lg shadow-sky-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          <h2 className="text-lg font-semibold text-slate-900">Backend integration</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The app consumes your Django endpoints for session start, current question, answer submission, and final
            feedback.
          </p>
        </article>

        <article className="animate-float rounded-2xl border border-violet-100 bg-white/85 p-6 shadow-lg shadow-violet-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl [animation-delay:180ms]">
          <h2 className="text-lg font-semibold text-slate-900">Frontend stack</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            React + TypeScript + Tailwind + React Query + React Router, with strongly typed API contracts.
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-100/70 via-sky-100/70 to-indigo-100/70 p-5 text-sm text-slate-700">
        Tip: this UI now uses brighter colors, extra whitespace, motion, and hover transitions for a more dynamic feel.
      </div>
    </section>
  );
}

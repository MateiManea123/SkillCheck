import { Link } from "react-router-dom";

export function Home() {
  return (
    <section className="space-y-10">
      <div className="animate-fade-up rounded-3xl border border-white/70 bg-white/75 p-7 shadow-xl shadow-sky-100/60 backdrop-blur-xl sm:p-12">
        <div className="max-w-3xl space-y-6">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
            Frontend Interview Platform
          </span>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            Practice smarter with live AI interview sessions
          </h1>

          <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
            Choose interview type, role, and level. Answer questions one by one, then receive structured AI feedback at
            the end of the session.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/interview"
              className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 transition duration-300 hover:-translate-y-0.5 hover:from-sky-600 hover:to-indigo-600 hover:shadow-lg"
            >
              Start Interview
            </Link>
            <Link
              to="/about"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {[
          { title: "Start Session", text: "Create a new interview session in one click." },
          { title: "Answer Questions", text: "Receive dynamic questions and reply in sequence." },
          { title: "Get AI Feedback", text: "Review score, strengths, and improvement areas." },
        ].map((item, index) => (
          <article
            key={item.title}
            className="animate-float rounded-2xl border border-white/80 bg-white/80 p-6 shadow-lg shadow-sky-100 transition duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ animationDelay: `${index * 180}ms` }}
          >
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
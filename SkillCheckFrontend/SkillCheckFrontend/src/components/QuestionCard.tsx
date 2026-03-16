import type { CurrentQuestionResponse, SubmitAnswerResponse } from "../types/session";

interface QuestionCardProps {
  question: CurrentQuestionResponse | undefined;
  answer: string;
  setAnswer: (answer: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: boolean;
  progressLabel: string;
  lastAnswerFeedback: SubmitAnswerResponse | null;
}

export function QuestionCard({
  question,
  answer,
  setAnswer,
  onSubmit,
  loading,
  error,
  progressLabel,
  lastAnswerFeedback,
}: QuestionCardProps) {
  if (!question) return null;

  return (
    <section className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-xl shadow-indigo-100/60">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          {progressLabel}
        </span>
        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          {question.question_kind}
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Could not load the question.
        </p>
      )}

      <h2 className="text-xl font-bold text-slate-900">Question</h2>
      <p className="mt-2 leading-7 text-slate-600">{question.question_text}</p>

      <textarea
        className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-sky-400/70 transition placeholder:text-slate-400 focus:ring-2"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your answer here..."
        rows={5}
      />

      <button
        className="mt-4 inline-flex items-center rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-200 transition duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onSubmit}
        disabled={loading || answer.trim() === ""}
      >
        {loading ? "Submitting..." : "Submit Answer"}
      </button>

      {lastAnswerFeedback && (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <p className="text-sm text-slate-700">
            <b>Current score:</b> {lastAnswerFeedback.score}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{lastAnswerFeedback.feedback}</p>
        </div>
      )}
    </section>
  );
}
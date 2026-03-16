import type { SessionDetailsResponse } from "../types/session";

interface SessionSummaryProps {
  sessionFinished: boolean;
  nrAnswers: number;
  sessionData: SessionDetailsResponse | undefined;
  error: boolean;
  canRetryFinalFeedback: boolean;
  finalFeedbackLoading: boolean;
  onRetryFinalFeedback: () => void;
}

export function SessionSummary({
  sessionFinished,
  nrAnswers,
  sessionData,
  error,
  canRetryFinalFeedback,
  finalFeedbackLoading,
  onRetryFinalFeedback,
}: SessionSummaryProps) {
  if (!sessionFinished) return null;

  const feedback = sessionData?.ai_feedback;

  return (
    <section className="animate-fade-up rounded-3xl border border-emerald-200 bg-white/85 p-6 shadow-xl shadow-emerald-100/60">
      <h2 className="text-xl font-bold text-slate-900">Session Completed</h2>
      <p className="mt-2 text-sm text-slate-600">
        <b>Answers submitted:</b> {nrAnswers}
      </p>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Could not load session details.
        </p>
      )}

      {canRetryFinalFeedback && (
        <button
          type="button"
          onClick={onRetryFinalFeedback}
          disabled={finalFeedbackLoading}
          className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {finalFeedbackLoading ? "Retrying..." : "Retry Final Feedback"}
        </button>
      )}

      {feedback && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-700">Final score</h3>
            <p className="mt-1 text-3xl font-black text-slate-900">{feedback.overall_score}</p>
            <p className="mt-2 text-sm text-slate-600">{feedback.summary}</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
              {feedback.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-violet-100 bg-violet-50/80 p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700">Improvements</h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
              {feedback.improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {sessionData && (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">View raw session payload</summary>
          <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(sessionData, null, 2) as string}
          </pre>
        </details>
      )}
    </section>
  );
}
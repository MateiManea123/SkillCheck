import { useSessionFlow } from "../hooks/useSessionFlow";
import { SessionControls } from "../components/SessionControls";
import { QuestionCard } from "../components/QuestionCard";
import { SessionSummary } from "../components/SessionSummary";

export function Interview() {
  const {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    nrAnswers,
    totalQuestions,
    lastAnswerFeedback,
    question,
    sessionData,
    errors,
    actions,
    canRetryFinalFeedback,
    finalFeedbackLoading,
    loading,
  } = useSessionFlow();

  const questionNumber = totalQuestions ? Math.min(nrAnswers + 1, totalQuestions) : 0;
  const progressPercent = totalQuestions ? Math.min((nrAnswers / totalQuestions) * 100, 100) : 0;
  const progressLabel = totalQuestions ? `Question ${questionNumber} / ${totalQuestions}` : "Current question";

  return (
    <section className="space-y-7">
      <div className="animate-fade-up rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">AI Interview Studio</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Start a session, answer each question in sequence, and receive final AI feedback.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-sky-600">Session</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{sessionId ? `#${sessionId}` : "Not started"}</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-indigo-600">Answered</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{nrAnswers}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-600">Total questions</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{totalQuestions || "—"}</p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <SessionControls
        loading={loading}
        onStart={actions.startSession}
        sessionId={sessionId}
        disabled={!!sessionId && !sessionFinished}
      />

      {errors.start && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not start the session.</p>}
      {errors.submit && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not submit the answer.</p>}

      <QuestionCard
        question={question}
        answer={answer}
        setAnswer={setAnswer}
        onSubmit={actions.submitAnswer}
        loading={loading}
        error={!!errors.question}
        progressLabel={progressLabel}
        lastAnswerFeedback={lastAnswerFeedback}
      />

      <SessionSummary
        sessionFinished={sessionFinished}
        nrAnswers={nrAnswers}
        sessionData={sessionData}
        error={!!errors.sessionData}
        canRetryFinalFeedback={canRetryFinalFeedback}
        finalFeedbackLoading={finalFeedbackLoading}
        onRetryFinalFeedback={actions.retryFinalFeedback}
      />
    </section>
  );
}

import { useSessionFlow } from "../hooks/useSessionFlow";
import { SessionControls } from "../components/SessionControls";
import { QuestionCard } from "../components/QuestionCard";
import { SessionSummary } from "../components/SessionSummary";

export function Home() {
  const {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    nrAnswers,

    question,
    sessionData,

    errors,
    actions,

    loading,
  } = useSessionFlow();

  return (
    <div style={{ padding: 20 }}>
      <h1>Home Page</h1>

      <SessionControls
        loading={loading}
        onStart={actions.startSession}
        sessionId={sessionId}
      />

      {/* dacă vrei mesaj pt erori de start/submit */}
      {errors.start && <p style={{ marginTop: 12 }}>Nu am putut porni sesiunea.</p>}
      {errors.submit && <p style={{ marginTop: 12 }}>Nu am putut trimite răspunsul.</p>}

      <QuestionCard
        question={question}
        answer={answer}
        setAnswer={setAnswer}
        onSubmit={actions.submitAnswer}
        loading={loading}
        error={!!errors.question}
      />

      <SessionSummary
        sessionFinished={sessionFinished}
        nrAnswers={nrAnswers}
        sessionData={sessionData}
        error={!!errors.sessionData}
      />
    </div>
  );
}
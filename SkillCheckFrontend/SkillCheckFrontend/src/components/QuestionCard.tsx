interface QuestionCardProps {
  question: { question_text: string } | null;
  answer: string;
  setAnswer: (answer: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: boolean;
}

export function QuestionCard({
  question,
  answer,
  setAnswer,
  onSubmit,
  loading,
  error,
}: QuestionCardProps) {
  if (!question) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {error && <p>Nu am putut încărca întrebarea.</p>}

      <p>
        <b>Întrebare:</b> {question.question_text}
      </p>

      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Scrie răspunsul..."
        style={{ padding: 8, width: 300 }}
      />

      <button
        onClick={onSubmit}
        disabled={loading || answer.trim() === ""}
        style={{ marginLeft: 8 }}
      >
        {loading ? "Submitting..." : "Submit Answer"}
      </button>
    </div>
  );
}
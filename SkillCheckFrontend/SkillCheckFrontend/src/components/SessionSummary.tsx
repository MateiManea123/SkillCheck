interface SessionSummaryProps {
  sessionFinished: boolean;
  nrAnswers: number;
  sessionData: any;
  error: boolean;
}

export function SessionSummary({ sessionFinished, nrAnswers, sessionData, error }: SessionSummaryProps) {
  if (!sessionFinished) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <h2>Sesiunea s-a încheiat</h2>
      <p>
        <b>Răspunsuri:</b> {nrAnswers}
      </p>

      {error && <p>Nu am putut încărca datele sesiunii.</p>}

      {sessionData && (
        <pre style={{ background: "#eee", padding: 12 }}>
          {JSON.stringify(sessionData, null, 2) as string}
        </pre>
      )}
    </div>
  );
}
interface SessionControlsProps {
  loading: boolean;
  onStart: () => void;
  sessionId: string | null;
}

export function SessionControls({ loading, onStart, sessionId }: SessionControlsProps) {
  return (
    <div>
      <button onClick={onStart} disabled={loading}>
        {loading ? "Loading..." : "Start Session"}
      </button>

      {sessionId && (
        <p style={{ marginTop: 12 }}>
          <b>Session ID:</b> {sessionId}
        </p>
      )}
    </div>
  );
}
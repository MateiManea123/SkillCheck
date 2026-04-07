import { useEffect, useRef, useState } from "react";
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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleAnswerChange = (nextValue: string) => {
    setAnswer(nextValue);

    if (isListening) {
      // If user edits/deletes text while dictation is active, reset the speech
      // buffer baseline so old transcript is not re-inserted.
      baseTextRef.current = nextValue;
      finalTranscriptRef.current = "";
    }
  };

  const startListening = async () => {
    setSpeechError(null);

    const SpeechRecognitionCtor = (
      window as Window & {
        SpeechRecognition?: new () => any;
        webkitSpeechRecognition?: new () => any;
      }
    ).SpeechRecognition ??
      (
        window as Window & {
          SpeechRecognition?: new () => any;
          webkitSpeechRecognition?: new () => any;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      setSpeechError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    baseTextRef.current = answer;
    finalTranscriptRef.current = "";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript ?? "";
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      const spoken = `${finalTranscriptRef.current}${interimTranscript}`.trim();
      const separator = baseTextRef.current && spoken ? "\n" : "";
      setAnswer(`${baseTextRef.current}${separator}${spoken}`.trim());
    };

    recognition.onerror = () => {
      setSpeechError("Speech recognition error. Please try again.");
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("Could not start voice recording.");
      stopListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

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
        onChange={(e) => handleAnswerChange(e.target.value)}
        placeholder="Write your answer here..."
        rows={5}
      />

      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!speechSupported || loading}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <path d="M12 19v3" />
            </svg>
            {isListening ? "Stop voice input" : "Speak your answer"}
          </button>

          <span className="text-xs text-slate-500">{isListening ? "Listening..." : "Click mic to dictate"}</span>
        </div>

        {speechError && <p className="mt-2 text-xs text-rose-600">{speechError}</p>}
      </div>

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
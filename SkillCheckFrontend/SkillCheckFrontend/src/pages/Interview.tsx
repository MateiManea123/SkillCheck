import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSessionFlow } from "../hooks/useSessionFlow";
import { useTheme } from "../hooks/useTheme";
import { setPendingFinalFeedbackSessionId } from "../utils/finalFeedbackTask";

type FeedbackMode = "PER_QUESTION" | "FINAL_ONLY";
const FEEDBACK_MODE_KEY = "skillcheck.feedback.mode.v1";
const CHAT_HISTORY_KEY = "skillcheck.chat.history.v1";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function Interview() {
  const {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    completedSessionId,
    nrAnswers,
    question,
    errors,
    actions,
    loading,
    feedbackHistory,
    isSubmitting,
    isQuestionFetching,
  } = useSessionFlow();
  const { isDark } = useTheme();

  const [feedbackMode] = useState<FeedbackMode>(() => {
    const stored = localStorage.getItem(FEEDBACK_MODE_KEY);
    return stored === "FINAL_ONLY" ? "FINAL_ONLY" : "PER_QUESTION";
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isEndingTransition, setIsEndingTransition] = useState(false);
  const navigate = useNavigate();

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");

  const questionNumber = sessionFinished ? Math.max(nrAnswers, 1) : Math.max(nrAnswers + 1, 1);
  const activeQuestionLabel = `Question #${questionNumber}`;
  const progressPercent = sessionFinished ? 100 : Math.min(18 + nrAnswers * 12 + (isSubmitting ? 5 : 0), 92);
  const hasActiveSession = !!sessionId && !sessionFinished;
  const chatTitle = hasActiveSession ? "Interview session" : sessionFinished ? "Interview complete" : "No active session";

  const appendUniqueMessage = (message: ChatMessage) => {
    setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    setSpeechError(null);

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

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

    recognition.onresult = (event) => {
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

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (question?.question_text) {
      const id = `q-${question.order}-${question.question_text}`;
      queueMicrotask(() => {
        appendUniqueMessage({
          id,
          role: "assistant",
          text: question.question_text,
        });
      });
    }
  }, [question]);

  useEffect(() => {
    if (feedbackMode !== "PER_QUESTION" || feedbackHistory.length === 0) return;
    const index = feedbackHistory.length - 1;
    const feedback = feedbackHistory[index];
    const id = `f-${index}-${feedback.score}-${feedback.next_index}`;
    queueMicrotask(() => {
      appendUniqueMessage({
        id,
        role: "assistant",
        text: `Feedback (${feedback.score}/10): ${feedback.feedback}`,
      });
    });
  }, [feedbackHistory, feedbackMode]);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages, isSubmitting, isQuestionFetching]);

  useEffect(() => {
    if (!sessionFinished || !completedSessionId) return;
    queueMicrotask(() => {
      setIsEndingTransition(true);
    });
    setPendingFinalFeedbackSessionId(completedSessionId);
    const timeoutId = window.setTimeout(() => {
      navigate("/");
    }, 1650);
    return () => window.clearTimeout(timeoutId);
  }, [completedSessionId, navigate, sessionFinished]);

  const canSubmit = !!sessionId && !sessionFinished && answer.trim() !== "" && !loading;

  const submitFromChat = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || !canSubmit) return;

    appendUniqueMessage({
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    });
    actions.submitAnswer();
  };

  const clearChatAndGoSetup = () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    setMessages([]);
  };

  const emptyState = useMemo(
    () => (
      <div
        className={`rounded-2xl border border-dashed p-10 text-center ${
          isDark ? "border-white/10 bg-white/5" : "border-slate-300 bg-white"
        }`}
      >
        <p className={`text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Start a session before opening the interview room.
        </p>
        <Link
          to="/interview"
          onClick={clearChatAndGoSetup}
          className={`mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold transition ${
            isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          Go to setup
        </Link>
      </div>
    ),
    [isDark],
  );

  const panelClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white shadow-sm shadow-slate-900/5";

  return (
    <section className="space-y-6">
      <div className={`rounded-3xl border p-6 sm:p-8 ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-[0.24em] ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
              Live session
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">{chatTitle}</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Session</p>
              <p className="mt-1 font-semibold">{sessionId ? `#${sessionId}` : "None"}</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Progress</p>
              <p className="mt-1 font-semibold">{progressPercent}%</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>Feedback</p>
              <p className="mt-1 font-semibold">{feedbackMode === "PER_QUESTION" ? "Live" : "Final only"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`rounded-2xl border p-5 h-fit ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}>
          <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Status
          </p>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
              <span>{activeQuestionLabel}</span>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>{progressPercent}%</span>
            </div>
            <div className={`h-2 rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`}>
              <div
                className={`h-2 rounded-full ${isDark ? "bg-emerald-400" : "bg-slate-900"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Answers sent</span>
              <span className="font-semibold">{nrAnswers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Voice input</span>
              <span className="font-semibold">{speechSupported ? (isListening ? "Listening" : "Available") : "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>Room</span>
              <span className="font-semibold">{hasActiveSession ? "Active" : sessionFinished ? "Finished" : "Idle"}</span>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {isEndingTransition && (
            <div className={`rounded-2xl border p-4 text-sm font-semibold ${isDark ? "border-white/10 bg-slate-950/90" : "border-slate-200 bg-white"}`}>
              Interview complete. Preparing final feedback...
            </div>
          )}

          {!hasActiveSession && !sessionFinished ? (
            emptyState
          ) : (
            <>
              <div
                ref={chatContainerRef}
                className={`h-[58vh] min-h-[420px] overflow-y-auto rounded-2xl border p-4 sm:p-5 ${
                  isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-white"
                }`}
              >
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p
                      className={`rounded-2xl border border-dashed px-4 py-4 text-sm ${
                        isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-300 bg-slate-50 text-slate-600"
                      }`}
                    >
                      Waiting for the interviewer question...
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                            message.role === "assistant"
                              ? isDark
                                ? "border border-white/10 bg-white/5 text-slate-200"
                                : "border border-slate-200 bg-slate-50 text-slate-700"
                              : isDark
                                ? "bg-emerald-400 text-slate-950"
                                : "bg-slate-900 text-white"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))
                  )}

                  {(isSubmitting || isQuestionFetching) && !sessionFinished && (
                    <div className="flex justify-start">
                      <div
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
                          isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className={`h-2 w-2 animate-pulse rounded-full ${isDark ? "bg-slate-400" : "bg-slate-500"}`} />
                        <span className={`h-2 w-2 animate-pulse rounded-full ${isDark ? "bg-slate-400" : "bg-slate-500"} [animation-delay:120ms]`} />
                        <span className={`h-2 w-2 animate-pulse rounded-full ${isDark ? "bg-slate-400" : "bg-slate-500"} [animation-delay:240ms]`} />
                        Interviewer is typing...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={submitFromChat} className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Your answer
                    </p>
                    <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      Keep your response clear and structured.
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{answer.trim().length} chars</p>
                </div>

                <textarea
                  className={`w-full rounded-xl border px-4 py-4 text-sm leading-7 outline-none transition focus:ring-2 ${
                    isDark
                      ? "border-white/10 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-emerald-400/30"
                      : "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:ring-slate-400/20"
                  }`}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your answer here..."
                  rows={6}
                  disabled={!hasActiveSession || loading}
                />

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDark
                          ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      disabled={!speechSupported || loading || !hasActiveSession}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <path d="M12 19v3" />
                      </svg>
                      {isListening ? "Stop voice input" : "Use voice input"}
                    </button>
                    {speechError && <p className={`text-xs font-semibold ${isDark ? "text-rose-300" : "text-rose-600"}`}>{speechError}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {!!sessionId && (
                      <button
                        type="button"
                        onClick={actions.endSession}
                        disabled={loading}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          isDark
                            ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        End session
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDark ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300" : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {loading ? "Sending..." : "Send answer"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {errors.submit && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not submit the answer.</p>}
      {errors.question && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not load the question.</p>}
      {errors.end && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not end the session.</p>}
    </section>
  );
}

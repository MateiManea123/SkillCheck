import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSessionFlow } from "../hooks/useSessionFlow";
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
  const chatTitle = hasActiveSession ? "Live interview chat" : sessionFinished ? "Interview complete" : "No active session";

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
      appendUniqueMessage({
        id,
        role: "assistant",
        text: question.question_text,
      });
    }
  }, [question]);

  useEffect(() => {
    if (feedbackMode !== "PER_QUESTION" || feedbackHistory.length === 0) return;
    const index = feedbackHistory.length - 1;
    const feedback = feedbackHistory[index];
    const id = `f-${index}-${feedback.score}-${feedback.next_index}`;
    appendUniqueMessage({
      id,
      role: "assistant",
      text: `Feedback (${feedback.score}/10): ${feedback.feedback}`,
    });
  }, [feedbackHistory, feedbackMode]);

  useEffect(() => {
    if (!chatContainerRef.current) return;
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages, isSubmitting, isQuestionFetching]);

  useEffect(() => {
    if (!sessionFinished || !completedSessionId) return;
    setIsEndingTransition(true);
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
        <p className="text-sm text-slate-600">You need to start a session before the interview chat can begin.</p>
        <Link
          to="/interview"
          onClick={clearChatAndGoSetup}
          className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Go to setup
        </Link>
      </div>
    ),
    [],
  );

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl shadow-indigo-100/60 backdrop-blur-xl">
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-100">
                Interview room
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{chatTitle}</h1>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100">
              {sessionId ? `Session #${sessionId}` : "No active session"}
            </div>
          </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span>{activeQuestionLabel}</span>
                <span>Estimated progress</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-300 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative p-4 sm:p-6">
          {isEndingTransition && (
            <div className="absolute inset-4 z-20 flex animate-fade-up items-center justify-center rounded-2xl border border-indigo-100 bg-white/92 p-6 shadow-xl shadow-indigo-100 backdrop-blur-sm">
              <p className="text-sm font-semibold text-slate-700">Interview complete. Preparing final feedback...</p>
            </div>
          )}

          {!hasActiveSession && !sessionFinished ? (
            emptyState
          ) : (
            <div className="space-y-4">
              <div ref={chatContainerRef} className="h-[54vh] min-h-[380px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                      Waiting for the interviewer question...
                    </p>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                            message.role === "assistant"
                              ? "border border-slate-200 bg-white text-slate-700"
                              : "border border-indigo-200 bg-indigo-600 text-white"
                          }`}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))
                  )}

                  {(isSubmitting || isQuestionFetching) && !sessionFinished && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
                        Interviewer is typing...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={submitFromChat} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-indigo-400/70 transition placeholder:text-slate-400 focus:ring-2"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your interview answer here..."
                  rows={5}
                  disabled={!hasActiveSession || loading}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!speechSupported || loading || !hasActiveSession}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 1 0 6 0V6a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <path d="M12 19v3" />
                      </svg>
                      {isListening ? "Stop voice input" : "Speak answer"}
                    </button>
                    {speechError && <p className="text-xs text-rose-600">{speechError}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    {!!sessionId && (
                      <button
                        type="button"
                        onClick={actions.endSession}
                        disabled={loading}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        End session
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 px-5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? "Sending..." : "Send answer"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {errors.submit && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not submit the answer.</p>}
      {errors.question && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not load the question.</p>}
      {errors.end && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Could not end the session.</p>}
    </section>
  );
}

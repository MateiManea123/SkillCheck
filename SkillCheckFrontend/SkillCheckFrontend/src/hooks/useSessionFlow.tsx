import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  endSession,
  startSession,
  getCurrentQuestion,
  submitAnswer,
} from "../api/sessionsApi";
import type {
  CurrentQuestionResponse,
  EndSessionResponse,
  StartSessionPayload,
  SubmitAnswerResponse,
} from "../types/session";

const STORAGE_KEY = "skillcheck.session.flow.v1";

export function clearPersistedSessionFlow() {
  localStorage.removeItem(STORAGE_KEY);
}

function isRetryableAxiosError(error: AxiosError | null | undefined): boolean {
  if (!error) return false;

  const code = error.code ?? "";
  const status = error.response?.status;

  return (
    code === "ECONNABORTED" ||
    code === "ERR_NETWORK" ||
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

interface PersistedSessionFlow {
  sessionId: number | null;
  completedSessionId: number | null;
  finishedSessionId: number | null;
  answer: string;
  sessionFinished: boolean;
  nrAnswers: number;
  totalQuestions: number;
  lastAnswerFeedback: SubmitAnswerResponse | null;
  feedbackHistory: SubmitAnswerResponse[];
}

const defaultState: PersistedSessionFlow = {
  sessionId: null,
  completedSessionId: null,
  finishedSessionId: null,
  answer: "",
  sessionFinished: false,
  nrAnswers: 0,
  totalQuestions: 0,
  lastAnswerFeedback: null,
  feedbackHistory: [],
};

function loadPersistedState(): PersistedSessionFlow {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw) as PersistedSessionFlow;
    return {
      ...defaultState,
      ...parsed,
    };
  } catch {
    return defaultState;
  }
}

export function useSessionFlow() {
  const [initialState] = useState<PersistedSessionFlow>(() => loadPersistedState());
  const [sessionId, setSessionId] = useState<number | null>(initialState.sessionId);
  const [completedSessionId, setCompletedSessionId] = useState<number | null>(initialState.completedSessionId);
  const [finishedSessionId, setFinishedSessionId] = useState<number | null>(initialState.finishedSessionId);

  const [answer, setAnswer] = useState(initialState.answer);
  const [sessionFinished, setSessionFinished] = useState(initialState.sessionFinished);
  const [nrAnswers, setNrAnswers] = useState(initialState.nrAnswers);
  const [totalQuestions, setTotalQuestions] = useState(initialState.totalQuestions);
  const [lastAnswerFeedback, setLastAnswerFeedback] = useState<SubmitAnswerResponse | null>(initialState.lastAnswerFeedback);
  const [feedbackHistory, setFeedbackHistory] = useState<SubmitAnswerResponse[]>(initialState.feedbackHistory);

  const currentQuestionQuery = useQuery<CurrentQuestionResponse, AxiosError>({
    queryKey: ["currentQuestion", sessionId],
    enabled: !!sessionId && !sessionFinished,
    queryFn: () => getCurrentQuestion(sessionId as number),
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => isRetryableAxiosError(error) && failureCount < 4,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
  });

  const startSessionMutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data) => {
      setSessionFinished(false);
      setNrAnswers(0);
      setCompletedSessionId(null);
      setFinishedSessionId(null);
      setLastAnswerFeedback(null);
      setFeedbackHistory([]);

      setSessionId(data.session_id);
      setTotalQuestions(data.total_questions);
      setAnswer("");
    },
  });

  const submitAnswerMutation = useMutation<SubmitAnswerResponse, AxiosError, string>({
    mutationFn: async (answerValue) => {
      if (!sessionId) {
        throw new Error("The session is not active.");
      }

      if (!answerValue.trim()) {
        throw new Error("Answer cannot be empty.");
      }

      return submitAnswer({
        sessionId,
        answer: answerValue.trim(),
      });
    },
    onSuccess: async (data) => {
      setLastAnswerFeedback(data);
      setFeedbackHistory((prev) => [...prev, data]);
      setNrAnswers(data.next_index);

      let updatedTotalQuestions = totalQuestions;
      if (data.needs_followup) {
        updatedTotalQuestions += 1;
        setTotalQuestions(updatedTotalQuestions);
      }

      if (data.session_status === "FINISHED") {
        setSessionFinished(true);
        setCompletedSessionId(sessionId);
        setFinishedSessionId(sessionId);
        setSessionId(null);
        setAnswer("");
        return;
      }

      setAnswer("");

      await currentQuestionQuery.refetch();
    },
  });

  const endSessionMutation = useMutation<EndSessionResponse, AxiosError, number>({
    mutationFn: (activeSessionId) => endSession(activeSessionId),
    onSuccess: (data) => {
      setSessionFinished(true);
      setCompletedSessionId(data.session_id);
      setFinishedSessionId(data.session_id);
      setSessionId(null);
      setAnswer("");
    },
  });

  useEffect(() => {
    const next: PersistedSessionFlow = {
      sessionId,
      completedSessionId,
      finishedSessionId,
      answer,
      sessionFinished,
      nrAnswers,
      totalQuestions,
      lastAnswerFeedback,
      feedbackHistory,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [answer, completedSessionId, feedbackHistory, finishedSessionId, lastAnswerFeedback, nrAnswers, sessionFinished, sessionId, totalQuestions]);

  useEffect(() => {
    const error = currentQuestionQuery.error;
    const responseMessage = typeof error?.response?.data === "string" ? error.response.data : "";
    const shouldCloseAsFinished = /not active|no more questions/i.test(responseMessage);

    if (shouldCloseAsFinished && sessionId) {
      setSessionFinished(true);
      setCompletedSessionId(sessionId);
      setFinishedSessionId(sessionId);
      setSessionId(null);
      setAnswer("");
    }
  }, [currentQuestionQuery.error, sessionId]);

  const loading =
    startSessionMutation.isPending ||
    currentQuestionQuery.isLoading ||
    submitAnswerMutation.isPending ||
    endSessionMutation.isPending;

  return {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    completedSessionId,
    nrAnswers,
    totalQuestions,
    lastAnswerFeedback,
    feedbackHistory,

    question: currentQuestionQuery.data,

    errors: {
      start: startSessionMutation.error,
      question: currentQuestionQuery.error,
      submit: submitAnswerMutation.error,
      end: endSessionMutation.error,
      sessionData: null,
    },

    actions: {
      startSession: (payload: StartSessionPayload) => startSessionMutation.mutate(payload),
      submitAnswer: () => submitAnswerMutation.mutate(answer),
      endSession: () => {
        if (!sessionId || endSessionMutation.isPending) return;
        endSessionMutation.mutate(sessionId);
      },
      retryFinalFeedback: () => {},
    },

    canRetryFinalFeedback: false,
    finalFeedbackLoading: false,
    isSubmitting: submitAnswerMutation.isPending,
    isQuestionFetching: currentQuestionQuery.isFetching,

    loading,
  };
}

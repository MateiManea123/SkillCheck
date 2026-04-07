import { useEffect, useState } from "react";
import type { AxiosError } from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  endSession,
  startSession,
  getCurrentQuestion,
  submitAnswer,
  getSessionData,
} from "../api/sessionsApi";
import type {
  CurrentQuestionResponse,
  EndSessionResponse,
  SessionDetailsResponse,
  StartSessionPayload,
  SubmitAnswerResponse,
} from "../types/session";

const STORAGE_KEY = "skillcheck.session.flow.v1";

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
  cachedSessionData: SessionDetailsResponse | null;
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
  cachedSessionData: null,
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

function hasFormattingFailure(data: SessionDetailsResponse | null | undefined): boolean {
  const summary = data?.ai_feedback?.summary?.toLowerCase() ?? "";
  return summary.includes("formatting failed");
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
  const [cachedSessionData, setCachedSessionData] = useState<SessionDetailsResponse | null>(initialState.cachedSessionData);
  const [finalFeedbackRefetchCount, setFinalFeedbackRefetchCount] = useState(0);

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
      setCachedSessionData(null);
      setFinalFeedbackRefetchCount(0);

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

  const sessionDataQuery = useQuery<SessionDetailsResponse, AxiosError>({
    queryKey: ["sessionData", finishedSessionId],
    enabled: sessionFinished && !!finishedSessionId && !cachedSessionData,
    queryFn: () => getSessionData(finishedSessionId as number),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    refetchInterval: sessionFinished && !!finishedSessionId && !cachedSessionData ? 10000 : false,
    staleTime: Infinity,
    retry: (failureCount, error) => isRetryableAxiosError(error) && failureCount < 12,
    retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 30000),
  });

  useEffect(() => {
    if (sessionDataQuery.data) {
      if (hasFormattingFailure(sessionDataQuery.data) && finalFeedbackRefetchCount < 1) {
        setFinalFeedbackRefetchCount(1);
        void sessionDataQuery.refetch();
        return;
      }

      setCachedSessionData(sessionDataQuery.data);
      setFinishedSessionId(null);
    }
  }, [finalFeedbackRefetchCount, sessionDataQuery.data, sessionDataQuery.refetch]);

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
      cachedSessionData,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [answer, cachedSessionData, completedSessionId, finishedSessionId, lastAnswerFeedback, nrAnswers, sessionFinished, sessionId, totalQuestions]);

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

  const currentSessionData = cachedSessionData ?? sessionDataQuery.data;

  const retryFinalFeedback = () => {
    const retrySessionId = completedSessionId ?? finishedSessionId;
    if (!retrySessionId || sessionDataQuery.isFetching) return;

    setCachedSessionData(null);
    setFinalFeedbackRefetchCount(0);
    setFinishedSessionId(retrySessionId);

    void sessionDataQuery.refetch();
  };

  const canRetryFinalFeedback =
    !!(completedSessionId ?? finishedSessionId) &&
    !!sessionFinished &&
    !sessionDataQuery.isFetching &&
    (!!sessionDataQuery.error || hasFormattingFailure(currentSessionData));

  const loading =
    startSessionMutation.isPending ||
    currentQuestionQuery.isLoading ||
    submitAnswerMutation.isPending ||
    endSessionMutation.isPending ||
    sessionDataQuery.isLoading;

  return {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    nrAnswers,
    totalQuestions,
    lastAnswerFeedback,

    question: currentQuestionQuery.data,
    sessionData: currentSessionData,

    errors: {
      start: startSessionMutation.error,
      question: currentQuestionQuery.error,
      submit: submitAnswerMutation.error,
      end: endSessionMutation.error,
      sessionData: sessionDataQuery.error,
    },

    actions: {
      startSession: (payload: StartSessionPayload) => startSessionMutation.mutate(payload),
      submitAnswer: () => submitAnswerMutation.mutate(answer),
      endSession: () => {
        if (!sessionId || endSessionMutation.isPending) return;
        endSessionMutation.mutate(sessionId);
      },
      retryFinalFeedback,
    },

    canRetryFinalFeedback,
    finalFeedbackLoading: sessionDataQuery.isFetching,

    loading,
  };
}
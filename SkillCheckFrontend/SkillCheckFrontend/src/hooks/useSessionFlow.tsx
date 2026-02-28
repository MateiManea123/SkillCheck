import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  startSession,
  getCurrentQuestion,
  submitAnswer,
  getSessionData,
} from "../api/sessionsApi";

export function useSessionFlow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finishedSessionId, setFinishedSessionId] = useState<string | null>(null);

  const [answer, setAnswer] = useState("");
  const [sessionFinished, setSessionFinished] = useState(false);
  const [nrAnswers, setNrAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const currentQuestionQuery = useQuery({
    queryKey: ["currentQuestion", sessionId],
    enabled: !!sessionId && !sessionFinished,
    queryFn: () => getCurrentQuestion(sessionId),
    refetchOnWindowFocus: false,
  });

  const startSessionMutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data) => {
      setSessionFinished(false);
      setNrAnswers(0);
      setFinishedSessionId(null);

      setSessionId(data.session_id);
      setTotalQuestions(data.total_questions);
      setAnswer("");
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async () => {
      const q = currentQuestionQuery.data;
      if (!sessionId || !q) return;

      return submitAnswer({
        sessionId,
        question_id: q.question_id,
        answer,
      });
    },
    onSuccess: async () => {
      const nextCount = nrAnswers + 1;
      setNrAnswers(nextCount);

      if (nextCount >= totalQuestions) {
        setSessionFinished(true);
        setFinishedSessionId(sessionId);
        setSessionId(null);
        return;
      }

      setAnswer("");
      await currentQuestionQuery.refetch();
    },
  });

  const sessionDataQuery = useQuery({
    queryKey: ["sessionData", finishedSessionId],
    enabled: sessionFinished && !!finishedSessionId,
    queryFn: () => getSessionData(finishedSessionId as string),
    refetchOnWindowFocus: false,
  });

  const loading =
    startSessionMutation.isPending ||
    currentQuestionQuery.isLoading ||
    submitAnswerMutation.isPending ||
    sessionDataQuery.isLoading;

  return {
    sessionId,
    answer,
    setAnswer,
    sessionFinished,
    nrAnswers,
    totalQuestions,

    question: currentQuestionQuery.data,
    sessionData: sessionDataQuery.data,

    errors: {
      start: startSessionMutation.error,
      question: currentQuestionQuery.error,
      submit: submitAnswerMutation.error,
      sessionData: sessionDataQuery.error,
    },

    actions: {
      startSession: () => startSessionMutation.mutate(),
      submitAnswer: () => submitAnswerMutation.mutate(),
    },

    loading,
  };
}
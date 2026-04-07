import axios from "axios";
import type {
  CurrentQuestionResponse,
  EndSessionResponse,
  SessionDetailsResponse,
  StartSessionPayload,
  StartSessionResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "../types/session";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api";

const apiClient = axios.create({
  baseURL: API,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function startSession(payload: StartSessionPayload): Promise<StartSessionResponse> {
  const res = await apiClient.post<StartSessionResponse>("/sessions/", payload);
  return res.data;
}

export async function getCurrentQuestion(sessionId: number): Promise<CurrentQuestionResponse> {
  const res = await apiClient.get<CurrentQuestionResponse>(`/sessions/${sessionId}/current-question/`, {
    timeout: 180000,
  });
  return res.data;
}

export async function submitAnswer({ sessionId, answer }: SubmitAnswerPayload): Promise<SubmitAnswerResponse> {
  const res = await apiClient.post<SubmitAnswerResponse>(`/sessions/${sessionId}/answer/`, {
    answer,
  }, {
    timeout: 300000,
  });
  return res.data;
}

export async function getSessionData(sessionId: number): Promise<SessionDetailsResponse> {
  const res = await apiClient.get<SessionDetailsResponse>(`/sessions/${sessionId}/`, {
    timeout: 300000,
  });
  return res.data;
}

export async function endSession(sessionId: number): Promise<EndSessionResponse> {
  const res = await apiClient.post<EndSessionResponse>(`/sessions/${sessionId}/end/`, undefined, {
    timeout: 120000,
  });
  return res.data;
}
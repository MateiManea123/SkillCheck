import axios from "axios";
import type {
  CurrentQuestionResponse,
  SessionDetailsResponse,
  StartSessionPayload,
  StartSessionResponse,
  SubmitAnswerPayload,
  SubmitAnswerResponse,
} from "../types/session";

const API = import.meta.env.VITE_API_BASE_URL ?? "/api";

const apiClient = axios.create({
  baseURL: API,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function startSession(payload: StartSessionPayload): Promise<StartSessionResponse> {
  const res = await apiClient.post<StartSessionResponse>("/sessions/", payload);
  return res.data;
}

export async function getCurrentQuestion(sessionId: number): Promise<CurrentQuestionResponse> {
  const res = await apiClient.get<CurrentQuestionResponse>(`/sessions/${sessionId}/current-question/`);
  return res.data;
}

export async function submitAnswer({ sessionId, answer }: SubmitAnswerPayload): Promise<SubmitAnswerResponse> {
  const res = await apiClient.post<SubmitAnswerResponse>(`/sessions/${sessionId}/answer/`, {
    answer,
  });
  return res.data;
}

export async function getSessionData(sessionId: number): Promise<SessionDetailsResponse> {
  const res = await apiClient.get<SessionDetailsResponse>(`/sessions/${sessionId}/`, {
    timeout: 60000,
  });
  return res.data;
}
import axios from "axios";

const API = "http://127.0.0.1:8000/api";

export async function startSession() {
  const res = await axios.post(`${API}/sessions/`);
  return res.data; // { session_id, total_questions }
}

export async function getCurrentQuestion(sessionId: any) {
  const res = await axios.get(`${API}/sessions/${sessionId}/current-question/`);
  return res.data; // { question_id, question_text }
}

export async function submitAnswer({ sessionId, question_id, answer }: { sessionId: string; question_id: string; answer: string }) {
  const res = await axios.post(`${API}/sessions/${sessionId}/answer/`, {
    question_id,
    answer,
  });
  return res.data;
}

export async function getSessionData(sessionId: string) {
  const res = await axios.get(`${API}/sessions/${sessionId}/`);
  return res.data;
}
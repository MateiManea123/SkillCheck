export type InterviewType = "HR" | "TECHNICAL";
export type RoleType = "FRONTEND" | "BACKEND";
export type LevelType = "JUNIOR" | "MID" | "SENIOR";
export type SessionStatus = "ACTIVE" | "FINISHED";
export type QuestionKind = "BASE" | "FOLLOW_UP";

export interface StartSessionPayload {
  interview_type: InterviewType;
  role?: RoleType;
  level?: LevelType;
}

export interface StartSessionResponse {
  session_id: number;
  total_questions: number;
}

export interface CurrentQuestionResponse {
  session_id: number;
  order: number;
  question_kind: QuestionKind;
  question_text: string;
}

export interface SubmitAnswerPayload {
  sessionId: number;
  answer: string;
}

export interface SubmitAnswerResponse {
  message: string;
  score: number;
  feedback: string;
  needs_followup: boolean;
  session_status: SessionStatus;
  next_index: number;
}

export interface EndSessionResponse {
  message: string;
  session_status: SessionStatus;
  session_id: number;
}

export interface SessionQuestionSummary {
  question_text: string;
  answer_text: string | null;
}

export interface FinalAiFeedback {
  overall_score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface SessionDetailsResponse {
  session_id: number;
  status: SessionStatus;
  created_at: string;
  ended_at: string | null;
  questions: SessionQuestionSummary[];
  ai_feedback: FinalAiFeedback;
}

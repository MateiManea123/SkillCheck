export type InterviewType = "HR" | "TECHNICAL";
export type RoleType = "FRONTEND" | "BACKEND" | "FULLSTACK";
export type LevelType = "JUNIOR" | "MID" | "SENIOR";
export type SessionStatus = "ACTIVE" | "FINISHED";
export type QuestionKind = "BASE" | "FOLLOW_UP";
export type TechnologyType =
  | "HTML"
  | "CSS"
  | "JAVASCRIPT"
  | "TYPESCRIPT"
  | "REACT"
  | "PYTHON"
  | "DJANGO"
  | "REST_API"
  | "SQL"
  | "AUTHENTICATION"
  | "SECURITY"
  | "TESTING"
  | "PERFORMANCE"
  | "ACCESSIBILITY";
export type QuestionType =
  | "CONCEPTUAL"
  | "PRACTICAL"
  | "DEBUGGING"
  | "ARCHITECTURE"
  | "PERFORMANCE"
  | "SECURITY"
  | "TRADE_OFF";

export interface StartSessionPayload {
  interview_type: InterviewType;
  role?: RoleType;
  level?: LevelType;
  selected_technologies?: TechnologyType[];
  question_types?: QuestionType[];
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
  ai_score?: number | null;
  ai_feedback?: string | null;
  ai_needs_followup?: boolean | null;
  ai_followup_question?: string | null;
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
  ai_feedback: FinalAiFeedback | null;
}

export interface SessionHistoryItem {
  id: number;
  status: SessionStatus;
  interview_type: InterviewType;
  role: RoleType | null;
  level: LevelType | null;
  created_at: string;
  ended_at: string | null;
  final_overall_score: number | null;
}

import json
import os
from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()


class AIInterviewService:
    def __init__(self):
        provider = os.getenv("LLM_PROVIDER", "auto").lower()

        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")

        if provider == "auto":
            if endpoint and api_key and azure_deployment:
                provider = "azure"
            else:
                provider = "ollama"

        if provider == "azure":
            if not endpoint:
                raise ValueError("AZURE_OPENAI_ENDPOINT is missing")
            if not api_key:
                raise ValueError("AZURE_OPENAI_API_KEY is missing")
            if not azure_deployment:
                raise ValueError("AZURE_OPENAI_DEPLOYMENT is missing")

            self.model = azure_deployment
            self.client = OpenAI(
                api_key=api_key, base_url=f"{endpoint.rstrip('/')}/openai/v1/"
            )
            return

        if provider == "ollama":
            ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
            ollama_api_key = os.getenv("OLLAMA_API_KEY", "ollama")

            self.model = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
            self.client = OpenAI(
                api_key=ollama_api_key,
                base_url=ollama_base_url.rstrip("/"),
            )
            return

        raise ValueError(
            "Invalid LLM_PROVIDER. Use one of: auto, azure, ollama"
        )

    def _chat(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.4
    ) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
        )
        content = response.choices[0].message.content or ""
        return content.strip()

    def rewrite_question(
        self,
        interview_type: str,
        question_text: str,
        previous_answer: str | None = None,
    ) -> str:
        system_prompt = """
            You are a professional interviewer conducting a real job interview.

            Your tone should be:
            - professional
            - neutral
            - slightly conversational
            - respectful
            - concise

            Do not be overly friendly.
            Do not sound robotic.
            Do not overpraise the candidate.

            Task:
            Rewrite the next interview question so it sounds natural in a real interview.

            Rules:
            - Keep the meaning of the original question.
            - If a previous answer is provided, briefly acknowledge it in one short sentence.
            - Then transition naturally to the next question.
            - Ask exactly one question.
            - Keep the whole output short.
            - Return only the final interviewer message.
                    """.strip()

        user_prompt = f"""
            Interview type: {interview_type}

            Previous candidate answer:
            {previous_answer or "No previous answer provided."}

            Original next question:
            {question_text}
                    """.strip()

        print("---------System prompt:---------", system_prompt)
        print("----------  User prompt:----------", user_prompt)

        return self._chat(system_prompt, user_prompt, temperature=0.5)

    def evaluate_answer_and_followup(
        self,
        interview_type: str,
        question_text: str,
        answer_text: str,
        history: list[dict] | None = None,
    ) -> dict:
        system_prompt = """
            You are a professional interviewer evaluating a candidate answer.

            Your job:
            1. Evaluate the answer quality.
            2. Decide if one follow-up question is needed.
            3. If needed, write one concise follow-up in a professional, neutral interview tone.

            Rules:
            - Be strict but fair.
            - Ask a follow-up only if the answer is vague, incomplete, evasive, too generic, or misses the main point.
            - Do not ask follow-up for every weak answer.
            - Assume only one follow-up is allowed for a base question.
            - Follow-up must be short and natural.
            - Do not be overly friendly.
            - Return strict JSON only.

            JSON schema:
            {
            "score": 1,
            "feedback": "short feedback",
            "needs_followup": false,
            "followup_question": ""
            }
                    """.strip()

        history_text = json.dumps(history or [], ensure_ascii=False)

        user_prompt = f"""
            Interview type: {interview_type}

            Conversation history:
            {history_text}

            Question:
            {question_text}

            Candidate answer:
            {answer_text}
                    """.strip()

        raw = self._chat(system_prompt, user_prompt, temperature=0.2)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {
                "score": 5,
                "feedback": "The answer was received, but evaluation formatting failed.",
                "needs_followup": False,
                "followup_question": "",
            }

        data.setdefault("score", 5)
        data.setdefault("feedback", "")
        data.setdefault("needs_followup", False)
        data.setdefault("followup_question", "")

        return data

    def generate_final_session_feedback(
        self,
        interview_type: str,
        qa_pairs: list[dict],
    ) -> dict:
        system_prompt = """
            You are a professional interviewer.

            Given the full interview, provide a concise final evaluation.

            Return strict JSON only with this schema:
            {
            "overall_score": 1,
            "summary": "short paragraph",
            "strengths": ["item 1", "item 2"],
            "improvements": ["item 1", "item 2"]
            }
                    """.strip()

        user_prompt = f"""
            Interview type: {interview_type}

            Interview transcript:
            {json.dumps(qa_pairs, ensure_ascii=False)}
                    """.strip()

        raw = self._chat(system_prompt, user_prompt, temperature=0.2)

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "overall_score": 5,
                "summary": "Interview completed, but final evaluation formatting failed.",
                "strengths": [],
                "improvements": [],
            }

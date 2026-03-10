import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

class AIInterviewService:
    def __init__(self):
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        self.deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")

        self.client = OpenAI(
            api_key=api_key,
            base_url=f"{endpoint}/openai/v1/"
        )

    def rewrite_question(self, interview_type: str, question_text: str) -> str:
        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional interview assistant. "
                        "Rewrite the question in a natural, conversational, professional tone. "
                        "Do not change the meaning. Return only the rewritten question."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Interview type: {interview_type}\nQuestion: {question_text}",
                },
            ],
            temperature=0.4,
        )
        print(response.choices[0].message.content.strip())  
        return response.choices[0].message.content.strip()

    def evaluate_answer_and_followup(
        self,
        interview_type: str,
        question_text: str,
        answer_text: str,
    ) -> dict:
        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an interviewer. "
                        "Evaluate the candidate answer and decide whether a follow-up is needed. "
                        "Return strict JSON only with keys: "
                        "score, feedback, needs_followup, followup_question."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Interview type: {interview_type}\n"
                        f"Question: {question_text}\n"
                        f"Candidate answer: {answer_text}\n\n"
                        "Rules:\n"
                        "- score is integer from 1 to 10\n"
                        "- feedback is short, 2-3 sentences max\n"
                        "- if no follow-up is needed, set needs_followup to false and followup_question to empty string\n"
                        "- follow-up must be concise and relevant\n"
                    ),
                },
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        return json.loads(content)
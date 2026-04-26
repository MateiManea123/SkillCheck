import json
import os
import threading
from typing import Any

import torch
from dotenv import load_dotenv
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


load_dotenv()


class LocalAdapterManager:
    _shared_adapter_cache: dict[str, tuple[Any, Any]] = {}
    _shared_adapter_locks: dict[str, threading.Lock] = {}
    _shared_lock = threading.Lock()

    def __init__(self):
        self.base_model = os.getenv(
            "LOCAL_BASE_MODEL",
            "meta-llama/Llama-3.2-3B-Instruct",
        )

        self.max_seq_length = int(os.getenv("LOCAL_MAX_SEQ_LENGTH", "2048"))
        self.load_in_4bit = os.getenv("LOCAL_LOAD_IN_4BIT", "true").lower() == "true"
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        self.adapters = {
            "interviewer": os.getenv("INTERVIEWER_ADAPTER_PATH", "ft_interviewer_llama32_3b"),
            "evaluator": os.getenv("EVALUATOR_ADAPTER_PATH", "ft_evaluator_llama32_3b"),
            "summary": os.getenv("SUMMARY_ADAPTER_PATH", "ft_summary_llama32_3b"),
        }

        self.model = None
        self.tokenizer = None
        self.current_adapter_name = None
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "mps" else torch.float32

    def _load_base_model(self):
        tokenizer = AutoTokenizer.from_pretrained(
            self.base_model,
            token=self.hf_token,
            trust_remote_code=True,
        )

        if tokenizer.pad_token_id is None and tokenizer.eos_token_id is not None:
            tokenizer.pad_token = tokenizer.eos_token

        model = AutoModelForCausalLM.from_pretrained(
            self.base_model,
            token=self.hf_token,
            torch_dtype=self.dtype,
            trust_remote_code=True,
        ).to(self.device)
        model.eval()

        return model, tokenizer

    def load_adapter(self, adapter_name: str):
        if adapter_name not in self.adapters:
            raise ValueError(f"Unknown adapter '{adapter_name}'")

        with LocalAdapterManager._shared_lock:
            if adapter_name not in LocalAdapterManager._shared_adapter_locks:
                LocalAdapterManager._shared_adapter_locks[adapter_name] = threading.Lock()

        adapter_lock = LocalAdapterManager._shared_adapter_locks[adapter_name]

        with adapter_lock:
            cached = LocalAdapterManager._shared_adapter_cache.get(adapter_name)
            if cached is not None:
                self.model, self.tokenizer = cached
                self.current_adapter_name = adapter_name
                return self.model, self.tokenizer

            adapter_path = self.adapters[adapter_name]

            if not os.path.exists(adapter_path):
                raise FileNotFoundError(
                    f"Adapter path not found for '{adapter_name}': {adapter_path}"
                )

            base_model, tokenizer = self._load_base_model()

            model = PeftModel.from_pretrained(
                base_model,
                adapter_path,
                is_trainable=False,
            )
            model.eval()

            LocalAdapterManager._shared_adapter_cache[adapter_name] = (model, tokenizer)

            self.model = model
            self.tokenizer = tokenizer
            self.current_adapter_name = adapter_name

        return self.model, self.tokenizer


class AIInterviewService:
    def __init__(self):
        provider = os.getenv("LLM_PROVIDER", "local").lower()

        if provider != "local":
            raise ValueError(
                "This version supports only LLM_PROVIDER=local. "
                "Use the previous implementation for azure/ollama."
            )

        self.local_manager = LocalAdapterManager()
        self.default_max_new_tokens = int(os.getenv("LOCAL_MAX_NEW_TOKENS", "256"))

    def _build_messages(self, system_prompt: str, user_prompt: str) -> list[dict[str, str]]:
        return [
            {"role": "system", "content": system_prompt.strip()},
            {"role": "user", "content": user_prompt.strip()},
        ]

    def _generate_local(
        self,
        adapter_name: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_new_tokens: int | None = None,
    ) -> str:
        model, tokenizer = self.local_manager.load_adapter(adapter_name)

        messages = self._build_messages(system_prompt, user_prompt)

        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        inputs = tokenizer(text, return_tensors="pt").to(self.local_manager.device)

        gen_kwargs: dict[str, Any] = {
            "max_new_tokens": max_new_tokens or self.default_max_new_tokens,
            "temperature": temperature,
            "pad_token_id": tokenizer.eos_token_id,
            "eos_token_id": tokenizer.eos_token_id,
        }

        if temperature <= 0:
            gen_kwargs["do_sample"] = False
            gen_kwargs.pop("temperature", None)
        else:
            gen_kwargs["do_sample"] = True

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                **gen_kwargs,
            )

        generated_tokens = outputs[0][inputs["input_ids"].shape[1]:]
        content = tokenizer.decode(generated_tokens, skip_special_tokens=True)

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
- concise
- respectful

Never be warm, enthusiastic, or congratulatory.
Do not validate the candidate's previous answer.
Do not provide feedback about answer quality.

Forbidden styles/examples:
- "That's great..."
- "Great approach..."
- "Thank you for sharing..."
- "It's great to hear..."

Task:
Rewrite the next interview question so it sounds natural in a real interview.

Rules:
- Keep the meaning of the original question.
- If a previous answer is provided, add at most one short neutral bridge sentence.
- The bridge sentence must not include praise, thanks, or judgement.
- Then ask the next question directly.
- Ask exactly one question.
- Keep the whole output short (1-2 sentences max).
- Return only the final interviewer message.
        """.strip()

        user_prompt = f"""
Interview type: {interview_type}

Previous candidate answer:
{previous_answer or "No previous answer provided."}

Original next question:
{question_text}
        """.strip()

        return self._generate_local(
            adapter_name="interviewer",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.5,
            max_new_tokens=120,
        )

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
- Ask a follow-up only when missing information blocks a fair evaluation of the core competency.
- Do not ask follow-up for minor missing detail.
- Do not ask follow-up if the answer is still gradable.
- Prefer `needs_followup=false` unless clarification is truly necessary.
- Score-to-follow-up policy (to keep in mind):
    - If score is 8-10: `needs_followup` must be false.
    - If score is 7: follow-up is optional, but default to false unless a key point is missing.
    - If score is 6 or below: `needs_followup` should usually be true when clarification can change evaluation.
- Assume only one follow-up is allowed for a base question.
- Follow-up must be short, neutral, and specific.
- Avoid repeating the same question with different wording.
- Prefer a nearby angle (context, decision criteria, impact, trade-off) instead of asking for "more details".
- Do not ask for concrete examples by default.
- Avoid phrases like "Can you give/provide an example" unless strictly required.
- Only ask for an example when score <= 5 and the answer is too abstract to evaluate the core competency.
- When score is 6-7, prefer clarification questions about reasoning, trade-offs, constraints, or outcomes (not example requests).
- Do not be friendly or congratulatory.
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

        raw = self._generate_local(
            adapter_name="evaluator",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_new_tokens=220,
        )

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

        raw = self._generate_local(
            adapter_name="summary",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_new_tokens=300,
        )

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {
                "overall_score": 5,
                "summary": "Interview completed, but final evaluation formatting failed.",
                "strengths": [],
                "improvements": [],
            }
import json
import os
import threading
from typing import Any

import torch
from dotenv import load_dotenv
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer


load_dotenv()


def _provider_for(area: str) -> str:
    return (
        os.getenv(f"{area}_LLM_PROVIDER")
        or os.getenv("LLM_PROVIDER")
        or "local"
    ).lower()


def _first_env(*names: str, default: str | None = None) -> str | None:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


class CloudLLMClient:
    def __init__(self, provider: str | None = None):
        provider = (provider or os.getenv("CLOUD_LLM_PROVIDER", "azure")).lower()
        if provider == "cloud":
            provider = os.getenv("CLOUD_LLM_PROVIDER", "azure").lower()
        self.provider = provider

        if provider == "azure":
            from openai import AzureOpenAI

            api_key = os.getenv("AZURE_OPENAI_API_KEY")
            endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")
            if not api_key or not endpoint:
                raise ValueError(
                    "Azure cloud mode requires AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT."
                )
            self.client = AzureOpenAI(
                api_key=api_key,
                azure_endpoint=endpoint,
                api_version=api_version,
            )
            return

        if provider == "openai":
            from openai import OpenAI

            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI cloud mode requires OPENAI_API_KEY.")
            self.client = OpenAI(api_key=api_key)
            return

        raise ValueError("CLOUD_LLM_PROVIDER must be 'azure' or 'openai'.")

    def generate(
        self,
        *,
        model: str,
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()


class LocalAdapterManager:
    _shared_adapter_cache: dict[str, tuple[Any, Any]] = {}
    _shared_adapter_locks: dict[str, threading.Lock] = {}
    _shared_lock = threading.Lock()

    def __init__(self, adapter_paths: dict[str, str] | None = None):
        self.base_model = os.getenv(
            "LOCAL_BASE_MODEL",
            "meta-llama/Llama-3.2-3B-Instruct",
        )

        self.max_seq_length = int(os.getenv("LOCAL_MAX_SEQ_LENGTH", "2048"))
        self.load_in_4bit = os.getenv("LOCAL_LOAD_IN_4BIT", "true").lower() == "true"
        self.hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN")

        default_adapter_paths = {
            "interviewer": os.getenv("INTERVIEWER_ADAPTER_PATH", "ft_interviewer_llama32_3b"),
            "evaluator": os.getenv("EVALUATOR_ADAPTER_PATH", "ft_evaluator_llama32_3b"),
            "summary": os.getenv("SUMMARY_ADAPTER_PATH", "ft_summary_llama32_3b"),
        }
        self.adapters = {
            name: self._resolve_adapter_path(path)
            for name, path in (adapter_paths or default_adapter_paths).items()
        }

        self.model = None
        self.tokenizer = None
        self.current_adapter_name = None
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "mps" else torch.float32

    def _resolve_adapter_path(self, adapter_path: str) -> str:
        expanded_path = os.path.expanduser(adapter_path)
        if os.path.isabs(expanded_path):
            return expanded_path

        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        adapters_dir = os.path.join(os.path.dirname(__file__), "adapters")
        candidates = [
            os.path.abspath(expanded_path),
            os.path.join(project_root, expanded_path),
            os.path.join(adapters_dir, expanded_path),
        ]

        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate

        return candidates[-1]

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

        adapter_path = self.adapters[adapter_name]
        cache_key = os.path.abspath(adapter_path)

        with LocalAdapterManager._shared_lock:
            if cache_key not in LocalAdapterManager._shared_adapter_locks:
                LocalAdapterManager._shared_adapter_locks[cache_key] = threading.Lock()

        adapter_lock = LocalAdapterManager._shared_adapter_locks[cache_key]

        with adapter_lock:
            cached = LocalAdapterManager._shared_adapter_cache.get(cache_key)
            if cached is not None:
                self.model, self.tokenizer = cached
                self.current_adapter_name = adapter_name
                return self.model, self.tokenizer

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

            LocalAdapterManager._shared_adapter_cache[cache_key] = (model, tokenizer)

            self.model = model
            self.tokenizer = tokenizer
            self.current_adapter_name = adapter_name

        return self.model, self.tokenizer


class AIInterviewService:
    def __init__(self):
        self.provider = _provider_for("HR")
        if self.provider not in {"local", "cloud", "azure", "openai"}:
            raise ValueError("HR_LLM_PROVIDER must be 'local', 'cloud', 'azure', or 'openai'.")

        self.local_manager = LocalAdapterManager() if self.provider == "local" else None
        self.cloud_client = CloudLLMClient(self.provider) if self.provider != "local" else None
        self.default_max_new_tokens = int(os.getenv("LOCAL_MAX_NEW_TOKENS", "256"))
        self.cloud_max_tokens = int(os.getenv("CLOUD_MAX_TOKENS", "512"))

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

    def _generate_text(
        self,
        *,
        adapter_name: str,
        cloud_model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_new_tokens: int | None = None,
    ) -> str:
        if self.provider == "local":
            return self._generate_local(
                adapter_name=adapter_name,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_new_tokens=max_new_tokens,
            )

        model = _first_env(
            cloud_model,
            "HR_CLOUD_MODEL",
            "CLOUD_MODEL",
            "AZURE_OPENAI_DEPLOYMENT",
            "OPENAI_MODEL",
            default="gpt-4o-mini",
        )
        return self.cloud_client.generate(
            model=model,
            messages=self._build_messages(system_prompt, user_prompt),
            temperature=temperature,
            max_tokens=max_new_tokens or self.cloud_max_tokens,
        )

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

        return self._generate_text(
            adapter_name="interviewer",
            cloud_model="HR_INTERVIEWER_CLOUD_MODEL",
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

        raw = self._generate_text(
            adapter_name="evaluator",
            cloud_model="HR_EVALUATOR_CLOUD_MODEL",
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

        raw = self._generate_text(
            adapter_name="summary",
            cloud_model="HR_SUMMARY_CLOUD_MODEL",
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


class TechnicalAIInterviewService:
    def __init__(self):
        self.provider = _provider_for("TECHNICAL")
        if self.provider not in {"local", "cloud", "azure", "openai"}:
            raise ValueError("TECHNICAL_LLM_PROVIDER must be 'local', 'cloud', 'azure', or 'openai'.")

        self.local_manager = (
            LocalAdapterManager(
                adapter_paths={
                    "technical_interviewer": os.getenv(
                        "TECHNICAL_INTERVIEWER_ADAPTER_PATH",
                        "ft_technical_interviewer_llama32_3b",
                    ),
                    "technical_evaluator": os.getenv(
                        "TECHNICAL_EVALUATOR_ADAPTER_PATH",
                        "ft_technical_evaluator_llama32_3b",
                    ),
                    "technical_summary": os.getenv(
                        "TECHNICAL_SUMMARY_ADAPTER_PATH",
                        "ft_technical_summary_llama32_3b",
                    ),
                }
            )
            if self.provider == "local"
            else None
        )
        self.cloud_client = CloudLLMClient(self.provider) if self.provider != "local" else None
        self.default_max_new_tokens = int(os.getenv("LOCAL_MAX_NEW_TOKENS", "256"))
        self.cloud_max_tokens = int(os.getenv("CLOUD_MAX_TOKENS", "512"))

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

        text = tokenizer.apply_chat_template(
            self._build_messages(system_prompt, user_prompt),
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

    def _generate_text(
        self,
        *,
        adapter_name: str,
        cloud_model: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_new_tokens: int | None = None,
    ) -> str:
        if self.provider == "local":
            return self._generate_local(
                adapter_name=adapter_name,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
                max_new_tokens=max_new_tokens,
            )

        model = _first_env(
            cloud_model,
            "TECHNICAL_CLOUD_MODEL",
            "CLOUD_MODEL",
            "AZURE_OPENAI_DEPLOYMENT",
            "OPENAI_MODEL",
            default="gpt-4o-mini",
        )
        return self.cloud_client.generate(
            model=model,
            messages=self._build_messages(system_prompt, user_prompt),
            temperature=temperature,
            max_tokens=max_new_tokens or self.cloud_max_tokens,
        )

    def _generate_json(
        self,
        adapter_name: str,
        system_prompt: str,
        user_prompt: str,
        max_new_tokens: int,
        fallback: dict,
    ) -> dict:
        raw = self._generate_text(
            adapter_name=adapter_name,
            cloud_model=f"{adapter_name.upper()}_CLOUD_MODEL",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.2,
            max_new_tokens=max_new_tokens,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return fallback

        if not isinstance(parsed, dict):
            return fallback

        return parsed

    def rewrite_question(
        self,
        interview_type: str,
        question_text: str,
        previous_answer: str | None = None,
        question_metadata: dict | None = None,
        previous_question: str | None = None,
    ) -> str:
        system_prompt = """
You are a professional interviewer conducting a real job interview.

Task:
Rewrite the original technical interview question into a natural interviewer question.

Rules:
- Keep the original technical intent unchanged.
- Ask exactly one question.
- Keep it short: one sentence is preferred.
- Use the question metadata. If session_question_kind is "BASE", this is a new independent question.
- You may add one short natural bridge before the question.
- For BASE questions, use the previous interview question only to create a truthful transition between topics.
- For BASE questions, do not use the previous candidate answer to judge, praise, correct, or continue the answer.
- If there is no previous interview question, use a short opening bridge or ask the question directly.
- If the topic changes, make the transition explicit instead of pretending the new question is a follow-up.
- If the topic stays close, a light continuity bridge is allowed.
- Do not repeat the same bridge style across questions.
- Remove answer instructions from the original question, such as "Answer at a junior level..." or "Answer at a mid level...".
- Fix obvious grammar mistakes while preserving the technical intent.
- Do not use generic interviewer catchphrases.
- Never praise or judge the candidate.
- No emojis, no filler, no motivational language.
- Use metadata only to improve phrasing precision and realism, not to change topic.
- Return only the interviewer message.

Good bridge styles:
- "Let's start with {topic}: ..."
- "We covered {previous topic}; now let's look at {new topic}: ..."
- "Staying with {technology}, let's move to {topic}: ..."
- "Let's switch to {technology/topic}: ..."
- "For this one, focus on {topic}: ..."

Forbidden openings and fake-continuity phrases:
- "Can we go one level deeper..."
- "Can we go a level deeper..."
- "Let's make that more concrete..."
- "Building on that..."
- "Following up on that..."
- "Based on that..."
- "To go deeper..."
- "Now let's..."
- "Let's discuss..."
        """.strip()

        user_prompt = f"""
Interview type: {interview_type}

Question metadata:
{json.dumps(question_metadata or {}, ensure_ascii=False)}

Previous interview question:
{previous_question or "No previous interview question provided."}

Previous candidate answer:
{previous_answer or "No previous answer provided. If session_question_kind is BASE, ignore this field."}

Original question:
{question_text}
        """.strip()

        return self._generate_text(
            adapter_name="technical_interviewer",
            cloud_model="TECHNICAL_INTERVIEWER_CLOUD_MODEL",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=0.5,
            max_new_tokens=140,
        )

    def evaluate_answer_and_followup(
        self,
        interview_type: str,
        question_text: str,
        answer_text: str,
        history: list[dict] | None = None,
        question_metadata: dict | None = None,
    ) -> dict:
        system_prompt = """
You are a strict but fair technical interviewer.

Evaluate the candidate answer using:
- the current question
- interview history
- structured question metadata (expected concepts, common mistakes, bonus points, type, difficulty)

Return strict JSON only:
{
  "score": 1,
  "feedback": "short feedback",
  "needs_followup": false,
  "followup_question": ""
}

Scoring and follow-up rules:
- score must be integer 1..10.
- If score is 8-10, needs_followup must be false.
- If score is 7, follow-up only if a key point for fair grading is missing.
- If score <= 6, set follow-up true only when one focused clarification can materially improve confidence.
- If session_question_kind is "FOLLOW_UP", needs_followup must be false.
- Only one follow-up is allowed for a base question.
- Follow-up must be natural, concise, neutral, and specific to the current question and candidate answer.
- A follow-up may include one short bridge sentence before the question when it helps the conversation feel human.
- Bridge sentences must be varied, answer-specific, and no longer than 10 words.
- Before writing a bridge, inspect Conversation history and avoid any bridge wording already used in previous follow-up questions.
- Do not repeat the same bridge style within the same interview.
- Prefer a bridge that names the missing point directly instead of a generic clarification phrase.
- The followup_question value must contain exactly one question mark.
- A follow-up must mention the exact missing technical point, trade-off, constraint, risk, or design decision.
- Do not ask broad or generic follow-ups.
- Do not use stock phrases such as "tell me more", "go deeper", "go one level deeper", "go a level deeper", "elaborate", "expand on that", "make that more concrete", "clarify the technical meaning", or "make the definition precise".
- Prefer checking one missing reasoning step, trade-off, constraint, risk, correctness point, or technology-specific detail.
- If you cannot write a specific follow-up tied to the answer, set needs_followup=false and followup_question="".
- Feedback must be varied, concrete, and tied to the actual answer.
- Avoid reusable feedback templates. Do not repeatedly start feedback with the same phrase.
- Mention the main correct point and the most important missing point using words from the current question or answer.
- Keep feedback to one or two short sentences, but do not use the same sentence structure every time.

Forbidden feedback openings:
- "The candidate identified..."
- "The candidate demonstrated..."
- "The answer mentions..."
- "The response shows..."
- "However, they missed..."
- "Good answer, but..."
        """.strip()

        user_prompt = f"""
Interview type: {interview_type}

Question metadata:
{json.dumps(question_metadata or {}, ensure_ascii=False)}

Conversation history:
{json.dumps(history or [], ensure_ascii=False)}

Current question:
{question_text}

Candidate answer:
{answer_text}
        """.strip()

        data = self._generate_json(
            adapter_name="technical_evaluator",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_new_tokens=280,
            fallback={
                "score": 5,
                "feedback": "The answer was received, but evaluation formatting failed.",
                "needs_followup": False,
                "followup_question": "",
            },
        )

        score = data.get("score", 5)
        try:
            score = int(score)
        except (TypeError, ValueError):
            score = 5
        score = max(1, min(10, score))

        followup = str(data.get("followup_question", "")).strip()
        needs_followup = bool(data.get("needs_followup", False))
        question_kind = (question_metadata or {}).get("session_question_kind")
        if score >= 8 or question_kind == "FOLLOW_UP":
            needs_followup = False
            followup = ""
        if not followup:
            needs_followup = False

        return {
            "score": score,
            "feedback": str(data.get("feedback", "")),
            "needs_followup": needs_followup,
            "followup_question": followup,
        }

    def generate_final_session_feedback(
        self,
        interview_type: str,
        qa_pairs: list[dict],
        session_metadata: dict | None = None,
    ) -> dict:
        system_prompt = """
You are a professional interviewer producing a final interview report.

Use the entire transcript and metadata to provide a concise and fair summary.
Return strict JSON only:
{
  "overall_score": 1,
  "summary": "short paragraph",
  "strengths": ["item 1", "item 2"],
  "improvements": ["item 1", "item 2"]
}

Rules:
- overall_score must be integer 1..10.
- strengths/improvements should be specific and interview-grounded.
- Keep summary concise and actionable.
        """.strip()

        user_prompt = f"""
Interview type: {interview_type}
Session metadata:
{json.dumps(session_metadata or {}, ensure_ascii=False)}    

Interview transcript:
{json.dumps(qa_pairs, ensure_ascii=False)}
        """.strip()

        data = self._generate_json(
            adapter_name="technical_summary",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            max_new_tokens=360,
            fallback={
                "overall_score": 5,
                "summary": "Interview completed, but final evaluation formatting failed.",
                "strengths": [],
                "improvements": [],
            },
        )

        overall_score = data.get("overall_score", 5)
        try:
            overall_score = int(overall_score)
        except (TypeError, ValueError):
            overall_score = 5
        overall_score = max(1, min(10, overall_score))

        strengths = data.get("strengths", [])
        if not isinstance(strengths, list):
            strengths = []

        improvements = data.get("improvements", [])
        if not isinstance(improvements, list):
            improvements = []

        return {
            "overall_score": overall_score,
            "summary": str(data.get("summary", "")),
            "strengths": [str(item) for item in strengths],
            "improvements": [str(item) for item in improvements],
        }

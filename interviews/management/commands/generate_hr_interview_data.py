"""
Synthetic Interview Data Generator — Django Management Command
==============================================================
Pune fișierul în:
    interviews/management/commands/generate_interview_data.py

Rulează cu:
    python manage.py generate_interview_data
    python manage.py generate_interview_data --domain HR
    python manage.py generate_interview_data --limit 50

Citește întrebările direct din baza de date Django (modelul Question),
generează transcrieri complete cu GPT-4o via Azure OpenAI,
și salvează rezultatul ca interview_dataset.jsonl gata pentru fine-tuning Qwen 7B.

Instalare dependință:
    pip install openai
"""

import json
import os
import time
from pathlib import Path

from django.core.management.base import BaseCommand
from openai import AzureOpenAI
from dotenv import load_dotenv

from interviews.models import Question          # ← modelul tău Django

# ─────────────────────────────────────────────
# CONFIGURARE AZURE OPENAI
# ─────────────────────────────────────────────

load_dotenv()

AZURE_API_KEY     = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_ENDPOINT    = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_DEPLOYMENT  = "gpt-4o"                                # numele deployment-ului tău
AZURE_API_VERSION = "2024-02-01"

OUTPUT_FILE = "interview_dataset.jsonl"
DELAY_BETWEEN_CALLS = 0.5   # secunde între apeluri API


# ─────────────────────────────────────────────
# PROMPT
# ─────────────────────────────────────────────

def build_prompt(question: str, domain: str, candidate_level: str) -> str:
    return f"""Generate a realistic technical interview transcript in English.

Domain: {domain}
Main question: {question}
Candidate level: {candidate_level}

REQUIRED structure (return ONLY this JSON, nothing else):

{{
  "conversation": [
    {{"role": "interviewer", "content": "..."}},
    {{"role": "candidate",   "content": "..."}},
    {{"role": "interviewer", "content": "..."}},
    {{"role": "candidate",   "content": "..."}},
    {{"role": "interviewer", "content": "..."}},
    {{"role": "candidate",   "content": "..."}}
  ],
  "summary": {{
    "overall_score": <1-10>,
    "strengths":     ["...", "..."],
    "weaknesses":    ["...", "..."],
    "recommendation": "hire | consider | reject",
    "feedback": "2-3 objective sentences about the candidate performance"
  }}
}}

Rules:
- Interviewer asks the main question, then 2 relevant follow-ups
- If level is "weak":   candidate makes concrete mistakes, not just vague answers
- If level is "strong": candidate gives detailed, correct answers
- Return ONLY valid JSON, no text outside the JSON
"""


# ─────────────────────────────────────────────
# CONVERSIE LA FORMAT QWEN (ChatML)
# ─────────────────────────────────────────────

def to_qwen_format(conversation: list, summary: dict, question: str, domain: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": (
                f"You are a professional technical interviewer specializing in {domain}. "
                "Conduct structured interviews, ask follow-up questions to probe deeper understanding, "
                "and provide objective, detailed feedback on candidate performance."
            )
        }
    ]

    for turn in conversation:
        role = "assistant" if turn["role"] == "interviewer" else "user"
        messages.append({"role": role, "content": turn["content"]})

    summary_text = (
        f"\n--- INTERVIEW SUMMARY ---\n"
        f"Score: {summary['overall_score']}/10\n"
        f"Strengths: {', '.join(summary['strengths'])}\n"
        f"Weaknesses: {', '.join(summary['weaknesses'])}\n"
        f"Recommendation: {summary['recommendation'].upper()}\n"
        f"Feedback: {summary['feedback']}"
    )
    messages.append({"role": "assistant", "content": summary_text})

    return {
        "messages": messages,
        "metadata": {
            "domain": domain,
            "base_question": question,
            "score": summary["overall_score"],
            "recommendation": summary["recommendation"],
        }
    }


# ─────────────────────────────────────────────
# GENERARE UN EXEMPLU
# ─────────────────────────────────────────────

def generate_example(client: AzureOpenAI, question: str, domain: str, level: str) -> dict | None:
    try:
        response = client.chat.completions.create(
            model=AZURE_DEPLOYMENT,
            max_tokens=2000,
            response_format={"type": "json_object"},  # forțează JSON valid
            messages=[
                {
                    "role": "system",
                    "content": "You are a data generation assistant. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": build_prompt(question, domain, level)
                }
            ]
        )
        data = json.loads(response.choices[0].message.content.strip())
        return to_qwen_format(data["conversation"], data["summary"], question, domain)

    except Exception:
        return None


# ─────────────────────────────────────────────
# DJANGO MANAGEMENT COMMAND
# ─────────────────────────────────────────────

class Command(BaseCommand):
    help = "Generează dataset sintetic de interviuri din întrebările din DB"

    def add_arguments(self, parser):
        parser.add_argument(
            "--domain",
            type=str,
            default=None,
            help="Filtrează după domeniu/categorie (ex: --domain HR)"
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limitează numărul de întrebări procesate (ex: --limit 50)"
        )

    def handle(self, *args, **options):

        queryset = Question.objects.filter(is_active=True)

        if options["domain"]:
            queryset = queryset.filter(category=options["domain"])
            self.stdout.write(f"🔍 Filtrat după domeniu: {options['domain']}")

        if options["limit"]:
            queryset = queryset[: options["limit"]]
            self.stdout.write(f"🔢 Limitat la {options['limit']} întrebări")

        questions = list(queryset.values("id", "text", "category", "interview_type"))

        if not questions:
            self.stdout.write(self.style.WARNING("⚠️  Nu s-au găsit întrebări active în DB!"))
            return

        self.stdout.write(f"📋 {len(questions)} întrebări găsite în DB\n")

        client = AzureOpenAI(
            api_key=AZURE_API_KEY,
            azure_endpoint=AZURE_ENDPOINT,
            api_version=AZURE_API_VERSION,
        )

        output_path = Path(OUTPUT_FILE)
        levels = ["strong", "weak"]
        total = len(questions) * len(levels)
        generated = 0
        failed = 0

        self.stdout.write(
            f"🚀 Pornesc generarea: {len(questions)} întrebări × {len(levels)} niveluri = {total} exemple\n"
        )

        with open(output_path, "w", encoding="utf-8") as f:
            for i, item in enumerate(questions):
                question_text = item["text"]

                domain = item.get("category") or item.get("interview_type") or "general"

                for level in levels:
                    idx = generated + failed + 1
                    self.stdout.write(
                        f"[{idx}/{total}] {domain} | {level} | {question_text[:55]}..."
                    )

                    example = generate_example(client, question_text, domain, level)

                    if example:
                        f.write(json.dumps(example, ensure_ascii=False) + "\n")
                        generated += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"  ✅ OK  (score: {example['metadata']['score']}/10)"
                            )
                        )
                    else:
                        failed += 1
                        self.stdout.write(self.style.ERROR("  ❌ Eșuat"))

                    time.sleep(DELAY_BETWEEN_CALLS)

                if (i + 1) % 10 == 0:
                    f.flush()
                    self.stdout.write(f"\n💾 Checkpoint: {generated} exemple salvate...\n")

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(
            self.style.SUCCESS(f"✅ GATA!  {generated} exemple generate, {failed} eșuate")
        )
        self.stdout.write(f"📁 Fișier salvat: {output_path.absolute()}")
        self.stdout.write(
            "\nUrmătorul pas: încarcă interview_dataset.jsonl în Google Drive "
            "și folosește-l în notebook-ul de fine-tuning!"
        )
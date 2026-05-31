import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from interviews.models import Question


class Command(BaseCommand):
    help = "Seed technical interview questions from technical_questions_seed.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            dest="file_path",
            default=None,
            help=(
                "Optional path to a JSON seed file. "
                "If omitted, the command looks for technical_questions_seed.json "
                "in the same folder as this command."
            ),
        )

    def handle(self, *args, **kwargs):
        file_path = kwargs.get("file_path")

        if file_path:
            seed_path = Path(file_path)
        else:
            seed_path = Path(__file__).resolve().parent / "technical_questions_seed.json"

        if not seed_path.exists():
            raise CommandError(f"Seed file not found: {seed_path}")

        try:
            questions = json.loads(seed_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON file: {exc}") from exc

        if not isinstance(questions, list):
            raise CommandError("Seed file must contain a JSON list of questions.")

        required_fields = {
            "text",
            "track",
            "technology",
            "difficulty",
            "question_type",
            "expected_concepts",
            "common_mistakes",
            "bonus_points",
        }

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for index, item in enumerate(questions, start=1):
            if not isinstance(item, dict):
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipped item #{index}: expected a JSON object."
                    )
                )
                continue

            missing_fields = required_fields - set(item.keys())

            if missing_fields:
                skipped_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Skipped item #{index}: missing fields {sorted(missing_fields)}."
                    )
                )
                continue

            _, created = Question.objects.update_or_create(
                text=item["text"],
                defaults={
                    "interview_type": "TECHNICAL",
                    "track": item["track"],
                    "technology": item["technology"],
                    "difficulty": item["difficulty"],
                    "question_type": item["question_type"],
                    "expected_concepts": item.get("expected_concepts", []),
                    "common_mistakes": item.get("common_mistakes", []),
                    "bonus_points": item.get("bonus_points", []),
                    "is_active": item.get("is_active", True),
                },
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! {created_count} technical questions added, "
                f"{updated_count} updated, "
                f"{skipped_count} skipped. "
                f"Total read from file: {len(questions)}."
            )
        )
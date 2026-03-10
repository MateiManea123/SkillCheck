from django.core.management.base import BaseCommand
from interviews.models import Question


HR_QUESTIONS = [
    "Tell me about yourself.",
    "Why do you want to work for this company?",
    "What are your biggest strengths?",
    "What are your biggest weaknesses?",
    "Where do you see yourself in 5 years?",
    "Why did you choose your field of study?",
    "Describe a challenging situation you faced and how you handled it.",
    "Tell me about a time you worked in a team.",
    "How do you handle stress or pressure?",
    "What motivates you at work?",
    "Describe a time when you had a conflict with a colleague.",
    "How do you prioritize tasks when you have multiple deadlines?",
    "What does success mean to you?",
    "Tell me about a failure and what you learned from it.",
    "Why should we hire you?",
    "What kind of work environment do you prefer?",
    "How do you handle feedback or criticism?",
    "Describe a time you showed leadership.",
    "What are your salary expectations?",
    "What do you know about our company?",
    "Tell me about a time you had to learn something quickly.",
    "How do you stay organized?",
    "What are your career goals?",
    "Describe a time when you had to adapt to change.",
    "How do you deal with difficult coworkers?",
    "Tell me about a time you solved a problem creatively.",
    "What are you passionate about?",
    "How do you handle tight deadlines?",
    "Describe your ideal manager.",
    "What do you expect from this role?",
    "Tell me about a time you made a mistake at work.",
    "How do you manage your time effectively?",
    "Describe a situation where you had to take initiative.",
    "What are your hobbies or interests?",
    "How do you handle constructive criticism?",
    "Tell me about a time you had to persuade someone.",
    "How do you define teamwork?",
    "What skills are you currently trying to improve?",
    "Describe a time when you helped a colleague.",
    "How do you approach learning new skills?",
    "What would you do in your first 30 days in this role?",
    "Tell me about a time when you had to meet a difficult deadline.",
    "How do you stay motivated during repetitive tasks?",
    "What do you consider your greatest professional achievement?",
    "Describe a situation where you disagreed with your manager.",
    "How do you deal with uncertainty?",
    "What values are most important to you at work?",
    "Tell me about a time you exceeded expectations.",
    "How do you handle multiple responsibilities?",
    "What do you hope to learn in your next role?",
]


class Command(BaseCommand):
    help = "Seed 50 HR interview questions"

    def handle(self, *args, **kwargs):
        created_count = 0

        for q in HR_QUESTIONS:
            _, created = Question.objects.get_or_create(
                text=q,
                defaults={
                    "interview_type": "HR",
                    "category": "HR",
                    "difficulty": None,
                    "is_active": True,
                }
            )

            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded {created_count} HR questions.")
        )
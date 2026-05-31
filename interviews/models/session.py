from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Session(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("FINISHED", "Finished"),
    )

    INTERVIEW_TYPE_CHOICES = (
        ("TECHNICAL", "Technical"),
        ("HR", "HR"),
    )

    ROLE_CHOICES = (
        ("FRONTEND", "Frontend"),
        ("BACKEND", "Backend"),
        ("FULLSTACK", "Fullstack"),
    )

    LEVEL_CHOICES = (
        ("JUNIOR", "Junior"),
        ("MID", "Mid"),
        ("SENIOR", "Senior"),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions",
        null=True,
        blank=True,
    )
    interview_type = models.CharField(
        max_length=20,
        choices=INTERVIEW_TYPE_CHOICES,
        default="TECHNICAL"
    )

    # Pentru TECHNICAL, role îl tratăm ca track:
    # FRONTEND / BACKEND / FULLSTACK
    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        null=True,
        blank=True
    )

    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        null=True,
        blank=True
    )

    # Tehnologiile alese de user pentru interviul tehnic.
    # Exemple:
    # ["HTML", "CSS", "JAVASCRIPT"]
    # ["REACT", "JAVASCRIPT"]
    # ["PYTHON", "DJANGO", "SQL"]
    selected_technologies = models.JSONField(
        default=list,
        blank=True
    )

    # HR = 5 întrebări
    # TECHNICAL = 10 întrebări
    question_count = models.PositiveSmallIntegerField(
        default=5
    )

    current_index = models.PositiveIntegerField(default=0)

    final_overall_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True
    )

    final_ai_feedback = models.JSONField(
        null=True,
        blank=True
    )

    final_feedback_generated_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def clean(self):
        if self.interview_type == "HR":
            self.role = None
            self.level = None
            self.selected_technologies = []
            self.question_count = 5

        elif self.interview_type == "TECHNICAL":
            if not self.role:
                raise ValidationError("Technical session must have a role.")

            if not self.level:
                raise ValidationError("Technical session must have a level.")

            if not self.selected_technologies:
                raise ValidationError(
                    "Technical session must have at least one selected technology."
                )

            self.question_count = 10

            if self.question_count < 1:
                raise ValidationError("Question count must be at least 1.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Session {self.id} ({self.interview_type})"

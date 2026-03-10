from django.core.exceptions import ValidationError
from django.db import models


class Question(models.Model):
    INTERVIEW_TYPE_CHOICES = (
        ("TECHNICAL", "Technical"),
        ("HR", "HR"),
    )

    DIFFICULTY_CHOICES = (
        ("JUNIOR", "Junior"),
        ("MID", "Mid"),
        ("SENIOR", "Senior"),
    )

    CATEGORY_CHOICES = (
        ("HTML", "HTML"),
        ("CSS", "CSS"),
        ("JAVASCRIPT", "JavaScript"),
        ("REACT", "React"),
        ("GENERAL", "General"),
        ("HR", "HR"),
    )

    text = models.TextField()
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPE_CHOICES, default="TECHNICAL")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="GENERAL")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.interview_type == "HR":
            self.difficulty = None
            self.category = "HR"

        if self.interview_type == "TECHNICAL" and not self.difficulty:
            raise ValidationError("Technical questions must have a difficulty.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.text[:60]


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
    )

    LEVEL_CHOICES = (
        ("JUNIOR", "Junior"),
        ("MID", "Mid"),
        ("SENIOR", "Senior"),
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")
    interview_type = models.CharField(max_length=20, choices=INTERVIEW_TYPE_CHOICES, default="TECHNICAL")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, null=True, blank=True)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, null=True, blank=True)
    current_index = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def clean(self):
        if self.interview_type == "HR":
            self.role = None
            self.level = None

        elif self.interview_type == "TECHNICAL":
            if not self.role:
                raise ValidationError("Technical session must have a role.")
            if not self.level:
                raise ValidationError("Technical session must have a level.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Session {self.id} ({self.interview_type})"


class SessionQuestion(models.Model):
    QUESTION_KIND_CHOICES = (
        ("BASE", "Base"),
        ("FOLLOW_UP", "Follow-up"),
    )

    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="session_questions"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="session_questions",
        null=True,
        blank=True
    )
    order = models.PositiveIntegerField()
    question_kind = models.CharField(max_length=20, choices=QUESTION_KIND_CHOICES, default="BASE")
    display_text = models.TextField(null=True, blank=True)
    parent_session_question = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="followups"
    )
    created_by_ai = models.BooleanField(default=False)

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(
                fields=["session", "order"],
                name="unique_question_order_per_session"
            ),
            models.UniqueConstraint(
                fields=["session", "question"],
                name="unique_question_per_session"
            ),
        ]

    def __str__(self):
        return f"Session {self.session_id} - order {self.order}"


class Answer(models.Model):
    session_question = models.OneToOneField(
        SessionQuestion,
        on_delete=models.CASCADE,
        related_name="answer"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Answer(session_question={self.session_question_id})"
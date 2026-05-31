from django.core.exceptions import ValidationError
from django.db import models


class Question(models.Model):
    INTERVIEW_TYPE_CHOICES = (
        ("TECHNICAL", "Technical"),
        ("HR", "HR"),
    )

    TRACK_CHOICES = (
        ("FRONTEND", "Frontend"),
        ("BACKEND", "Backend"),
        ("FULLSTACK", "Fullstack"),
        ("GENERAL", "General"),
    )

    TECHNOLOGY_CHOICES = (
        ("HTML", "HTML"),
        ("CSS", "CSS"),
        ("JAVASCRIPT", "JavaScript"),
        ("TYPESCRIPT", "TypeScript"),
        ("REACT", "React"),
        ("PYTHON", "Python"),
        ("DJANGO", "Django"),
        ("REST_API", "REST API"),
        ("SQL", "SQL"),
        ("AUTHENTICATION", "Authentication"),
        ("SECURITY", "Security"),
        ("TESTING", "Testing"),
        ("PERFORMANCE", "Performance"),
        ("ACCESSIBILITY", "Accessibility"),
        ("GENERAL", "General"),
        ("HR", "HR"),
    )

    QUESTION_TYPE_CHOICES = (
        ("CONCEPTUAL", "Conceptual"),
        ("PRACTICAL", "Practical"),
        ("DEBUGGING", "Debugging"),
        ("ARCHITECTURE", "Architecture"),
        ("PERFORMANCE", "Performance"),
        ("SECURITY", "Security"),
        ("TRADE_OFF", "Trade-off"),
    )

    DIFFICULTY_CHOICES = (
        ("JUNIOR", "Junior"),
        ("MID", "Mid"),
        ("SENIOR", "Senior"),
    )

    text = models.TextField()

    interview_type = models.CharField(
        max_length=20,
        choices=INTERVIEW_TYPE_CHOICES,
        default="TECHNICAL",
    )

    track = models.CharField(
        max_length=30,
        choices=TRACK_CHOICES,
        null=True,
        blank=True,
    )

    technology = models.CharField(
        max_length=50,
        choices=TECHNOLOGY_CHOICES,
        default="GENERAL",
    )

    question_type = models.CharField(
        max_length=50,
        choices=QUESTION_TYPE_CHOICES,
        default="CONCEPTUAL",
    )

    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        null=True,
        blank=True,
    )

    expected_concepts = models.JSONField(default=list, blank=True)
    common_mistakes = models.JSONField(default=list, blank=True)
    bonus_points = models.JSONField(default=list, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.interview_type == "HR":
            self.difficulty = None
            self.track = None
            self.technology = "HR"
            self.question_type = "CONCEPTUAL"

        if self.interview_type == "TECHNICAL":
            if not self.difficulty:
                raise ValidationError("Technical questions must have a difficulty.")
            if not self.track:
                raise ValidationError("Technical questions must have a track.")
            if not self.technology:
                raise ValidationError("Technical questions must have a technology.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.text[:60]
    
        

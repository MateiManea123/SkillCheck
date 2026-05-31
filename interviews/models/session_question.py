from django.db import models

from .question import Question
from .session import Session


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

from django.db import models


class Answer(models.Model):
    session_question = models.OneToOneField(
        "SessionQuestion",
        on_delete=models.CASCADE,
        related_name="answer"
    )
    text = models.TextField()
    ai_score = models.PositiveSmallIntegerField(null=True, blank=True)
    ai_feedback = models.TextField(null=True, blank=True)
    ai_needs_followup = models.BooleanField(default=False)
    ai_followup_question = models.TextField(null=True, blank=True)
    ai_evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Answer(session_question={self.session_question_id})"

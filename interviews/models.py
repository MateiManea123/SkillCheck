from django.db import models

# Create your models here.
class Question(models.Model):
    text = models.TextField()
    is_active = models.BooleanField(default=True)

class Session(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("FINISHED", "Finished")
    )

    status = models.CharField(max_length=100,choices=STATUS_CHOICES, default="ACTIVE")
    current_index = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True,blank=True)

class SessionQuestion(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    session = models.ForeignKey(Session,on_delete=models.CASCADE,related_name="session_questions")
    order = models.PositiveIntegerField()
    def __str__(self):
        return f"Session {self.session_id} - order {self.order} - Q{self.question.text[:30]}"

class Answer(models.Model):
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="answers"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    unique_together = ("session", "question")

    def __str__(self):
        return f"Answer(session={self.session_id}, question={self.question_id})"


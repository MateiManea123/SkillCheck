import json

from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import render
from django.db import transaction
from django.db.models import F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from interviews.models import Session,Question,SessionQuestion,Answer
import random
from .services.ai_interviewer import AIInterviewService


_AI_SERVICE: AIInterviewService | None = None


def get_ai_service() -> AIInterviewService:
    global _AI_SERVICE
    if _AI_SERVICE is None:
        _AI_SERVICE = AIInterviewService()
    return _AI_SERVICE


def _build_questions_data(my_session: Session) -> list[dict]:
    session_questions = SessionQuestion.objects.filter(session=my_session).order_by("order")
    questions_data = []
    for session_question in session_questions:
        answer = Answer.objects.filter(session_question=session_question).first()
        questions_data.append(
            {
                "question_text": session_question.display_text or (session_question.question.text if session_question.question else ""),
                "answer_text": answer.text if answer else None,
                "ai_score": answer.ai_score if answer else None,
                "ai_feedback": answer.ai_feedback if answer else None,
                "ai_needs_followup": answer.ai_needs_followup if answer else None,
                "ai_followup_question": answer.ai_followup_question if answer else None,
            }
        )
    return questions_data


def _ensure_final_feedback(my_session: Session) -> dict | None:
    if my_session.status != "FINISHED":
        return None

    if my_session.final_ai_feedback:
        return my_session.final_ai_feedback

    ai = get_ai_service()
    questions_data = _build_questions_data(my_session)
    ai_feedback = ai.generate_final_session_feedback(
        interview_type=my_session.interview_type,
        qa_pairs=questions_data,
    )

    my_session.final_ai_feedback = ai_feedback
    my_session.final_overall_score = ai_feedback.get("overall_score")
    my_session.final_feedback_generated_at = timezone.now()
    my_session.save(update_fields=["final_ai_feedback", "final_overall_score", "final_feedback_generated_at"])

    return ai_feedback

def homepage(request):
    return render(request, 'home.html')
    # return HttpResponse("Hello, world. You're at the polls page.")
def about(request):
     return HttpResponse("Hello, world. You're at the about page.")

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_session(request):
    interview_type = request.data.get("interview_type")
    role = request.data.get("role")
    level = request.data.get("level")
    new_session =Session.objects.create(
        user=request.user,
        status="ACTIVE",
        interview_type=interview_type,
        role=role,
        level=level,
        current_index=0
        )

    if interview_type == "HR":
        questions = Question.objects.filter(
            is_active=True,
            interview_type="HR"
        )
    else:
        questions = Question.objects.filter(
            is_active=True,
            interview_type="TECHNICAL",
            difficulty=level
        )
    random_questions = random.sample(list(questions), min(len(questions), 5))
    if not random_questions:
        return Response("No active questions available to start a session",status=status.HTTP_400_BAD_REQUEST)
    for index, question in enumerate(random_questions):
        SessionQuestion.objects.create(
            question=question,
            session=new_session,
            order=index
        )

    return Response({"session_id": new_session.id , "total_questions": len(random_questions)},status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    sessions = (
        Session.objects.filter(user=request.user)
        .order_by("-created_at")
        .values(
            "id",
            "status",
            "interview_type",
            "role",
            "level",
            "created_at",
            "ended_at",
            "final_overall_score",
        )
    )
    return Response(list(sessions), status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def current_question(request,session_id):
    my_session = Session.objects.filter(id=session_id, user=request.user).first()
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)
    if my_session.status != "ACTIVE":
        return Response("Session is not active",status=status.HTTP_400_BAD_REQUEST)
    
    current_index = my_session.current_index

    previous_answer = None
    previous_sq = my_session.session_questions.filter(order=my_session.current_index - 1).first()
    if previous_sq and hasattr(previous_sq, "answer"):
        previous_answer = previous_sq.answer.text


    session_questions = my_session.session_questions.order_by("order")
    
    if current_index >= session_questions.count():
        return Response("No more questions in this session",status=status.HTTP_400_BAD_REQUEST)
    print(current_index)
    
    try:
        session_question = my_session.session_questions.get(order=my_session.current_index)
    except SessionQuestion.DoesNotExist:
        return Response({"error": "No current question"}, status=status.HTTP_404_NOT_FOUND)

    if not session_question.display_text:
        ai = get_ai_service()
        if session_question.question:
            original_text = session_question.question.text
            rewritten = ai.rewrite_question(my_session.interview_type, original_text,previous_answer)
            session_question.display_text = rewritten
            session_question.save(update_fields=["display_text"])
        else:
            original_text = session_question.display_text or ""

    

    return Response({
        "session_id": my_session.id,
        "order": session_question.order,
        "question_kind": session_question.question_kind,
        "question_text": session_question.display_text or session_question.question.text,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answer(request,session_id):
    my_session = Session.objects.filter(id=session_id, user=request.user).first()
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)
    if my_session.status != "ACTIVE":
        return Response("Session is not active",status=status.HTTP_400_BAD_REQUEST)
    
    current_index = my_session.current_index
    session_questions = my_session.session_questions.order_by("order")
    
    if current_index >= session_questions.count():
        return Response("No more questions in this session",status=status.HTTP_400_BAD_REQUEST)
    
    current_question = session_questions[current_index]
    
    answer_text = request.data.get("answer")
    
    if not answer_text:
        return Response("Answer text is required",status=status.HTTP_400_BAD_REQUEST)
    
    answer, created = Answer.objects.update_or_create(
        session_question=current_question,
        defaults={"text": answer_text}
    )
    question_text = current_question.display_text or (current_question.question.text if current_question.question else "")

    ai = get_ai_service()
    ai_result = ai.evaluate_answer_and_followup(
        interview_type=my_session.interview_type,
        question_text=question_text,
        answer_text=answer.text,
    )
    
    with transaction.atomic():
        answer.ai_score = ai_result.get("score")
        answer.ai_feedback = ai_result.get("feedback")
        answer.ai_needs_followup = ai_result.get("needs_followup", False)
        answer.ai_followup_question = ai_result.get("followup_question", "")
        answer.ai_evaluated_at = timezone.now()
        answer.save(update_fields=[
            "ai_score",
            "ai_feedback",
            "ai_needs_followup",
            "ai_followup_question",
            "ai_evaluated_at",
        ])

        has_followup_already = current_question.followups.exists()
        followup_text = ai_result.get("followup_question", "").strip()

        if (
            current_question.question_kind == "BASE"
            and ai_result.get("needs_followup")
            and not has_followup_already
            and followup_text
        ):
            later_questions = SessionQuestion.objects.filter(
                session=my_session,
                order__gt=current_question.order
            )

            later_questions.update(order=F("order") + 1000)
            later_questions.update(order=F("order") - 999)

            SessionQuestion.objects.create(
                session=my_session,
                question=None,
                order=current_question.order + 1,
                question_kind="FOLLOW_UP",
                display_text=followup_text,
                parent_session_question=current_question,
            )
        my_session.current_index += 1
        
        total_questions = my_session.session_questions.count()
        
        if my_session.current_index >= total_questions:
            my_session.status = "FINISHED"
            my_session.ended_at = timezone.now()

        my_session.save(update_fields=["current_index", "status", "ended_at"])

    if my_session.status == "FINISHED":
        _ensure_final_feedback(my_session)


    
    return Response({
        "message": "Answer saved",
        "score": ai_result.get("score"),
        "feedback": ai_result.get("feedback"),
        "needs_followup": ai_result.get("needs_followup", False),
        "session_status": my_session.status,
        "next_index": my_session.current_index,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def end_session(request, session_id):
    try:
        my_session = Session.objects.get(id=session_id, user=request.user)
    except Session.DoesNotExist:
        return Response("Session not found", status=status.HTTP_404_NOT_FOUND)

    if my_session.status == "FINISHED":
        return Response(
            {
                "message": "Session already finished",
                "session_status": my_session.status,
                "session_id": my_session.id,
            },
            status=status.HTTP_200_OK,
        )

    my_session.status = "FINISHED"
    my_session.ended_at = timezone.now()
    my_session.save(update_fields=["status", "ended_at"])

    _ensure_final_feedback(my_session)

    return Response(
        {
            "message": "Session ended",
            "session_status": my_session.status,
            "session_id": my_session.id,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_details(request,session_id):
    my_session = Session.objects.filter(id=session_id, user=request.user).first()
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)

    questions_data = _build_questions_data(my_session)
    ai_feedback = _ensure_final_feedback(my_session)

    session_data = {
        "session_id": session_id,
        "status": my_session.status,
        "created_at": my_session.created_at,
        "ended_at": my_session.ended_at,
        "questions": questions_data,
        "ai_feedback": ai_feedback
    }
    return Response(session_data,status=status.HTTP_200_OK)

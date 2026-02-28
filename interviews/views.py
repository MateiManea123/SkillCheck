import json

from django.utils import timezone
from django.http import HttpResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from interviews.models import Session,Question,SessionQuestion,Answer
import random


def homepage(request):
    return render(request, 'home.html')
    # return HttpResponse("Hello, world. You're at the polls page.")
def about(request):
     return HttpResponse("Hello, world. You're at the about page.")

@api_view(["POST"])
def start_session(request):
    questions = Question.objects.filter(is_active=True)
    new_session =Session.objects.create(status="ACTIVE",current_index=0)
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
def current_question(request,session_id):
    my_session = Session.objects.get(id=session_id)
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)
    if my_session.status != "ACTIVE":
        return Response("Session is not active",status=status.HTTP_400_BAD_REQUEST)
    
    current_index = my_session.current_index

    session_questions = my_session.session_questions.order_by("order")

    if current_index >= session_questions.count():
        return Response("No more questions in this session",status=status.HTTP_400_BAD_REQUEST)
    print(current_index)
    current_question = session_questions[current_index].question

    return Response({"question_id":current_question.id,"question_text":current_question.text},status=status.HTTP_200_OK)


@api_view(["POST"])
def submit_answer(request,session_id):
    my_session = Session.objects.get(id=session_id)
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)
    if my_session.status != "ACTIVE":
        return Response("Session is not active",status=status.HTTP_400_BAD_REQUEST)
    current_index = my_session.current_index
    session_questions = my_session.session_questions.order_by("order")
    if current_index >= session_questions.count():
        return Response("No more questions in this session",status=status.HTTP_400_BAD_REQUEST)
    current_question = session_questions[current_index].question
    answer_text = request.data.get("answer")
    if not answer_text:
        return Response("Answer text is required",status=status.HTTP_400_BAD_REQUEST)
    Answer.objects.create(
        session=my_session,
        question=current_question,
        text=answer_text
    )
    
    my_session.current_index += 1
    if my_session.current_index >= session_questions.count():
        my_session.status = "FINISHED"
        my_session.ended_at = timezone.now()
    my_session.save()
    return Response("Answer submitted successfully",status=status.HTTP_200_OK)


@api_view(["GET"])
def session_details(request,session_id):
    my_session = Session.objects.get(id=session_id)
    if not my_session:
        return Response("Session not found",status=status.HTTP_404_NOT_FOUND)
    session_questions = my_session.session_questions.order_by("order")
    questions_data = []
    for session_question in session_questions:
        question = session_question.question
        answer = Answer.objects.filter(session=my_session, question=question).first()
        questions_data.append({
            "question_id": question.id,
            "question_text": question.text,
            "answer_text": answer.text if answer else None
        })
    session_data = {
        "session_id": my_session.id,
        "status": my_session.status,
        "created_at": my_session.created_at,
        "ended_at": my_session.ended_at,
        "questions": questions_data
    }
    return Response(session_data,status=status.HTTP_200_OK)
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from interviews.models import Question, SessionQuestion

User = get_user_model()


class AuthFlowTests(APITestCase):
    def test_register_returns_tokens_and_user(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "ana@example.com",
                "password": "strongpass123",
                "password_confirm": "strongpass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "ana@example.com")

    def test_login_works_with_email(self):
        User.objects.create_user(email="matei@example.com", password="strongpass123")

        response = self.client.post(
            "/api/auth/login/",
            {"email": "matei@example.com", "password": "strongpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["email"], "matei@example.com")

    def test_me_requires_authentication(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_authenticated_user(self):
        user = User.objects.create_user(email="alex@example.com", password="strongpass123")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "alex@example.com")


class InterviewAuthorizationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="owner@example.com", password="strongpass123")
        Question.objects.create(
            text="Explain event delegation.",
            interview_type="TECHNICAL",
            track="FRONTEND",
            technology="JAVASCRIPT",
            question_type="CONCEPTUAL",
            difficulty="JUNIOR",
            is_active=True,
        )
        Question.objects.create(
            text="Tell me about a conflict at work.",
            interview_type="HR",
            is_active=True,
        )

    def test_start_session_requires_authentication(self):
        response = self.client.post(
            "/api/sessions/",
            {"interview_type": "TECHNICAL", "role": "FRONTEND", "level": "JUNIOR"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_start_session_uses_authenticated_user(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/sessions/",
            {
                "interview_type": "TECHNICAL",
                "role": "FRONTEND",
                "level": "JUNIOR",
                "selected_technologies": ["JAVASCRIPT"],
                "question_types": ["CONCEPTUAL"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.sessions.count(), 1)

    def test_technical_start_requires_selected_technologies_and_question_types(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/sessions/",
            {"interview_type": "TECHNICAL", "role": "FRONTEND", "level": "JUNIOR"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_technical_start_filters_questions_by_user_choices(self):
        self.client.force_authenticate(user=self.user)
        Question.objects.create(
            text="Explain useEffect dependency arrays.",
            interview_type="TECHNICAL",
            track="FRONTEND",
            technology="REACT",
            question_type="PRACTICAL",
            difficulty="JUNIOR",
            is_active=True,
        )
        Question.objects.create(
            text="What is SQL indexing?",
            interview_type="TECHNICAL",
            track="BACKEND",
            technology="SQL",
            question_type="CONCEPTUAL",
            difficulty="JUNIOR",
            is_active=True,
        )

        response = self.client.post(
            "/api/sessions/",
            {
                "interview_type": "TECHNICAL",
                "role": "FRONTEND",
                "level": "JUNIOR",
                "selected_technologies": ["REACT"],
                "question_types": ["PRACTICAL"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session_id = response.data["session_id"]
        session_questions = SessionQuestion.objects.filter(session_id=session_id).select_related("question")
        self.assertGreaterEqual(session_questions.count(), 1)
        self.assertTrue(all(sq.question.track == "FRONTEND" for sq in session_questions))
        self.assertTrue(all(sq.question.technology == "REACT" for sq in session_questions))
        self.assertTrue(all(sq.question.question_type == "PRACTICAL" for sq in session_questions))

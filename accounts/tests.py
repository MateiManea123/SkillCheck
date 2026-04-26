from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from interviews.models import Question

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
            category="JAVASCRIPT",
            difficulty="JUNIOR",
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
            {"interview_type": "TECHNICAL", "role": "FRONTEND", "level": "JUNIOR"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.sessions.count(), 1)

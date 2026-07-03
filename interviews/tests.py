import os
from unittest.mock import patch

from django.test import SimpleTestCase

from interviews.services.ai_interviewer import AIInterviewService, LocalAdapterManager, TechnicalAIInterviewService


class LocalAdapterManagerTests(SimpleTestCase):
    def test_resolves_adapter_folder_names_inside_services_adapters(self):
        manager = LocalAdapterManager(
            adapter_paths={"interviewer": "ft_interviewer_llama32_3b"}
        )

        self.assertTrue(manager.adapters["interviewer"].endswith(
            os.path.join("interviews", "services", "adapters", "ft_interviewer_llama32_3b")
        ))

    @patch.dict(os.environ, {"TECHNICAL_LLM_PROVIDER": "local"})
    def test_technical_service_uses_technical_local_adapters(self):
        service = TechnicalAIInterviewService()

        adapter_folders = {
            name: os.path.basename(path)
            for name, path in service.local_manager.adapters.items()
        }

        self.assertEqual(
            adapter_folders,
            {
                "technical_interviewer": "ft_technical_interviewer_llama32_3b",
                "technical_evaluator": "ft_technical_evaluator_llama32_3b",
                "technical_summary": "ft_technical_summary_llama32_3b",
            },
        )

    @patch("interviews.services.ai_interviewer.CloudLLMClient")
    @patch.dict(os.environ, {"HR_LLM_PROVIDER": "cloud", "CLOUD_LLM_PROVIDER": "azure"})
    def test_hr_service_can_use_cloud_provider_from_env(self, cloud_client):
        service = AIInterviewService()

        self.assertEqual(service.provider, "cloud")
        self.assertIsNone(service.local_manager)
        cloud_client.assert_called_once_with("cloud")

    @patch("interviews.services.ai_interviewer.CloudLLMClient")
    @patch.dict(os.environ, {"TECHNICAL_LLM_PROVIDER": "openai"})
    def test_technical_service_can_use_cloud_provider_from_env(self, cloud_client):
        service = TechnicalAIInterviewService()

        self.assertEqual(service.provider, "openai")
        self.assertIsNone(service.local_manager)
        cloud_client.assert_called_once_with("openai")

    @patch.dict(os.environ, {"TECHNICAL_LLM_PROVIDER": "local"})
    def test_technical_question_prompt_allows_truthful_context_bridge(self):
        service = TechnicalAIInterviewService()
        captured = {}

        def capture_generation(**kwargs):
            captured.update(kwargs)
            return "How would you handle cache invalidation?"

        service._generate_local = capture_generation

        service.rewrite_question(
            interview_type="TECHNICAL",
            question_text="How would you handle cache invalidation?",
            previous_answer=None,
            question_metadata={"session_question_kind": "BASE"},
            previous_question="What is HTTP caching used for?",
        )

        self.assertIn(
            'If session_question_kind is "BASE", this is a new independent question.',
            captured["system_prompt"],
        )
        self.assertIn(
            "use the previous interview question only to create a truthful transition",
            captured["system_prompt"],
        )
        self.assertIn("Previous interview question:", captured["user_prompt"])
        self.assertIn("What is HTTP caching used for?", captured["user_prompt"])
        self.assertIn("Remove answer instructions", captured["system_prompt"])
        self.assertIn(
            '"Can we go one level deeper..."',
            captured["system_prompt"],
        )

    @patch.dict(os.environ, {"TECHNICAL_LLM_PROVIDER": "local"})
    def test_technical_evaluator_prompt_forbids_stock_followups_and_feedback(self):
        service = TechnicalAIInterviewService()
        captured = {}

        def capture_json(**kwargs):
            captured.update(kwargs)
            return {
                "score": 6,
                "feedback": "Pagination stability is missing from the answer.",
                "needs_followup": True,
                "followup_question": "How would you keep sorting stable across paginated results?",
            }

        service._generate_json = capture_json

        service.evaluate_answer_and_followup(
            interview_type="TECHNICAL",
            question_text="What are the limitations of sorting in REST APIs?",
            answer_text="Sorting can be slow on unindexed fields.",
        )

        self.assertIn(
            "A follow-up must mention the exact missing technical point",
            captured["system_prompt"],
        )
        self.assertIn(
            "avoid any bridge wording already used in previous follow-up questions",
            captured["system_prompt"],
        )
        self.assertIn(
            '"go one level deeper"',
            captured["system_prompt"],
        )
        self.assertIn(
            '"The candidate identified..."',
            captured["system_prompt"],
        )

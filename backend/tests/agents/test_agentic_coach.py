"""
Comprehensive tests for the Agentic Coach Agent implementation.
Tests the agent's ability to provide coaching feedback and find learning resources.
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

from langchain_core.language_models.fake_chat_models import FakeListChatModel
from backend.agents.agentic_coach import AgenticCoachAgent
from backend.agents.tools.search_tool import LearningResourceSearchTool
from backend.services.llm_service import LLMService
from backend.services.search_service import SearchService, Resource
from backend.utils.event_bus import EventBus


class TestAgenticCoachAgent:
    """Test suite for the agentic coach agent."""
    
    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service for testing."""
        mock_service = Mock(spec=LLMService)
        json_resp = json.dumps({
            "score": 8,
            "strengths": ["Clear explanation of algorithms"],
            "weaknesses": ["Could discuss time complexity in more depth"],
            "feedback": "Great question about sorting algorithms! You mentioned bubble sort and quicksort.",
            "patterns_tendencies": "You demonstrated technical honesty and structured thinking.",
            "improvement_focus_areas": ["Study fundamental algorithms", "Practice Big O complexity analysis"],
            "recommended_resources": [
                {
                    "title": "Python Algorithms Tutorial",
                    "url": "https://realpython.com/python-algorithms/",
                    "description": "Comprehensive guide to implementing algorithms in Python.",
                    "resource_type": "tutorial"
                }
            ]
        })
        text_resp = "Great question about sorting algorithms! You mentioned bubble sort, and for senior roles quicksort or mergesort are ideal."
        mock_service.get_llm.return_value = FakeListChatModel(responses=[text_resp, json_resp] * 20)
        return mock_service
    
    @pytest.fixture
    def mock_search_service(self):
        """Mock search service for testing."""
        mock_service = Mock(spec=SearchService)
        
        sample_resources = [
            Resource(
                title="Python Basics Tutorial",
                url="https://realpython.com/python-basics/",
                description="Learn Python programming fundamentals with practical examples.",
                resource_type="tutorial",
                source="search",
                relevance_score=0.85,
                metadata={"domain_quality": "top"}
            ),
            Resource(
                title="Python Documentation",
                url="https://docs.python.org/3/tutorial/",
                description="Official Python tutorial and documentation.",
                resource_type="documentation",
                source="search",
                relevance_score=0.90,
                metadata={"domain_quality": "top"}
            )
        ]
        
        mock_service.search_resources = AsyncMock(return_value=sample_resources)
        return mock_service
    
    @pytest.fixture
    def mock_event_bus(self):
        """Mock event bus for testing."""
        return Mock(spec=EventBus)
    
    @pytest.fixture
    def sample_conversation_history(self):
        """Sample conversation history for testing."""
        return [
            {
                "role": "assistant",
                "agent": "interviewer", 
                "content": "Can you explain how you would implement a sorting algorithm?",
                "timestamp": "2024-01-01T10:00:00"
            },
            {
                "role": "user",
                "content": "Um, I think I would use bubble sort because it's simple...",
                "timestamp": "2024-01-01T10:01:00"
            },
            {
                "role": "assistant",
                "agent": "interviewer",
                "content": "Tell me about a challenging project you worked on.",
                "timestamp": "2024-01-01T10:02:00"
            },
            {
                "role": "user", 
                "content": "I worked on a web application but I don't remember much about the technical details.",
                "timestamp": "2024-01-01T10:03:00"
            }
        ]
    
    @pytest.fixture
    def agentic_coach(self, mock_llm_service, mock_search_service, mock_event_bus):
        """Create an agentic coach agent for testing."""
        coach = AgenticCoachAgent(
            llm_service=mock_llm_service,
            search_service=mock_search_service,
            event_bus=mock_event_bus,
            resume_content="Python developer with 2 years experience",
            job_description="Senior Python Developer position"
        )
        return coach
    
    def test_initialization(self, agentic_coach, mock_search_service):
        """Test that the agentic coach initializes correctly."""
        assert agentic_coach.search_service == mock_search_service
        assert agentic_coach.resume_content == "Python developer with 2 years experience"
        assert agentic_coach.job_description == "Senior Python Developer position"
        assert isinstance(agentic_coach.search_tool, LearningResourceSearchTool)
    
    def test_evaluate_answer_with_agentic_response(self, agentic_coach, sample_conversation_history):
        """Test answer evaluation using the coach agent."""
        result = agentic_coach.evaluate_answer(
            question="Can you explain how you would implement a sorting algorithm?",
            answer="Um, I think I would use bubble sort because it's simple...",
            justification="Testing algorithm knowledge",
            conversation_history=sample_conversation_history
        )
        
        assert isinstance(result, str)
        assert len(result) > 20
    
    def test_evaluate_answer_fallback(self, agentic_coach, sample_conversation_history):
        """Test fallback evaluation when chain invoke is mocked."""
        with patch('backend.agents.agentic_coach.invoke_chain_with_error_handling') as mock_invoke:
            mock_invoke.return_value = "Fallback coaching feedback provided."
            
            result = agentic_coach.evaluate_answer(
                question="Test question",
                answer="Test answer", 
                justification="Test justification",
                conversation_history=sample_conversation_history
            )
            
            assert result == "Fallback coaching feedback provided."
            mock_invoke.assert_called_once()
    
    def test_generate_final_summary_with_resources(self, agentic_coach, sample_conversation_history):
        """Test final summary generation with resource discovery."""
        result = agentic_coach.generate_final_summary_with_resources(sample_conversation_history)
        
        # Verify summary structure
        assert "patterns_tendencies" in result
        assert "strengths" in result
        assert "weaknesses" in result
        assert "improvement_focus_areas" in result
        assert "recommended_resources" in result
        assert isinstance(result["recommended_resources"], list)
    
    def test_create_default_summary(self, agentic_coach):
        """Test default summary creation."""
        default_summary = agentic_coach._create_default_summary()
        
        assert "patterns_tendencies" in default_summary
        assert "strengths" in default_summary
        assert "weaknesses" in default_summary
        assert "improvement_focus_areas" in default_summary
        assert "recommended_resources" in default_summary
        assert isinstance(default_summary["recommended_resources"], list)


class TestIntegrationScenarios:
    """Integration test scenarios for coaching workflows."""
    
    @pytest.fixture
    def realistic_coach_setup(self):
        """Set up coach with realistic mock services."""
        mock_llm_service = Mock(spec=LLMService)
        json_resp = json.dumps({
            "patterns_tendencies": "Shows uncertainty with algorithm problems and lacks knowledge of time complexity fundamentals.",
            "strengths": "Honest about knowledge gaps and willing to think through problems step by step.",
            "weaknesses": "Limited understanding of algorithm efficiency, time complexity, and optimization techniques.",
            "improvement_focus_areas": "1. Study fundamental algorithms and their time complexities 2. Practice algorithm implementation",
            "recommended_resources": [
                {
                    "title": "Algorithm Design Manual",
                    "url": "https://www.algorithm-archive.org/",
                    "description": "Free comprehensive guide to algorithm design and analysis.",
                    "resource_type": "tutorial"
                }
            ]
        })
        mock_llm_service.get_llm.return_value = FakeListChatModel(responses=[json_resp] * 10)
        
        mock_search_service = Mock(spec=SearchService)
        algorithm_resources = [
            Resource(
                title="Algorithm Design Manual",
                url="https://www.algorithm-archive.org/",
                description="Free comprehensive guide to algorithm design and analysis.",
                resource_type="tutorial",
                source="search",
                relevance_score=0.92
            )
        ]
        
        async def mock_search(skill, **kwargs):
            return algorithm_resources
        
        mock_search_service.search_resources = mock_search
        
        coach = AgenticCoachAgent(
            llm_service=mock_llm_service,
            search_service=mock_search_service,
            resume_content="Software engineer with 3 years experience in web development",
            job_description="Senior Software Engineer - Full Stack Development"
        )
        return coach
    
    def test_coaching_scenario_weak_algorithms(self, realistic_coach_setup):
        """Test coaching scenario where user shows weakness in algorithms."""
        coach = realistic_coach_setup
        
        conversation_history = [
            {
                "role": "assistant",
                "agent": "interviewer",
                "content": "How would you find the second largest element in an array?",
                "timestamp": "2024-01-01T10:00:00"
            },
            {
                "role": "user",
                "content": "I'm not sure... maybe sort the array and take the second element?",
                "timestamp": "2024-01-01T10:01:00"
            }
        ]
        
        result = coach.generate_final_summary_with_resources(conversation_history)
        
        assert "algorithm" in result["weaknesses"].lower()
        assert len(result["recommended_resources"]) > 0
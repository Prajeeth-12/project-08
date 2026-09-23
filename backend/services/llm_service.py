"""
Provides a centralized service for accessing the Large Language Model.
Supports Gemini (default) and Groq (OpenAI-compatible) as coach LLM providers.
"""

import os
from typing import Optional, List, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration

from backend.config import get_logger
from dotenv import load_dotenv

load_dotenv()


class ChatGroqViaOpenAI(BaseChatModel):
    """
    Minimal LangChain BaseChatModel that calls Groq's OpenAI-compatible API.
    Uses the already-installed `openai` package. No langchain-openai or
    langchain-groq needed. Remove when no longer required.
    """
    model_name: str = ""
    api_key: str = ""
    base_url: str = ""
    temperature: float = 0.7

    @property
    def _llm_type(self) -> str:
        return "groq-via-openai"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        import openai

        url = self.base_url
        if not url.rstrip("/").endswith("/v1"):
            url = url.rstrip("/") + "/v1"

        client = openai.OpenAI(api_key=self.api_key, base_url=url)

        oai_messages = []
        for m in messages:
            if m.type == "system":
                oai_messages.append({"role": "system", "content": m.content})
            elif m.type == "human":
                oai_messages.append({"role": "user", "content": m.content})
            elif m.type == "ai":
                oai_messages.append({"role": "assistant", "content": m.content})
            else:
                oai_messages.append({"role": "user", "content": m.content})

        response = client.chat.completions.create(
            model=self.model_name,
            messages=oai_messages,
            temperature=self.temperature,
            stop=stop or None,
        )

        content = response.choices[0].message.content or ""
        return ChatResult(
            generations=[
                ChatGeneration(
                    message=AIMessage(content=content),
                    text=content,
                )
            ]
        )


class LLMService:
    """
    Manages the initialization and access to the LLM instance.
    Supports two providers via COACH_LLM_PROVIDER env var:
      - "gemini" (default): ChatGoogleGenerativeAI
      - "groq": ChatGroqViaOpenAI (OpenAI-compatible endpoint)
    """
    def __init__(self,
                 api_key: Optional[str] = None,
                 model_name: Optional[str] = None,
                 temperature: float = 0.7):
        self.logger = get_logger(__name__)
        self.temperature = temperature
        self._llm: Optional[BaseChatModel] = None

        self.provider = os.environ.get("COACH_LLM_PROVIDER", "gemini").lower().strip()

        if self.provider == "groq":
            self.api_key = api_key or os.environ.get("GROQ_API_KEY")
            if not self.api_key:
                self.logger.error("Groq API key not found. Set GROQ_API_KEY environment variable.")
                raise ValueError("Groq API key is required when COACH_LLM_PROVIDER=groq.")
            self.base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai")
            self.model_name = model_name or os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
            self.logger.info(f"LLMService initialized with Groq provider, model: {self.model_name}")
        else:
            self.api_key = api_key or os.environ.get("GOOGLE_API_KEY")
            if not self.api_key:
                self.logger.error("Google API key not found. Set GOOGLE_API_KEY environment variable.")
                raise ValueError("Google API key is required.")
            self.model_name = model_name or os.environ.get("GOOGLE_MODEL_NAME", "gemini-2.0-flash")
            self.base_url = ""
            self.logger.info(f"LLMService initialized with Gemini provider, model: {self.model_name}")

    def get_llm(self) -> BaseChatModel:
        """
        Returns the initialized LLM instance, creating it if necessary.
        """
        if self._llm is None:
            try:
                if self.provider == "groq":
                    self._llm = ChatGroqViaOpenAI(
                        model_name=self.model_name,
                        api_key=self.api_key,
                        base_url=self.base_url,
                        temperature=self.temperature,
                    )
                    self.logger.info(f"Initialized Groq LLM via OpenAI SDK: {self.model_name}")
                else:
                    self._llm = ChatGoogleGenerativeAI(
                        model=self.model_name,
                        google_api_key=self.api_key,
                        temperature=self.temperature,
                        convert_system_message_to_human=True
                    )
                    self.logger.info(f"Initialized ChatGoogleGenerativeAI model: {self.model_name}")
            except Exception as e:
                self.logger.exception(f"Failed to initialize LLM: {e}")
                raise
        return self._llm


if __name__ == '__main__':
    try:
        llm_service = LLMService()
        llm_instance = llm_service.get_llm()
        logger = llm_service.logger
        logger.info(f"Provider: {llm_service.provider}")
        logger.info(f"Successfully obtained LLM instance: {type(llm_instance)}")

        response = llm_instance.invoke("Hello, how are you?")
        logger.info(f"LLM Response: {response.content}")

    except ValueError as ve:
        print(f"Configuration Error: {ve}")
    except Exception as e:
        print(f"An error occurred: {e}")

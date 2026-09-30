import os
import importlib


def test_openrouter_defaults_are_configured():
    os.environ.pop("ANTHROPIC_API_KEY", None)
    os.environ.pop("OPENROUTER_API_KEY", None)
    os.environ.pop("OPENROUTER_MODEL", None)

    module = importlib.import_module("utils.ai_service")
    assert module.DEFAULT_MODEL == "openai/gpt-4.1-mini"
    assert module.DEFAULT_BASE_URL == "https://openrouter.ai/api/v1/chat/completions"

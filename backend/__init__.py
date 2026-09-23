"""
AI Interviewer Agent - Enhanced Backend
This package provides a comprehensive interview preparation system with multi-agent capabilities.
"""

import sys
import os

# Ensure parent directory is in sys.path so 'import backend' works from anywhere
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# LangChain 1.x compatibility shim for legacy chains and prompts
try:
    import langchain.chains
except ImportError:
    try:
        import langchain_classic.chains
        sys.modules['langchain.chains'] = langchain_classic.chains
        import langchain_classic.chains.base
        sys.modules['langchain.chains.base'] = langchain_classic.chains.base
    except ImportError:
        pass

try:
    import langchain.prompts
except ImportError:
    try:
        import langchain_core.prompts
        sys.modules['langchain.prompts'] = langchain_core.prompts
    except ImportError:
        pass

__version__ = "2.0.0" 
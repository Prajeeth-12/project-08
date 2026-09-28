# module-2-ai-interview-agent/blueprint/role_calibration.py
"""Role-based calibration loader for interview blueprint generation.

Simplified from cloned_repos/hiring-agent/roles.py.  Each role lives in a
single ``blueprint/roles/<name>.json`` file and is loaded into a
:class:`RoleConfig` dataclass.  No template files are required.

The loaded config is consumed by :func:`blueprint.planner.generate_blueprint`
to override the hardcoded default sections with role-appropriate ones.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

ROLES_DIR = Path(__file__).parent / "roles"


@dataclass(frozen=True)
class RoleConfig:
    """Minimal role definition used for blueprint section calibration.

    Attributes:
        name:       Role identifier (matches the JSON filename stem).
        sections:   Ordered list of section titles for the interview blueprint.
        categories: Optional list of scoring category dicts (key/label/max).
    """

    name: str
    sections: List[str] = field(default_factory=list)
    categories: List[dict] = field(default_factory=list)


def load_role(name: str) -> RoleConfig:
    """Load a role config by name from ``blueprint/roles/<name>.json``.

    Args:
        name: Role identifier, e.g. ``"engineering"``, ``"pm"``, ``"design"``.

    Returns:
        A :class:`RoleConfig` populated from the JSON file.

    Raises:
        ValueError: If the role file is missing or the JSON is malformed.
    """
    role_path = ROLES_DIR / f"{name}.json"

    if not role_path.is_file():
        available: list[str] = []
        if ROLES_DIR.is_dir():
            available = sorted(p.stem for p in ROLES_DIR.glob("*.json"))
        available_str = ", ".join(available) or "(none found)"
        raise ValueError(
            f"Unknown role '{name}'. Expected {role_path}. "
            f"Available roles: {available_str}"
        )

    try:
        data = json.loads(role_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Role '{name}' has invalid JSON: {exc}") from exc

    sections = data.get("sections", [])
    categories = data.get("categories", [])

    if not isinstance(sections, list):
        raise ValueError(f"Role '{name}': 'sections' must be a list, got {type(sections)}")

    return RoleConfig(name=name, sections=list(sections), categories=list(categories))

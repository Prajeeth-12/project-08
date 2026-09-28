import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app


class FakeSession:
    def __init__(self):
        self.draft = None

    def add(self, draft):
        self.draft = draft

    async def commit(self):
        pass

    async def refresh(self, draft):
        if draft.id is None:
            draft.id = uuid.uuid4()
        if draft.saved_at is None:
            draft.saved_at = datetime.now(timezone.utc)


async def fake_get_db():
    yield FakeSession()


app.dependency_overrides[get_db] = fake_get_db

client = TestClient(app)


def test_create_draft():
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()

    response = client.post(
        "/api/code/drafts",
        json={
            "user_id": str(user_id),
            "session_id": str(session_id),
            "language": "cpp",
            "source_code": "#include <iostream>\nint main() {}",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["user_id"] == str(user_id)
    assert data["session_id"] == str(session_id)
    assert data["language"] == "cpp"
    assert data["source_code"] == "#include <iostream>\nint main() {}"
    assert data["version"] == 1
    assert "id" in data
    assert "saved_at" in data
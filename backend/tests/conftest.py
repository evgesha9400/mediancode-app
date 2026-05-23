# tests/conftest.py
"""Pytest configuration and shared fixtures."""

import asyncio
import subprocess

import asyncpg
import pytest
import pytest_asyncio
from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from api.main import app
from api.models.database import GenerationModel, Namespace, UserModel
from api.settings import get_settings

# --- Database availability check ---

_DB_CHECK_TIMEOUT_SECONDS = 1


def _database_check_url() -> tuple[str, str]:
    """Return the configured database URL and a human-readable location.

    :returns: Tuple of asyncpg-compatible DSN and host/port label.
    """
    url = make_url(get_settings().database_url)
    check_url = url.set(drivername="postgresql").render_as_string(hide_password=False)
    host = url.host or "localhost"
    port = url.port or 5432
    return check_url, f"{host}:{port}"


async def _open_database_check_connection(dsn: str) -> None:
    """Open and close a PostgreSQL connection for test availability checks.

    :param dsn: asyncpg-compatible PostgreSQL connection URL.
    """
    connection = await asyncpg.connect(dsn=dsn, timeout=_DB_CHECK_TIMEOUT_SECONDS)
    try:
        await connection.execute("SELECT 1")
    finally:
        await connection.close()


def _check_database_available() -> bool:
    """Check whether configured PostgreSQL accepts authenticated connections.

    :returns: True if the configured database accepts connections, False otherwise.
    """
    try:
        dsn, _location = _database_check_url()
        asyncio.run(_open_database_check_connection(dsn))
        return True
    except (OSError, asyncpg.PostgresError, TimeoutError):
        return False


def _check_docker_available() -> bool:
    """Check whether Docker Compose is available."""
    try:
        result = subprocess.run(
            ["docker", "compose", "version"],
            capture_output=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def pytest_collection_modifyitems(
    config: pytest.Config, items: list[pytest.Item]
) -> None:
    """Skip integration/e2e tests when required services are unavailable.

    Runs a single TCP check against PostgreSQL at collection time. If the
    connection fails, every test marked ``integration`` is skipped with a
    clear message. Similarly, if Docker Compose is unavailable, every test
    marked ``e2e`` is skipped. Other tests are left untouched.
    """
    integration_items = [
        item for item in items if item.get_closest_marker("integration")
    ]
    if integration_items and not _check_database_available():
        _dsn, database_location = _database_check_url()
        skip_marker = pytest.mark.skip(
            reason=f"PostgreSQL not available at {database_location} - start the configured test database"
        )
        for item in integration_items:
            item.add_marker(skip_marker)

    e2e_items = [item for item in items if item.get_closest_marker("e2e")]
    if e2e_items and not _check_docker_available():
        skip_e2e = pytest.mark.skip(reason="Docker not available")
        for item in e2e_items:
            item.add_marker(skip_e2e)


# --- Module-scoped HTTP client for integration tests ---
#
# Each test module that needs an authenticated HTTP client defines a
# module-level ``TEST_CLERK_ID`` string.  The fixture below reads it,
# wires up auth, yields the client, and cleans up DB data on teardown.


@pytest_asyncio.fixture(scope="module", loop_scope="session")
async def client(request):
    """Module-scoped HTTP client with Clerk auth override and DB cleanup.

    The calling module **must** define ``TEST_CLERK_ID`` at module scope.
    """
    from httpx import ASGITransport
    from httpx import AsyncClient as _AsyncClient

    from support.api_client import cleanup_user_data, clear_auth, override_auth

    clerk_id = getattr(request.module, "TEST_CLERK_ID", None)
    if clerk_id is None:
        pytest.skip("Module does not define TEST_CLERK_ID")

    override_auth(clerk_id)

    async with _AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test/v1",
    ) as c:
        yield c

    clear_auth()
    await cleanup_user_data(clerk_id)


# --- Integration test (database) fixtures ---


@pytest_asyncio.fixture
async def test_engine():
    """Create a test database engine."""
    from api.settings import get_settings

    settings = get_settings()
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_session_factory(test_engine):
    """Create a session factory for tests."""
    return async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture
async def db_session(test_session_factory):
    """Provide a database session that rolls back after each test."""
    async with test_session_factory() as session:
        yield session
        await session.rollback()


TEST_USER_ID = "test_user_integration"


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> UserModel:
    """Provision a test user and return the UserModel."""
    from api.services.user import UserService

    service = UserService(db_session)
    user = await service.ensure_provisioned(TEST_USER_ID)
    await db_session.commit()

    yield user

    # Cleanup: delete generations, namespace, and user created during provisioning
    await db_session.execute(
        delete(GenerationModel).where(GenerationModel.user_id == user.id)
    )
    await db_session.execute(delete(Namespace).where(Namespace.user_id == user.id))
    await db_session.execute(delete(UserModel).where(UserModel.id == user.id))
    await db_session.commit()


@pytest_asyncio.fixture
async def provisioned_namespace(
    db_session: AsyncSession, test_user: UserModel
) -> Namespace:
    """Return the test user's default namespace.

    The namespace starts empty. Seed data (types, constraints) lives in the
    system namespace and is shared read-only via OR clauses in service queries.
    """
    result = await db_session.execute(
        select(Namespace).where(
            Namespace.user_id == test_user.id,
            Namespace.is_default.is_(True),
        )
    )
    namespace = result.scalar_one()

    return namespace


@pytest_asyncio.fixture
async def test_namespace(db_session: AsyncSession, test_user: UserModel) -> Namespace:
    """Create a test namespace, cleaned up after the test."""
    namespace = Namespace(
        name="Test Namespace",
        description="Test namespace for integration tests",
        user_id=test_user.id,
    )
    db_session.add(namespace)
    await db_session.commit()
    await db_session.refresh(namespace)

    yield namespace

    # Cleanup
    await db_session.execute(delete(Namespace).where(Namespace.id == namespace.id))
    await db_session.commit()


# --- Loud warning when DB-dependent tests are skipped ---


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Warn loudly when DB-dependent tests were skipped.

    Prevents silent skipping from hiding broken tests — subagents and
    developers will see a prominent banner in the test output.
    """
    skipped = terminalreporter.stats.get("skipped", [])
    db_skipped = [
        s
        for s in skipped
        if "postgresql" in str(s.longrepr).lower()
        or "database" in str(s.longrepr).lower()
    ]
    if db_skipped:
        terminalreporter.write_sep(
            "!",
            f"WARNING: {len(db_skipped)} tests SKIPPED because PostgreSQL "
            f"is not running. Run 'make db' first for full coverage.",
            yellow=True,
        )

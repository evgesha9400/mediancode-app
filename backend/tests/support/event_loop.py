"""Event loop helpers for tests that call ``asyncio.run``."""

import asyncio
from asyncio import AbstractEventLoop
from collections.abc import Coroutine
from typing import Any, TypeVar

T = TypeVar("T")


def restore_event_loop_policy() -> None:
    """Restore lazy event loop creation after ``asyncio.run``.

    Python 3.13 leaves the main thread without a current loop after
    ``asyncio.run``.  pytest-asyncio still asks the policy for the current
    loop when wrapping async tests, so synchronous test helpers must reset
    the policy state without creating an unowned loop.
    """
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())


def _current_event_loop() -> AbstractEventLoop | None:
    """Return the policy's current loop without creating one."""
    policy = asyncio.get_event_loop_policy()
    local = getattr(policy, "_local", None)
    if local is None:
        return None
    return getattr(local, "_loop", None)


def run_async(coro: Coroutine[Any, Any, T]) -> T:
    """Run a coroutine while preserving pytest-asyncio's current loop.

    :param coro: Coroutine to execute synchronously.
    :returns: Coroutine result.
    """
    previous_loop = _current_event_loop()

    try:
        return asyncio.run(coro)
    finally:
        if previous_loop is not None and not previous_loop.is_closed():
            asyncio.set_event_loop(previous_loop)
        else:
            restore_event_loop_policy()

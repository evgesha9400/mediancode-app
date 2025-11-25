#!/usr/bin/env python3
import subprocess
import textwrap
from pathlib import Path

# -------- CONFIG --------

REPO_DIR = "."  # run from repo root or set an absolute path
MAX_ITERATIONS = 10  # bump this up if you want a longer loop
RUN_TESTS = False  # set True if you want to run tests after each Claude step


# -------- UTILITIES --------


def run(cmd, input_text=None, cwd=None):
    """Run a shell command and return stdout, raise on non-zero exit."""
    result = subprocess.run(
        cmd,
        input=input_text,
        text=True,
        capture_output=True,
        cwd=cwd,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}")
    return result.stdout


def has_uncommitted_changes(repo_dir: str) -> bool:
    """Return True if there are any uncommitted changes."""
    status = run(["git", "status", "--porcelain"], cwd=repo_dir)
    return bool(status.strip())


def git_stage_all(repo_dir: str):
    """Stage all modified/deleted files."""
    run(["git", "add", "-u"], cwd=repo_dir)


def run_tests(repo_dir: str) -> bool:
    """Run your test command. Adjust to your stack."""
    try:
        run(["npm", "test"], cwd=repo_dir)
        return True
    except RuntimeError as e:
        print("Tests failed:\n", e)
        return False


# -------- LLM STEPS --------


def run_codex_review() -> str:
    """
    Ask Codex to review the *current uncommitted changes* in the repo.

    Assumptions:
    - Codex CLI is configured with a default model.
    - Codex can use its own tools (sandbox, git, file reads) to inspect the repo.
    - We keep Codex read-only by using a restrictive sandbox mode.
    """
    prompt = textwrap.dedent("""
    You are a strict Svelte code reviewer.

    Context:
    - You are running inside a Git repository.
    - There are uncommitted changes made previously by another agent (Claude).
    - You have tools available to inspect the repo (e.g. running git commands, reading files).

    Task:
    - Inspect the *current uncommitted changes* in this repo using your tools
      (e.g. git diff, git status, opening files).
    - Do NOT modify any files or run commands that change the working tree.
      You are in read-only review mode.
    - Check the changes for:
      - consistency
      - organisation
      - neatness
      - correctness with respect to the latest Svelte version
    - Suggest improvements *only* if they are clearly beneficial and aligned with modern Svelte best practices.
    - If you have no substantial suggestions, start your reply with exactly:
      STATUS: ACCEPT
      (then you may optionally add a short explanation).

    Output:
    - Your review and suggested improvements, or STATUS: ACCEPT if everything looks good.
    """)

    cmd = [
        "codex",
        # read-only sandbox so Codex doesn't change anything
        "-s",
        "read-only",
        # rely on default model/profile
        "exec",
    ]
    output = run(cmd, input_text=prompt, cwd=REPO_DIR)
    return output


def run_claude_apply_feedback(feedback: str) -> str:
    """
    Ask Claude (@agent-svelte-architect) to apply only valid feedback
    from Codex to the repo using its own tools.
    """
    prompt = textwrap.dedent(f"""
    @agent-svelte-architect

    You are working inside a Svelte codebase in a Git repository.

    You will receive feedback about recent changes you made, provided by Codex.

    Instructions:
    - Carefully read the feedback below.
    - Using your tools (e.g. file edits, running commands, git, etc.):
      - Evaluate whether each suggestion is valid and in line with the latest Svelte version.
      - Apply only the valid and helpful suggestions to the codebase.
      - Prefer clarity, idiomatic Svelte, and maintainability.
      - Avoid unnecessary churn: do not rewrite code just for stylistic whims.
    - After applying changes, briefly summarise what you changed.

    Feedback from Codex:
    {feedback}
    """)

    cmd = [
        "claude",
        "-p",  # non-interactive, print response and exit
        "--output-format",
        "text",
        # Allow tools and non-interactive edits; tweak permission mode as you like:
        # "--permission-mode", "acceptEdits",
        # "--tools", "default",
    ]
    output = run(cmd, input_text=prompt, cwd=REPO_DIR)
    return output


# -------- MAIN LOOP --------


def main():
    repo_dir = REPO_DIR

    if not has_uncommitted_changes(repo_dir):
        print("No uncommitted changes to review. Exiting.")
        return

    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"\n=== Iteration {iteration} ===")

        if not has_uncommitted_changes(repo_dir):
            print("No more uncommitted changes; nothing left to iterate on. Stopping.")
            break

        # Step 1: Codex review
        print("Running Codex review over current uncommitted changes...")
        codex_feedback = run_codex_review()
        Path(f"codex_feedback_{iteration}.txt").write_text(codex_feedback)
        print(f"Codex feedback saved to codex_feedback_{iteration}.txt")

        # Termination: Codex is happy
        if codex_feedback.strip().upper().startswith("STATUS: ACCEPT"):
            print("Codex indicates no further substantial suggestions. Stopping loop.")
            break

        # Step 2: Claude applies valid suggestions
        print("Running Claude to apply valid feedback...")
        claude_output = run_claude_apply_feedback(codex_feedback)
        Path(f"claude_output_{iteration}.txt").write_text(claude_output)
        print(f"Claude output saved to claude_output_{iteration}.txt")

        # Step 3: Stage all changes
        print("Staging changes with git add -u...")
        git_stage_all(repo_dir)

        # Optional: tests
        if RUN_TESTS:
            print("Running tests...")
            tests_ok = run_tests(repo_dir)
            if tests_ok:
                print("Tests passed.")
            else:
                print("Tests failed after Claude's changes. Inspect before continuing.")

    print("\nWorkflow finished.")


if __name__ == "__main__":
    main()

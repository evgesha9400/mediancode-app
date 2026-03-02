# Merge name-case-validation into navigation-workflow-redesign

**Goal:** Merge the 5 commits from `feature/name-case-validation` into `feature/navigation-workflow-redesign`, then clean up the source branch and worktree.

**Background:** The backend deployed case enforcement (PascalCase for objects, snake_case for fields) on Feb 27. The `feature/name-case-validation` branch adds client-side validation utilities and integrates them into field, object, and endpoint forms. The `feature/navigation-workflow-redesign` branch has significant UI changes (DrawerStack, sidebar collapse, inline creation overlays). Both branches diverged from `develop` at commit `47ddca3`.

**Merge analysis (dry-run performed):**
- 4 shared files auto-merge cleanly: `fieldsModel.svelte.ts`, `objectsModel.svelte.ts`, `apis/[id]/+page.svelte`, `objectsModel.test.ts`
- 1 conflict: `tests/e2e/crud/objects.spec.ts` — both branches independently changed `e2e_alpha_object` → `E2eAlphaObject`. Resolution: accept either side (identical change), keep the nav-redesign cleanup prefix `E2e`.
- 2 new files from name-case-validation (no conflict): `src/lib/utils/validation.ts`, `tests/unit/lib/utils/validation.test.ts`
- 2 plan docs from name-case-validation to delete after merge

---

### Task 1: Merge name-case-validation into nav-redesign

**Working directory:** Main repo (`/Users/evgesha/Documents/Projects/median-code-frontend`)

```bash
# Switch to the nav-redesign worktree
cd /Users/evgesha/Documents/Projects/median-code-frontend/.worktrees/nav-redesign

# Merge (will produce 1 conflict in objects.spec.ts)
git merge feature/name-case-validation
```

**Resolve the single conflict in `tests/e2e/crud/objects.spec.ts`:**
- Both branches made the same change (`e2e_alpha_object` → `E2eAlphaObject`)
- The nav-redesign version also changed the cleanup prefix from `e2e_` to `E2e`
- Accept the nav-redesign version (ours) since it already has both changes:

```bash
git checkout --ours tests/e2e/crud/objects.spec.ts
git add tests/e2e/crud/objects.spec.ts
```

Complete the merge:

```bash
git commit --no-edit
```

**Verify:** `git log --oneline -8` should show the merge commit at HEAD with all 5 name-case-validation commits integrated.

---

### Task 2: Verify the merge

Run the full validation suite from the nav-redesign worktree:

```bash
cd /Users/evgesha/Documents/Projects/median-code-frontend/.worktrees/nav-redesign
```

1. **Type check:** `bun run svelte-check --tsconfig ./tsconfig.json` — expect 0 errors
2. **Unit tests:** `bunx vitest run` — expect all pass (including new validation.test.ts)
3. **Smoke tests:** `pkill -f "vite" 2>/dev/null; bunx playwright test --project=smoke` — expect all pass
4. **E2E CRUD tests:** `pkill -f "vite" 2>/dev/null; PUBLIC_API_BASE_URL=https://api.dev.mediancode.com/v1 bunx playwright test --project=setup --project=crud` — expect all pass

If any test fails, investigate and fix before proceeding.

---

### Task 3: Delete name-case-validation plan docs

From the nav-redesign worktree, delete the now-completed plan files that were merged in:

```bash
rm docs/plans/2026-02-28-name-case-validation-design.md
rm docs/plans/2026-02-28-name-case-validation-impl.md
```

Commit using `/commit` skill.

Suggested message: `chore: remove completed name case validation plans`

---

### Task 4: Clean up name-case-validation worktree and branch

**Order matters:** Remove the worktree FIRST, then delete the branch. Reversing this order will leave git in a broken state.

```bash
# Step 1: Return to main repo
cd /Users/evgesha/Documents/Projects/median-code-frontend

# Step 2: Remove the worktree (this detaches the working directory)
git worktree remove .worktrees/name-case-validation

# Step 3: Delete the branch (safe because it's fully merged into nav-redesign)
git branch -d feature/name-case-validation
```

**Verify cleanup:**

```bash
# Should NOT list name-case-validation
git worktree list

# Should NOT list feature/name-case-validation
git branch | grep name-case
```

If `git branch -d` fails with "not fully merged", use `-D` — the commits are preserved in `feature/navigation-workflow-redesign`.

---

### Task 5: Delete this plan file

```bash
rm docs/plans/2026-03-02-merge-name-validation-into-nav-redesign.md
```

Commit using `/commit` skill.

Suggested message: `chore: remove completed merge plan`

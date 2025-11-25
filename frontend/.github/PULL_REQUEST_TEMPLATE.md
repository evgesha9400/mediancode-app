# Pull Request

## Description

<!-- Provide a clear and concise description of the changes -->

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (code changes that neither fix bugs nor add features)
- [ ] Documentation update
- [ ] Test update
- [ ] CI/CD update

## Changes Made

<!-- List the specific changes made in this PR -->

-
-
-

## Related Issues

<!-- Link to related issues, e.g., "Closes #123" or "Relates to #456" -->

## Testing Workflow

<!-- This section is REQUIRED for all code changes -->

### Pre-Submission Testing

I have run the following tests locally:

- [ ] `npm run check` - Type checking passed
- [ ] `npm run test:unit` - Unit tests passed
- [ ] `npm run test:integration` - Integration tests passed
- [ ] `npm run test:e2e:smoke` - Smoke tests passed

### Test Updates

<!-- Check all that apply -->

- [ ] Added/updated unit tests for new/changed functionality
- [ ] Added/updated integration tests for new/changed routes or stores
- [ ] Added/updated E2E tests for new/changed user flows
- [ ] Updated page objects for UI changes
- [ ] Updated fixtures for new/changed data structures
- [ ] Updated MSW handlers for new/changed API endpoints
- [ ] No tests needed (documentation/config only)

### Fixture Updates

<!-- If you modified fixtures or MSW handlers -->

- [ ] Updated fixtures in `tests/fixtures/`
- [ ] Updated MSW handlers in `tests/shared/msw/handlers.ts`
- [ ] Ran `npm run test:fixtures:validate` successfully
- [ ] Updated fixture schema documentation
- [ ] N/A - No fixture changes

### Visual Changes

<!-- If this PR includes UI changes -->

- [ ] Reviewed Playwright screenshot diffs
- [ ] Visual changes are intentional
- [ ] Updated screenshot baselines with `--update-snapshots`
- [ ] Included before/after screenshots in PR description
- [ ] N/A - No visual changes

**Before/After Screenshots:**

<!-- If applicable, add screenshots showing visual changes -->

## Component/Route Checklist

<!-- Complete if adding new components or routes -->

### New Component Checklist

- [ ] Component created in `src/lib/components/[category]/`
- [ ] Unit test added in `tests/unit/lib/components/[category]/`
- [ ] Integration test added (if component uses stores/API)
- [ ] Page object updated (if component appears in E2E flow)
- [ ] E2E test added (if component is in critical user flow)
- [ ] Component exported from barrel export (`index.ts`)
- [ ] Updated testing tracker in `docs/testing.md`
- [ ] N/A - No new components

### New Route Checklist

- [ ] Route created in `src/routes/`
- [ ] Integration test added in `tests/integration/routes/`
- [ ] Page object created in `tests/e2e/page-objects/`
- [ ] Smoke test created in `tests/e2e/scenarios/*.smoke.spec.ts`
- [ ] Full test created in `tests/e2e/scenarios/*.spec.ts`
- [ ] MSW handlers updated (if route needs API)
- [ ] Fixtures updated (if route needs data)
- [ ] Updated testing tracker in `docs/testing.md`
- [ ] N/A - No new routes

## Code Quality

- [ ] Code follows the project's coding standards
- [ ] Self-review of code performed
- [ ] Code is commented where necessary
- [ ] No console.log or debugging code left in
- [ ] Conventional commit message format followed

## Documentation

- [ ] Updated README.md (if applicable)
- [ ] Updated CLAUDE.md (if changing project structure)
- [ ] Updated testing documentation (if changing test strategy)
- [ ] Updated runbooks (if adding new procedures)
- [ ] N/A - No documentation updates needed

## Breaking Changes

<!-- If this is a breaking change, describe what breaks and the migration path -->

## Deployment Notes

<!-- Any special instructions for deployment or environment variables needed -->

## Checklist Before Merge

- [ ] All CI checks passing (lint-and-typecheck, unit-integration, playwright-smoke)
- [ ] PR has been reviewed and approved
- [ ] Merge conflicts resolved
- [ ] Branch is up to date with base branch

## Playwright Trace Attachment

<!-- If you made UI changes, attach Playwright trace for failed tests (if any) -->
<!-- Upload trace.zip from test-results/ directory -->

---

## For Reviewers

### Testing Notes

<!-- Notes for reviewers about what to test and where to focus review -->

### Review Checklist

- [ ] Code follows established patterns (see CLAUDE.md)
- [ ] Tests are comprehensive and use fixtures correctly
- [ ] No tests bypass shared fixtures
- [ ] MSW handlers match expected API contract
- [ ] Visual changes are intentional (if applicable)
- [ ] Documentation is updated and clear

# Commit Message Standard - Copy as LLM Context

## Overview

This document defines the standardized commit message format for the Copy as LLM Context VS Code extension. This format ensures consistent commit history, enables automated changelog generation, and improves project maintainability.

## Commit Message Format

### Structure

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Components

#### 1. Type (Required)
The type describes the nature of the change:

- **feat**: A new feature for the user
- **fix**: A bug fix for the user
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code changes that neither fix bugs nor add features
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **build**: Changes to build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

#### 2. Scope (Optional)
The scope describes the part of the codebase affected:

**Service Scopes:**
- `binary` - BinaryService changes
- `clipboard` - ClipboardService changes
- `encoding` - EncodingService changes
- `file` - FileService changes
- `formatting` - FormattingService changes
- `ignore` - IgnoreService changes
- `preview` - PreviewService changes
- `sampling` - SamplingService changes
- `secrets` - SecretsService changes
- `selection` - SelectionService changes
- `size-budget` - SizeBudgetService changes

**Command Scopes:**
- `copy` - Main copy command
- `copy-last` - Copy last selection command
- `examples` - Examples command

**Infrastructure Scopes:**
- `config` - Configuration and settings
- `build` - Build system (esbuild, package.json)
- `test` - Test infrastructure
- `ci` - GitHub Actions and CI/CD
- `deps` - Dependencies

**General Scopes:**
- `ui` - User interface and UX
- `core` - Core extension functionality
- `utils` - Utility functions and helpers

#### 3. Subject (Required)
- Use imperative mood ("add" not "added" or "adds")
- Start with lowercase letter
- No period at the end
- Maximum 50 characters
- Clearly describe what the commit does

#### 4. Body (Optional)
- Separate from subject with a blank line
- Use imperative mood
- Wrap at 72 characters
- Explain what and why, not how
- Include motivation for the change
- Reference issues or tickets

#### 5. Footer (Optional)
- Separate from body with a blank line
- Include breaking change notices
- Reference closed issues
- Include co-authored-by for pair programming

## Examples

### Basic Examples

```
feat(sampling): add intelligent JSON array sampling

fix(secrets): resolve regex compilation error for user patterns

docs: update README with CSV sampling examples

test(file): add unit tests for directory expansion

chore(deps): update @types/vscode to ^1.90.0
```

### With Body

```
feat(preview): add streaming preview updates

Implement real-time preview updates as files are processed.
This improves user experience by showing progress during
large file operations and provides immediate feedback.

- Add appendChunk method to PreviewService
- Update FileService to call progress callback
- Ensure preview stays in sync with clipboard content
```

### With Footer

```
fix(size-budget): handle edge case with zero-byte files

Previously, zero-byte files could cause division by zero
errors in the size calculation logic.

Fixes #123
```

### Breaking Changes

```
feat(config)!: restructure configuration schema

BREAKING CHANGE: Configuration property names have changed.
- `perFileSizeCapKB` is now `limits.perFileKB`
- `payload.maxTotalMB` is now `limits.totalMB`

Migration guide available in CHANGELOG.md
```

### Multiple Scopes

```
feat(copy,preview): integrate preview with copy command

- Copy command now opens preview automatically
- Preview shows exact content copied to clipboard
- Error handling displays in preview panel
```

## Implementation Step Integration

When working on implementation steps from `IMPLEMENTATION_TRACKER.md`, include the step reference:

```
feat(preview): implement PreviewService foundation

Complete Step 2 of implementation tracker:
- Add show() method for markdown preview
- Implement appendChunk() for streaming updates
- Add error display functionality
- Make preview read-only and positioned beside editor

Ref: IMPLEMENTATION_TRACKER.md Step 2
```

## Validation Rules

### Must Have
- [ ] Type is one of the allowed types
- [ ] Subject is present and under 50 characters
- [ ] Subject uses imperative mood
- [ ] Subject starts with lowercase letter
- [ ] No period at end of subject

### Should Have
- [ ] Scope is relevant to the change
- [ ] Body explains why the change was made
- [ ] References related issues or PRs
- [ ] Breaking changes are clearly marked

### Must Not Have
- [ ] Subject over 50 characters
- [ ] Body lines over 72 characters
- [ ] Trailing periods in subject
- [ ] Past tense in subject ("added", "fixed")

## Automated Tools

### Commitizen Support
This format is compatible with Commitizen. To set up:

```bash
npm install -g commitizen cz-conventional-changelog
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc
```

Then use `git cz` instead of `git commit`.

### Conventional Changelog
The CI pipeline uses conventional-changelog to automatically generate `CHANGELOG.md`:

```bash
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### Commit Linting
Consider adding commitlint for validation:

```bash
npm install --save-dev @commitlint/config-conventional @commitlint/cli
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

## VS Code Extension Specific Guidelines

### Feature Development
```
feat(sampling): implement CSV header preservation
feat(secrets): add built-in API key detection patterns
feat(ui): add file exclusion quick pick dialog
```

### Bug Fixes
```
fix(binary): resolve false positive detection for text files
fix(formatting): correct markdown fence language detection
fix(config): handle missing workspace folders gracefully
```

### Documentation
```
docs(readme): add multi-root workspace examples
docs(config): document secret detection patterns
docs: update installation instructions
```

### Testing
```
test(sampling): add JSON array sampling unit tests
test(integration): add end-to-end copy command test
test: increase coverage for error handling paths
```

### Refactoring
```
refactor(file): extract root label resolution logic
refactor(services): standardize error handling patterns
refactor: improve type safety across service interfaces
```

## Benefits

1. **Automated Changelog**: Enables automatic CHANGELOG.md generation
2. **Clear History**: Makes git log more readable and searchable
3. **Release Automation**: Supports semantic versioning automation
4. **Team Consistency**: Ensures all contributors follow same format
5. **Issue Tracking**: Links commits to issues and PRs
6. **Breaking Change Detection**: Clearly identifies breaking changes

## Enforcement

This standard should be enforced through:

1. **Pre-commit hooks** using commitlint
2. **PR review process** checking commit message format
3. **CI pipeline** validation before merge
4. **Team education** and documentation reference

## Migration

Existing commits don't need to be rebased, but all new commits should follow this standard starting from the adoption date.

---

**Last Updated:** October 16, 2025  
**Version:** 1.0.0  
**Status:** Active Standard

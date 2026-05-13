# Commit Message Standard

All Median Code repositories follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

## Types

| Type | Description |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring without changing behavior |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, whitespace) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, dependencies, configs |
| `ci` | CI/CD configuration changes |
| `perf` | Performance improvements |
| `build` | Build system or dependency changes |
| `revert` | Reverts a previous commit |

## Scopes

Each repository defines its own scopes in its `CLAUDE.md`. Use the scope that best describes the area of the codebase affected.

## Rules

1. **Subject line**
   - Use imperative mood ("add feature" not "added feature")
   - Start with lowercase letter
   - No trailing period
   - Maximum 50 characters

2. **Body** (optional)
   - Separate from subject with blank line
   - Explain *what* and *why*, not *how*
   - Use sequential bullet points
   - Wrap at 72 characters

3. **Breaking changes**
   - Add `!` after type/scope: `feat(api)!: remove deprecated endpoint`
   - Or add `BREAKING CHANGE:` in footer

4. **Co-authorship**
   - Do NOT include Co-Authored-By lines

## Examples

### Simple feature
```
feat(api): add namespace CRUD endpoints
```

### Bug fix with scope
```
fix(auth): resolve JWT token expiration handling
```

### Documentation
```
docs: add commit message standard
```

### Breaking change
```
feat(api)!: change response envelope structure

BREAKING CHANGE: Response envelope now uses `data` instead of `result` field.
```

### Multi-line with body
```
feat(generation): add zip file streaming for code generation

- stream zip file directly to client instead of writing to disk
- improve memory efficiency for large generated projects
```

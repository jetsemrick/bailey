---
name: git-naming
description: Naming conventions for git branches and commit messages, designed for cloud agents and local development. Ensures consistent, parseable git history.
---
# Git Naming Conventions

Naming conventions for git branches and commit messages to ensure consistent, parseable git history. These conventions are optimized for cloud agents but apply to all development work.

## Branch Naming

Use kebab-case (lowercase with hyphens) for all branch names. Branch names should be descriptive and indicate the type of work.

### Pattern

`{type}/{scope}-{description}`

### Types

- `feature/` - New functionality or enhancements
- `fix/` - Bug fixes
- `refactor/` - Code refactoring without changing behavior
- `docs/` - Documentation changes
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks, dependency updates
- `perf/` - Performance improvements
- `style/` - Code style changes (formatting, whitespace)
- `ci/` - CI/CD pipeline changes

### Scope (Optional)

Component, module, or area affected:
- `frontend/`, `backend/`, `api/`, `ui/`, `terminal/`, `window/`

### Examples

```
feature/terminal-scroll-fix
fix/window-resize-handle
refactor/api-error-handling
docs/readme-setup-instructions
test/terminal-command-execution
chore/update-dependencies
perf/render-optimization
style/format-codebase
ci/github-actions-workflow
```

### Special Cases

- `hotfix/{description}` - Critical production fixes
- `release/{version}` - Release preparation branches

## Commit Messages

Follow the Conventional Commits specification for consistency and automated parsing.

### Pattern

```
{type}({scope}): {subject}

{body}

{footer}
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation changes
- `test` - Test additions or changes
- `chore` - Maintenance tasks
- `perf` - Performance improvements
- `style` - Code style (formatting, whitespace)
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert previous commit

### Subject Line

- Use imperative mood ("add feature" not "added feature" or "adds feature")
- First letter lowercase (unless starting with proper noun)
- No period at the end
- Maximum 72 characters
- Describe what the commit does, not why (explain why in body)

### Brevity and Conciseness

Keep commit messages brief and focused. Prioritize clarity over verbosity.

**Subject Line:**
- Aim for 50 characters or less
- Use active verbs: "add", "fix", "update", "remove", "refactor"
- Omit unnecessary words: "add new feature" → "add feature"
- Avoid redundant context: "fix bug in terminal" → "fix terminal input"

**Body:**
- Keep to 2-3 sentences when needed
- Focus on "why" and "what changed", not implementation details
- Omit body entirely for simple, self-explanatory changes

**Example:**

```
feat(terminal): add scrollbar for overflow

Enable scrolling when output exceeds available space. Anchor input
to bottom to prevent it from disappearing.
```

### Body (Optional)

- Separate from subject with blank line
- Explain the "why" behind the change
- Wrap at 72 characters
- Can include multiple paragraphs

### Footer (Optional)

- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

### Examples

```
feat(terminal): add scrollbar for overflow content

Anchors input box to bottom and enables scrolling when terminal
output exceeds available space. Fixes issue where input disappears
when window fills with text.

Fixes #42
```

```
fix(window): prevent input line from shrinking

Add flex-shrink: 0 to terminal-input-line to ensure it remains
visible at the bottom of the terminal window.

Closes #43
```

```
docs(readme): update installation instructions

Add prerequisites and troubleshooting section for common setup issues.
```

```
refactor(api): simplify error handling logic

Consolidate error handling into single utility function to reduce
code duplication and improve maintainability.
```

```
chore: update dependencies to latest versions

- Update React to 18.3.1
- Update TypeScript to 5.5.0
- Update Vite to 5.2.0
```

## Guidelines

### For Cloud Agents

- Always use conventional commit format
- Include issue references when applicable
- Be descriptive but concise
- Use appropriate type prefixes
- Reference related branches or PRs in footer if needed

### For Local Development

- Follow same conventions for consistency
- Use descriptive branch names
- Write clear commit messages
- Group related changes in single commits
- Avoid generic messages like "update" or "fix"

### Best Practices

- Keep commits atomic (one logical change per commit)
- Write commit messages in present tense, imperative mood
- Reference issues and PRs when applicable
- Use scope to indicate affected area
- Break large changes into multiple commits when logical

### What to Avoid

- Generic branch names: `update`, `fix`, `changes`
- Vague commit messages: `fix bug`, `update code`, `changes`
- Mixing concerns in single commit
- Commit messages without type prefix
- Branches without type prefix

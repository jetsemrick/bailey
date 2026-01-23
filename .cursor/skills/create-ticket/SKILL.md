---
name: create-ticket
description: Generate Linear Ticket
disable-model-invocation: true
---

# Generate Linear Ticket

Generate a Linear ticket with proper formatting, including repository information, branch details, and task description. The agent must read the Linear configuration file and include required metadata at the top of the ticket.

## Prerequisites

1. **Read Linear Configuration**: Always read `configs/linear.config.json` to understand the project context, team, and project settings before generating the ticket.
2. **Determine Repository Information**: Identify the repository name, base branch, and generate an appropriate new branch name for the work.

## Required Ticket Format

Every Linear ticket MUST start with the following metadata section at the very top:

```markdown
---
Repository: [repository-name]
Base Branch: [base-branch-name]
New Branch: [new-branch-name]
---
```

### Metadata Requirements

- **Repository**: The full repository name (e.g., `owner/repo-name` or just `repo-name` if owner is clear from context)
- **Base Branch**: The branch this work will be based on (typically `main`, `master`, `develop`, or a feature branch)
- **New Branch**: A descriptive branch name following Linear's naming convention (e.g., `Feature: add-user-authentication`, `Bug: login-error`, `Feature: refactor-api-endpoints`)

## Steps

1. **Read Linear Config**:
  - Read `configs/linear.config.json` to get team and project information
  - Note the target team and project from the config
2. **Determine Repository Context**:
  - Check the current workspace path or git remote to identify the repository
  - If git is available, use `git remote get-url origin` to get the repository name
  - Extract repository name from the remote URL (e.g., `git@github.com:owner/repo.git` → `owner/repo`)
3. **Identify Base Branch**:
  - Check the current git branch or default branch
  - Use `git branch --show-current` or `git symbolic-ref refs/remotes/origin/HEAD` to determine the base branch
  - Default to `main` if unable to determine
4. **Generate Branch Name**:
   - Create a descriptive branch name based on the ticket content
   - Follow Linear's naming convention: `Feature: description` for new features, `Bug: description` for bug fixes
   - Use kebab-case for the description part (lowercase with hyphens)
   - Keep it concise but descriptive (e.g., `Feature: add-dark-mode-toggle`, `Bug: fix-login-error`)
5. **Generate Ticket Content**:
  - Start with the metadata section (Repository, Base Branch, New Branch)
  - Include a clear, descriptive title
  - Add detailed description of the work to be done
  - Include acceptance criteria if applicable
  - Add any relevant context, links, or references

## Ticket Structure

```markdown
---
Repository: [repo-name]
Base Branch: [base-branch]
New Branch: [new-branch-name]
---

# [Ticket Title]

## Description
[Detailed description of what needs to be done]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Additional Context
[Any relevant context, links, or notes]
```

## Example

```markdown
---
Repository: cursor-101
Base Branch: main
New Branch: Feature: add-user-authentication
---

# Add User Authentication System

## Description
Implement a complete user authentication system including login, registration, and session management. The system should support email/password authentication and JWT tokens for session management.

## Acceptance Criteria
- [ ] User can register with email and password
- [ ] User can login with valid credentials
- [ ] JWT tokens are generated and validated
- [ ] Protected routes require authentication
- [ ] Session persists across page refreshes

## Additional Context
- Use JWT for token management
- Store tokens in httpOnly cookies for security
- Reference design system colors from `.cursor/rules/design.mdc`
```

## Important Notes

- **ALWAYS** include the metadata section at the top of every ticket
- **ALWAYS** read `configs/linear.config.json` before generating the ticket
- **ALWAYS** verify repository and branch information before including in metadata
- Use the team and project from `linear.config.json` when creating the ticket in Linear
- Branch names should follow Linear's naming convention: `Feature: description` or `Bug: description`
- If repository information cannot be determined, use `[TBD]` and note that it needs to be filled in manually

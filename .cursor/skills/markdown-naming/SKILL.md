---
name: markdown-naming
description: Naming conventions for markdown files across the project, including Cursor configuration files and general documentation. Use when creating or renaming any .md or .mdc files.
---

Naming Conventions for Markdown Files

These conventions ensure consistent, discoverable naming for all markdown files across the project. Use kebab-case (lowercase with hyphens) for all filenames.

## Cursor Configuration Files

- Rules (`.cursor/rules/*.mdc`):
  Pattern: {domain}-{purpose}.mdc
  Description: Domain prefix (e.g., design, api, git) with optional purpose for clarity.
  Examples: design.mdc, api-security.mdc, git-workflow.mdc

- Subagents (`.cursor/agents/*.md`):
  Pattern: {role}-{specialization}.md
  Description: Role prefix (e.g., backend, frontend, code) and specialization suffix.
  Examples: backend-eng.md, code-reviewer.md, test-writer.md

- Commands (`.cursor/commands/*.md`):
  Pattern: {action}-{target}.md
  Description: Action performed and its target, using kebab-case.
  Examples: create-ticket.md, generate-types.md, update-status.md

- Skills (`~/.cursor/skills-cursor/{name}/SKILL.md`):
  Pattern: {action}-{target} (directory name)
  Description: Action verb and target noun, using kebab-case. Each skill is a directory containing SKILL.md.
  Examples: create-rule, create-skill, update-cursor-settings, create-subagent

## General Documentation Files

- Documentation (any `*.md`):
  Pattern: {topic}-{type}.md or {topic}.md
  Description: Descriptive topic name, optionally with type suffix (guide, reference, recommendations).
  Examples: NAMING.md, SUBAGENT_RECOMMENDATIONS.md, api-reference.md, getting-started.md

- README files:
  Pattern: README.md (always uppercase)
  Description: Standard name for project or directory documentation.
  Examples: README.md (root), docs/README.md (directory-specific)

## General Guidelines

- Always use kebab-case (lowercase with hyphens)
- Be descriptive but concise (2-4 words typically)
- Avoid abbreviations unless widely understood
- Use consistent patterns within each category

## Important: Creating Markdown Files

**Be cautious when creating new markdown files.** Only create markdown files when:
- Explicitly requested by the user
- Required for Cursor configuration (rules, subagents, commands)
- Essential project documentation (README, critical guides)

**Avoid creating markdown files for:**
- Temporary notes or documentation
- Code comments or explanations that belong in code
- Documentation that could be added to existing files
- One-off explanations that don't need permanent files

When in doubt, ask the user before creating a new markdown file. Prefer updating existing documentation over creating new files.

Use these conventions for all new files; refactor existing ones if needed for alignment.

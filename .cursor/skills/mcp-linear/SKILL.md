---
name: mcp-linear
description: Guidelines for using Linear MCP tools. Always reference linear.config.json for default team and project settings.
---
# Linear MCP Usage Rules

## Configuration
Always check `configs/linear.config.json` for default team and project settings before creating or querying Linear issues

## When Creating Issues
- Use the team from `configs/linear.config.json` (`target.team`) unless explicitly specified otherwise
- Use the project from `configs/linear.config.json` (`target.project`) when creating issues for the demo project
- For team parameter, use the team name (e.g., "Demosphere") or team ID if needed

## When Querying Issues
- Default to filtering by the team specified in `linear.config.json` when listing issues

## Issue Formatting
- **Title Format**: Always prefix feature tickets with "Feature: " (e.g., "Feature: add endpoint 'api/history'")
- Use clear, descriptive titles
- Include steps to reproduce for bugs
- Describe expected vs actual behavior
- Note impact/severity when relevant
- Do not include code implementation details in bug reports unless specifically requested

## Common Commands
- `list_issues`: Query issues by team, project, assignee, or status
- `get_issue`: Retrieve detailed issue information by ID or identifier (e.g., "DEMO-90")
- `create_issue`: Create new issues using team/project from config
- `update_issue`: Update existing issues

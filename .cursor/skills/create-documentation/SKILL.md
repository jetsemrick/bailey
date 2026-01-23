---
name: create-documentation
description: Generate Terminal Commands Documentation
disable-model-invocation: true
---

# Generate Terminal Commands Documentation

Generate comprehensive documentation for all terminal commands registered in the `backend/commands/` directory. If documentation already exists in `backend/commands/README.md`, update it with the latest command information.

## Steps

1. **Scan command files**: Read all Python files in `backend/commands/` directory (excluding `__init__.py`)

2. **Extract command metadata**: For each command file, extract:
   - Command name(s) and aliases
   - Description
   - Category
   - Function docstring (if available)
   - Arguments/usage information from the function signature and implementation

3. **Organize by category**: Group commands by their category (e.g., `builtin`, `filesystem`, `system`, etc.)

4. **Generate documentation**: Create or update `backend/commands/README.md` with:
   - Overview section explaining the command system
   - Quick start guide for adding commands
   - Complete command reference organized by category
   - For each command, include:
     - Command name and aliases
     - Description
     - Usage examples (if applicable)
     - Arguments/parameters
     - Notes or special behavior

5. **Format**: Use clear markdown formatting with:
   - Proper headings hierarchy
   - Code blocks for examples
   - Tables for command listings (if helpful)
   - Clear sections for each category

6. **Preserve existing content**: If `README.md` exists, preserve the "Quick Start" and "Adding Custom Commands" sections, but update the command reference sections with current information.

## Command Reference Format

For each command, document:
- **Name**: Primary command name
- **Aliases**: Alternative names (if any)
- **Category**: Command category
- **Description**: Short description
- **Usage**: Command syntax and examples
- **Arguments**: Required/optional arguments
- **Notes**: Any special behavior or limitations

## Example Output Structure

```markdown
# Terminal Commands Reference

[Overview and quick start sections]

## Command Reference

### Built-in Commands
- `echo` - Print text to terminal
- `clear` - Clear terminal screen
- `help` - Show available commands

### Filesystem Commands
- `ls` - List directory contents
- `cd` - Change working directory
...

[Detailed documentation for each command]
```

Generate the documentation now, ensuring it's comprehensive, accurate, and well-formatted.

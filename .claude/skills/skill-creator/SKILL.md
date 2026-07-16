---
name: skill-creator
description: How to create or update project-local Claude skills in this repo. Use when asked to add a new skill, change an existing one, or organize .claude/skills.
---

# Skill Creator

## Purpose
Keep ApplyPilot's project skills consistent, discoverable, and safe to
check into the repo.

## When to use
Adding a new skill under `.claude/skills/`, editing an existing one, or
restructuring the skills index.

## Workflow
1. Check `.claude/SKILLS.md` and existing skills first — extend an existing skill instead of creating an overlapping one.
2. Create `.claude/skills/<kebab-case-name>/SKILL.md` with YAML frontmatter:
   - `name`: matches the directory name.
   - `description`: one sentence of what it does **plus when to use it** — this line is how the skill gets discovered, so include trigger words.
3. Use the house structure: Purpose, When to use, Workflow (numbered), Constraints, Verification. Keep the whole file concise (under ~60 lines); a skill is a checklist, not a book.
4. Ground every rule in this repo: name real files, commands, and existing examples rather than generic advice.
5. Add one line to `.claude/SKILLS.md` and, if it belongs in a combination, update that section.
6. Commit `.claude/` changes with a `chore:` message.

## Constraints
- Markdown only — no hooks, scripts, executables, or network calls inside skills.
- Never include secrets, tokens, URLs with credentials, or personal data.
- Project skills live in `.claude/skills/` (checked in); never write to `~/.claude`.
- Don't claim capabilities or features the repo doesn't have.

## Verification
- Frontmatter parses (three-dash fences, `name` + `description` present).
- `name` matches the directory; directory is kebab-case.
- The index lists the new skill.
- `git diff --check` reports no whitespace errors.

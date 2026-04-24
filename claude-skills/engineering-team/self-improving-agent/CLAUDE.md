# Self-Improving Agent — Claude Code Instructions

Plugin curates Claude Code auto-memory into durable project knowledge.

## Commands

Use `/si:` namespace:

- `/si:review` — Analyze auto-memory health and find promotion candidates
- `/si:promote <pattern>` — Graduate learning to CLAUDE.md or `.claude/rules/`
- `/si:extract <pattern>` — Create reusable skill from proven pattern
- `/si:status` — Quick memory health dashboard
- `/si:remember <knowledge>` — Explicitly save to auto-memory

## How auto-memory works

Claude Code maintains `~/.claude/projects/<project-path>/memory/MEMORY.md` automatically. First 200 lines load every session. When too large, Claude moves details into topic files like `debugging.md` or `patterns.md`.

Plugin reads that directory — never creates own storage.

## When to use each command

### After feature or debug session
```
/si:review
```
Check if anything learned should become permanent rule.

### When pattern keeps coming up
```
/si:promote "Always run migrations before tests in this project"
```
Moves from MEMORY.md (background note) to CLAUDE.md (enforced rule).

### When you solved non-obvious problem that could help other projects
```
/si:extract "Docker build fix for ARM64 platform mismatch"
```
Creates standalone skill with SKILL.md, ready to install elsewhere.

### To check memory capacity
```
/si:status
```
Shows line counts, topic files, stale entries, recommendations.

## Key principle

**Don't fight auto-memory — orchestrate it.**

- Auto-memory captures patterns. Let it work.
- Plugin adds judgment: what's worth keeping, what promotes, what's stale.
- Promoted rules in CLAUDE.md have higher priority than MEMORY.md entries.
- Removing promoted entries from MEMORY.md frees space for new learnings.

## Agents

- **memory-analyst**: Spawned by `/si:review` to analyze patterns across memory files
- **skill-extractor**: Spawned by `/si:extract` to generate complete skill packages

## Hooks

`error-capture.sh` fires on `PostToolUse` (Bash only). Detects command failures, appends structured entries to auto-memory. Zero overhead on successful commands.

Install via `/plugin install self-improving-agent@claude-code-skills` — hook registers automatically from `.claude-plugin/hooks.json`. No manual config needed.

Manual wiring (e.g. copied skill directly instead of plugin install) — use `${CLAUDE_PLUGIN_ROOT}` so path resolves against plugin root, not current working directory:

```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/error-capture.sh"
      }]
    }]
  }
}
```

**Do not use relative path like `./hooks/error-capture.sh`** — Claude Code resolves hook commands against user's current working directory, not plugin root. Relative path silently fails (non-blocking) every session started outside plugin install dir.
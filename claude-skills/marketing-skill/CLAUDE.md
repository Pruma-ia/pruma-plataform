# Marketing Skills — Agent Instructions

## For All Agents (Claude Code, Codex CLI, OpenClaw)

43 marketing skills, organized into specialist pods.

### How to Use

1. **Start with routing:** Read `marketing-ops/SKILL.md` — routing matrix maps requests to right skill.
2. **Check context:** If `marketing-context.md` exists, read it first. Brand voice, personas, competitive landscape.
3. **Load ONE skill:** Read only needed specialist SKILL.md. Never bulk-load.

### Skill Map

- `marketing-context/` — Run first, capture brand context
- `marketing-ops/` — Router (read to know where to go)
- `content-production/` — Write content (blog posts, articles, guides)
- `content-strategy/` — Plan content
- `ai-seo/` — Optimize for AI search (ChatGPT, Perplexity, Google AI)
- `seo-audit/` — Traditional SEO audit
- `page-cro/` — Conversion rate optimization
- `pricing-strategy/` — Pricing and packaging
- `content-humanizer/` — Fix AI-sounding content
- `x-twitter-growth/` — X/Twitter growth, tweet composing, competitor analysis

### Python Tools

32 scripts, stdlib-only. Run directly:
```bash
python3 <skill>/scripts/<tool>.py [args]
```
No pip install. Scripts include embedded samples for demo mode (run with no args).

### Anti-Patterns

❌ Don't read all 43 SKILL.md files
❌ Don't skip marketing-context.md if it exists
❌ Don't use content-creator (deprecated → use content-production)
❌ Don't install pip packages for Python tools
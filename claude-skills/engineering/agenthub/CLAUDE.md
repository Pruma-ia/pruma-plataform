# AgentHub — Claude Code Instructions

Plugin enables multi-agent collaboration. Spawn N parallel subagents competing on same task, evaluate results, merge winner.

## Commands

Use `/hub:` namespace for all commands:

- `/hub:init` — Create collaboration session (task, agent count, eval criteria)
- `/hub:spawn` — Launch N parallel subagents in isolated worktrees (supports `--template`)
- `/hub:status` — Show DAG state, agent progress, branch status
- `/hub:eval` — Rank agent results by metric or LLM judge
- `/hub:merge` — Merge winning branch, archive losers
- `/hub:board` — Read/write agent message board
- `/hub:run` — One-shot lifecycle: init → baseline → spawn → eval → merge

## How It Works

Coordinator orchestrates N subagents in parallel:

1. `/hub:init` — define task, agent count, eval criteria
2. `/hub:spawn` — launch all agents via Agent tool with `isolation: "worktree"`
3. Each agent works independently in own git worktree, commits results, writes to board
4. `/hub:eval` — compare results (eval command per worktree, or LLM-judge diffs)
5. `/hub:merge` — merge best branch into base, tag and archive rest

## Key Principle

**Parallel competition. Immutable history. Best result wins.**

Agents never see each other's work. Every approach preserved in git DAG. Coordinator evaluates objectively, merges only winner.

## Agents

- **hub-coordinator** — Dispatches tasks, monitors progress, evaluates results, merges winner. YOUR role as main Claude Code session.

## Branch Naming

```
hub/{session-id}/agent-{N}/attempt-{M}
```

## Message Board

Agents communicate via `.agenthub/board/` markdown files:
- `dispatch/` — task assignments from coordinator
- `progress/` — status updates from agents
- `results/` — final result summaries from agents

## When to Use

- User says "try multiple approaches" or "have agents compete"
- Optimization tasks where different strategies might win
- Code generation where solution diversity helps
- Competing content drafts — 3 agents write blog posts or landing page copy, LLM judge picks best
- Research synthesis — agents explore different source sets or analytical frameworks
- Process optimization — agents propose competing workflow improvements
- Feature prioritization — agents build different RICE/ICE scoring models
- Any task benefiting from parallel exploration
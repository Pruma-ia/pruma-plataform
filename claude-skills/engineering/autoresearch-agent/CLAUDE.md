# Autoresearch Agent — Claude Code Instructions

Plugin runs autonomous experiment loops that optimize any file by measurable metric.

## Commands

Use `/ar:` namespace for all commands:

- `/ar:setup` — Set up new experiment interactively
- `/ar:run` — Run single experiment iteration
- `/ar:loop` — Start autonomous loop with user-selected interval
- `/ar:status` — Show dashboard and results
- `/ar:resume` — Resume paused experiment

## How it works

AI agent = experiment loop. Scripts handle evaluation and git rollback.

1. Edit target file with ONE change
2. Commit it
3. Call `run_experiment.py --single` — evaluates, prints KEEP/DISCARD/CRASH
4. Repeat

Results persist in `results.tsv` and git log. Sessions resumable.

## When to use each command

### Starting fresh
```
/ar:setup
```
Creates experiment directory, config, program.md, results.tsv, git branch.

### Running one iteration at a time
```
/ar:run engineering/api-speed
```
Read history, make one change, evaluate, report result.

### Autonomous background loop
```
/ar:loop engineering/api-speed
```
Prompts for interval (10min, 1h, daily, weekly, monthly), creates recurring job.

### Checking progress
```
/ar:status
```
Dashboard across all experiments with metrics and trends.

### Resuming after context limit or break
```
/ar:resume engineering/api-speed
```
Reads results history, checks out branch, continues where left off.

## Agents

- **experiment-runner**: Spawned per loop iteration. Reads config, results history, decides what to try, edits target, commits, evaluates.

## Key principle

**One change per experiment. Measure everything. Compound improvements.**

Agent never modifies evaluator. Evaluator = ground truth.
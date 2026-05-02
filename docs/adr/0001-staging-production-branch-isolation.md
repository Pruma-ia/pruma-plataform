# ADR-0001: Staging/Production Branch Isolation with Neon Branching

**Date**: 2026-05-02
**Status**: accepted
**Deciders**: Marcelo Mattioli

## Context

Pruma IA deploys Next.js 16 on Vercel with Drizzle ORM against Neon PostgreSQL. Until now, every merge to `master` triggered CI that ran `db:migrate` directly against the production database and deployed to Vercel `--prod`. This caused repeated production incidents:

- Drizzle journal desync: SQL files committed without a matching entry in `_journal.json` were silently skipped by `migrate()`, leaving the production schema diverged from the codebase with no error.
- `when` field ordering bugs: migrations with a `when` timestamp lower than the previous entry were silently skipped because the migrator uses `ORDER BY created_at DESC LIMIT 1` as a high watermark.
- No staging validation: there was no environment to catch migration failures before they hit production data.

## Decision

We adopt a two-branch, two-environment model:

- `master` is the staging branch: CI deploys to a Vercel preview environment and runs `db:migrate` against a dedicated Neon `staging` branch (forked from production `main`).
- `production` is the release branch: CI deploys to Vercel `--prod` and runs `db:migrate` against Neon `main`. Pushes to `production` happen only via PR from `master`.
- Every CI deploy job — staging and production — first validates migrations against an ephemeral Neon branch (created from the target parent, tested, then deleted) before touching the real database.
- Concurrency groups (`deploy-staging`, `deploy-production`) serialize deploys to prevent migration race conditions from simultaneous pushes.

## Alternatives Considered

### Alternative 1: Keep deploying from master, add migration dry-run only
- **Pros**: No branching model change needed.
- **Cons**: Dry-run does not catch runtime failures against real data; still no staging environment for functional validation.
- **Why not**: Doesn't solve the root cause — no environment to validate against data before prod.

### Alternative 2: Separate Vercel project for staging (no Neon branching)
- **Pros**: Full environment isolation.
- **Cons**: Staging DB diverges from production over time; migration tests run against different schema than prod, defeating the purpose.
- **Why not**: Neon branching is cheaper and guarantees the staging DB is always a snapshot of production data.

### Alternative 3: Feature flags to decouple deploy from schema changes
- **Pros**: Zero-downtime deploys; schema changes can land before code.
- **Cons**: Significant complexity; requires coordinating flag state with migration state across every schema change.
- **Why not**: Overkill for current team size; Neon branching solves the immediate problem with far less overhead.

## Consequences

### Positive
- Every migration is validated against a Neon preview branch derived from the target DB before touching real data.
- Staging environment provides a functional test gate before releases reach users.
- Concurrency control serializes deployments, eliminating migration race conditions.
- `production` branch protection rules enforce PR review on every release.

### Negative
- Two extra GitHub Actions jobs per push to `master` (Neon branch create/delete + staging deploy).
- Release requires an additional PR step (`master` → `production`).
- Initial one-time setup: Neon `staging` branch creation + `db:baseline` + GitHub Environments config.

### Risks
- **Staging DB drift**: if migrations are applied to staging but `production` PR is never opened, staging schema will diverge. Mitigation: keep `master` → `production` PRs short-lived; no direct commits to `master` after a feature is validated.
- **Neon API flakiness**: ephemeral branch creation could fail. Mitigation: `branch_id` is validated before use; cleanup step is guarded; `timeout-minutes: 20` prevents infinite hangs.

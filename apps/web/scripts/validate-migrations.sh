#!/usr/bin/env bash
set -euo pipefail

MIGRATIONS_DIR="db/migrations"
JOURNAL="$MIGRATIONS_DIR/meta/_journal.json"
errors=0

echo "Checking migration journal sync..."
for f in "$MIGRATIONS_DIR"/*.sql; do
  tag=$(basename "$f" .sql)
  if ! grep -q "\"$tag\"" "$JOURNAL"; then
    echo "  ERROR: $tag not registered in _journal.json"
    errors=1
  fi
done

echo "Checking statement-breakpoints..."
for f in "$MIGRATIONS_DIR"/*.sql; do
  stmt_count=$(grep -cE '^(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE) ' "$f" || true)
  bp_count=$(grep -c 'statement-breakpoint' "$f" || true)
  if [ "$stmt_count" -gt 1 ] && [ "$bp_count" -lt $((stmt_count - 1)) ]; then
    echo "  ERROR: $(basename $f) — $stmt_count statements, $bp_count breakpoints (need $((stmt_count - 1)))"
    errors=1
  fi
done

if [ $errors -eq 0 ]; then
  echo "All migrations valid."
else
  echo ""
  echo "Fix: use 'npx drizzle-kit generate' — never write migration SQL manually."
  exit 1
fi

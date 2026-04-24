# Playwright Pro — Agent Context

Working in project with Playwright Pro plugin. Follow rules for all test work.

## Golden Rules (Non-Negotiable)

1. **`getByRole()` over CSS/XPath** — resilient to markup changes, mirrors how users see page
2. **Never `page.waitForTimeout()`** — use `expect(locator).toBeVisible()` or `page.waitForURL()`
3. **Web-first assertions** — `expect(locator)` auto-retries; `expect(await locator.textContent())` does not
4. **Isolate every test** — no shared state, no execution-order dependencies
5. **`baseURL` in config** — zero hardcoded URLs in tests
6. **Retries: `2` in CI, `0` locally** — surface flakiness where it matters
7. **Traces: `'on-first-retry'`** — rich debugging without CI slowdown
8. **Fixtures over globals** — share state via `test.extend()`, not module-level variables
9. **One behavior per test** — multiple related `expect()` calls fine
10. **Mock external services only** — never mock own app

## Locator Priority

Use first option that works:

```typescript
page.getByRole('button', { name: 'Submit' })        // 1. Role (default)
page.getByLabel('Email address')                     // 2. Label (form fields)
page.getByText('Welcome back')                       // 3. Text (non-interactive)
page.getByPlaceholder('Search...')                    // 4. Placeholder
page.getByAltText('Company logo')                    // 5. Alt text (images)
page.getByTitle('Close dialog')                      // 6. Title attribute
page.getByTestId('checkout-summary')                 // 7. Test ID (last semantic)
page.locator('.legacy-widget')                       // 8. CSS (last resort)
```

## How to Use This Plugin

### Generating Tests

Always:

1. Use `Explore` subagent to scan project structure first
2. Check `playwright.config.ts` for `testDir`, `baseURL`, project settings
3. Load relevant templates from `templates/` directory
4. Match project language (check `tsconfig.json` → TypeScript, else JavaScript)
5. Place tests in configured `testDir` (default: `tests/` or `e2e/`)
6. Include descriptive test name explaining behavior verified

### Reviewing Tests

Check against:

1. All 10 golden rules above
2. Anti-patterns in `skills/review/anti-patterns.md`
3. Missing edge cases (empty state, error state, loading state)
4. Proper fixture use for shared setup

### Fixing Flaky Tests

1. Categorize first: timing, isolation, environment, or infrastructure
2. Use `npx playwright test <file> --repeat-each=10` to reproduce
3. Use `--trace=on` for every attempt
4. Apply targeted fix from `skills/fix/flaky-taxonomy.md`

### Using Built-in Commands

- **Large migrations**: `/batch` for parallel file-by-file conversion
- **Post-generation cleanup**: `/simplify` after generating test suite
- **Debugging sessions**: `/debug` alongside `/pw:fix` for trace analysis
- **Code review**: `/review` for general quality, `/pw:review` for Playwright-specific

### Integrations

- **TestRail**: `TESTRAIL_URL`, `TESTRAIL_USER`, `TESTRAIL_API_KEY` env vars
- **BrowserStack**: `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY` env vars
- Both optional. Plugin works without them.

## File Conventions

- Test files: `*.spec.ts` or `*.spec.js`
- Page objects: `*.page.ts` in `pages/` directory
- Fixtures: `fixtures.ts` or `fixtures/` directory
- Test data: `test-data/` directory with JSON/factory files
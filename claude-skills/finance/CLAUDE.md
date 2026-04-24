# Finance Skills - Claude Code Guidance

Finance skills + Python automation tools.

## Finance Skills Overview

**Available Skills:**
1. **financial-analyst/** - Financial statement analysis, ratio analysis, DCF valuation, budgeting, forecasting (4 Python tools)
2. **saas-metrics-coach/** - SaaS financial health: ARR, MRR, churn, CAC, LTV, NRR, Quick Ratio, 12-month projections (3 Python tools)

**Total Tools:** 7 Python automation tools, 5 knowledge bases, 6 templates

**Commands:** 2 (`/financial-health`, `/saas-health`)

## Python Automation Tools

### 1. Ratio Calculator (`financial-analyst/scripts/ratio_calculator.py`)

**Purpose:** Calculate + interpret financial ratios from statement data

**Features:**
- Profitability ratios (ROE, ROA, Gross/Operating/Net Margin)
- Liquidity ratios (Current, Quick, Cash)
- Leverage ratios (Debt-to-Equity, Interest Coverage, DSCR)
- Efficiency ratios (Asset/Inventory/Receivables Turnover, DSO)
- Valuation ratios (P/E, P/B, P/S, EV/EBITDA, PEG)
- Built-in interpretation + benchmarking

**Usage:**
```bash
python financial-analyst/scripts/ratio_calculator.py financial_data.json
python financial-analyst/scripts/ratio_calculator.py financial_data.json --format json
```

### 2. DCF Valuation (`financial-analyst/scripts/dcf_valuation.py`)

**Purpose:** Discounted Cash Flow enterprise + equity valuation

**Features:**
- Revenue + cash flow projections
- WACC calculation (CAPM-based)
- Terminal value (perpetuity growth + exit multiple methods)
- Enterprise + equity value derivation
- Two-way sensitivity analysis
- No external dependencies (uses math/statistics)

**Usage:**
```bash
python financial-analyst/scripts/dcf_valuation.py valuation_data.json
python financial-analyst/scripts/dcf_valuation.py valuation_data.json --format json
```

### 3. Budget Variance Analyzer (`financial-analyst/scripts/budget_variance_analyzer.py`)

**Purpose:** Analyze actual vs budget vs prior year performance

**Features:**
- Variance calc (actual vs budget, actual vs prior year)
- Materiality threshold filtering
- Favorable/unfavorable classification
- Department + category breakdown

**Usage:**
```bash
python financial-analyst/scripts/budget_variance_analyzer.py budget_data.json
python financial-analyst/scripts/budget_variance_analyzer.py budget_data.json --format json
```

### 4. Forecast Builder (`financial-analyst/scripts/forecast_builder.py`)

**Purpose:** Driver-based revenue forecasting + cash flow projection

**Features:**
- Driver-based revenue forecast model
- 13-week cash flow projection
- Scenario modeling (base/bull/bear)
- Trend analysis from historical data

**Usage:**
```bash
python financial-analyst/scripts/forecast_builder.py forecast_data.json
python financial-analyst/scripts/forecast_builder.py forecast_data.json --format json
```

## Quality Standards

**All finance Python tools must:**
- Standard library only (math, statistics, json, argparse)
- JSON + human-readable output via `--format` flag
- Clear error messages for invalid input
- Appropriate exit codes
- Local file processing (no API calls)
- argparse CLI with `--help`

## Related Skills

- **C-Level:** Strategic financial decisions -> `../c-level-advisor/`
- **Business & Growth:** Revenue ops, sales metrics -> `../business-growth/`
- **Product Team:** Budget allocation, RICE scoring -> `../product-team/`

---

**Last Updated:** March 2026
**Skills Deployed:** 2/2 finance skills production-ready
**Total Tools:** 7 Python automation tools
**Commands:** /financial-health, /saas-health
# Business & Growth Skills - Claude Code Guidance

3 production-ready skills + Python automation tools.

## Business & Growth Skills Overview

**Available Skills:**
1. **customer-success-manager/** - Customer health scoring, churn risk analysis, expansion opportunities (3 Python tools)
2. **sales-engineer/** - Technical discovery, RFP analysis, competitive positioning, POC planning (3 Python tools)
3. **revenue-operations/** - Pipeline analysis, forecast accuracy, GTM efficiency metrics (3 Python tools)

**Total Tools:** 9 Python automation tools, 9 knowledge bases, 19+ templates

## Python Automation Tools

### Customer Success Manager Tools

#### 1. Health Score Calculator (`customer-success-manager/scripts/health_score_calculator.py`)

**Purpose:** Multi-dimensional health scoring + trend analysis

**Features:**
- Weighted scoring: 4 dimensions (usage, engagement, support, relationship)
- Red/Yellow/Green classification, configurable thresholds
- Trend analysis: current vs previous period
- Segment benchmarking (Enterprise/Mid-Market/SMB)

**Usage:**
```bash
python customer-success-manager/scripts/health_score_calculator.py customer_data.json
python customer-success-manager/scripts/health_score_calculator.py customer_data.json --format json
```

#### 2. Churn Risk Analyzer (`customer-success-manager/scripts/churn_risk_analyzer.py`)

**Purpose:** Identify at-risk accounts + intervention recommendations

**Features:**
- Risk scoring from behavioral signals
- Warning signal detection + categorization
- Tier-appropriate intervention playbooks
- Urgency-based prioritization

**Usage:**
```bash
python customer-success-manager/scripts/churn_risk_analyzer.py customer_data.json
python customer-success-manager/scripts/churn_risk_analyzer.py customer_data.json --format json
```

#### 3. Expansion Opportunity Scorer (`customer-success-manager/scripts/expansion_opportunity_scorer.py`)

**Purpose:** Identify upsell + cross-sell opportunities

**Features:**
- Adoption depth analysis across product modules
- Whitespace mapping for unused features
- Revenue opportunity estimation
- Priority ranking by effort + impact

**Usage:**
```bash
python customer-success-manager/scripts/expansion_opportunity_scorer.py customer_data.json
python customer-success-manager/scripts/expansion_opportunity_scorer.py customer_data.json --format json
```

### Sales Engineer Tools

#### 4. RFP Response Analyzer (`sales-engineer/scripts/rfp_response_analyzer.py`)

**Purpose:** Score RFP/RFI coverage + identify gaps

**Features:**
- Requirement coverage scoring (Full/Partial/Planned/Gap)
- Effort estimation per requirement
- Gap identification + mitigation strategies
- Overall bid/no-bid recommendation

**Usage:**
```bash
python sales-engineer/scripts/rfp_response_analyzer.py rfp_data.json
python sales-engineer/scripts/rfp_response_analyzer.py rfp_data.json --format json
```

#### 5. Competitive Matrix Builder (`sales-engineer/scripts/competitive_matrix_builder.py`)

**Purpose:** Feature comparison matrices + competitive positioning

**Features:**
- Feature-by-feature comparison matrix
- Competitive scoring, weighted categories
- Differentiator identification
- Battlecard-ready output

**Usage:**
```bash
python sales-engineer/scripts/competitive_matrix_builder.py competitive_data.json
python sales-engineer/scripts/competitive_matrix_builder.py competitive_data.json --format json
```

#### 6. POC Planner (`sales-engineer/scripts/poc_planner.py`)

**Purpose:** Plan proof-of-concept engagements

**Features:**
- Timeline estimation by scope
- Resource allocation planning
- Success criteria definition
- Evaluation scorecard generation

**Usage:**
```bash
python sales-engineer/scripts/poc_planner.py poc_data.json
python sales-engineer/scripts/poc_planner.py poc_data.json --format json
```

### Revenue Operations Tools

#### 7. Pipeline Analyzer (`revenue-operations/scripts/pipeline_analyzer.py`)

**Purpose:** Pipeline health + velocity analysis

**Features:**
- Coverage ratio (pipeline/quota)
- Stage conversion rate analysis
- Sales velocity metrics (4-lever model)
- Deal aging analysis

**Usage:**
```bash
python revenue-operations/scripts/pipeline_analyzer.py pipeline_data.json
python revenue-operations/scripts/pipeline_analyzer.py pipeline_data.json --format json
```

#### 8. Forecast Accuracy Tracker (`revenue-operations/scripts/forecast_accuracy_tracker.py`)

**Purpose:** Measure + improve forecast accuracy

**Features:**
- MAPE (Mean Absolute Percentage Error) calculation
- Forecast bias detection (over/under-forecasting)
- Period-over-period trend analysis
- Category-level accuracy breakdown

**Usage:**
```bash
python revenue-operations/scripts/forecast_accuracy_tracker.py forecast_data.json
python revenue-operations/scripts/forecast_accuracy_tracker.py forecast_data.json --format json
```

#### 9. GTM Efficiency Calculator (`revenue-operations/scripts/gtm_efficiency_calculator.py`)

**Purpose:** Go-to-market efficiency metrics

**Features:**
- Magic number calculation
- LTV:CAC ratio analysis
- CAC payback period
- Burn multiple assessment
- Industry benchmarking

**Usage:**
```bash
python revenue-operations/scripts/gtm_efficiency_calculator.py gtm_data.json
python revenue-operations/scripts/gtm_efficiency_calculator.py gtm_data.json --format json
```

## Quality Standards

**All business & growth Python tools must:**
- Standard library only (no external dependencies)
- JSON + human-readable output via `--format` flag
- Clear error messages for invalid input
- Appropriate exit codes
- Local file processing (no API calls)
- argparse CLI with `--help`

## Related Skills

- **Marketing:** Content creation, demand generation -> `../marketing-skill/`
- **Product Team:** User research, feature prioritization -> `../product-team/`
- **C-Level:** Strategic planning -> `../c-level-advisor/`
- **Engineering:** Technical implementation -> `../engineering-team/`

---

**Last Updated:** February 2026
**Skills Deployed:** 3/3 business & growth skills production-ready
**Total Tools:** 9 Python automation tools
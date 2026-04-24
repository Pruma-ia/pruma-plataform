# Product Team Skills - Claude Code Guidance

16 production-ready product skills + Python automation tools.

## Product Skills Overview

**Available Skills:**
1. **product-manager-toolkit/** - RICE prioritization, customer interview analysis (2 tools)
2. **agile-product-owner/** - User story generation, sprint planning (1 tool)
3. **product-strategist/** - OKR cascade, strategic planning (1 tool)
4. **ux-researcher-designer/** - Persona generation, user research (1 tool)
5. **ui-design-system/** - Design token generation, component systems (1 tool)
6. **competitive-teardown/** - Competitive matrix building, gap analysis (1 tool)
7. **landing-page-generator/** - Landing page scaffolding (1 tool)
8. **saas-scaffolder/** - SaaS project bootstrapping (1 tool)
9. **product-analytics/** - KPI design, retention/cohort/funnel analysis (1 tool)
10. **experiment-designer/** - Experiment design and sample size planning (1 tool)
11. **product-discovery/** - Discovery frameworks and assumption mapping (1 tool)
12. **roadmap-communicator/** - Roadmap communication and changelog generation (1 tool)
13. **code-to-prd/** - Reverse-engineer codebase into PRD (2 tools: codebase_analyzer, prd_scaffolder)
14. **research-summarizer/** - Research synthesis and summarization (1 tool)
15. **apple-hig-expert/** - Apple HIG compliance and design (1 tool: hig_checker)
16. **spec-to-repo/** - Convert spec doc into scaffolded repo

**Total Tools:** 17 Python automation tools

**Agents:** 5 (cs-product-manager, cs-agile-product-owner, cs-product-strategist, cs-ux-researcher, cs-product-analyst)

**Slash Commands:** 8 (/rice, /okr, /persona, /user-story, /competitive-matrix, /prd, /sprint-plan, /code-to-prd)

## Python Automation Tools

### 1. RICE Prioritizer (`product-manager-toolkit/scripts/rice_prioritizer.py`)

RICE framework for feature prioritization.

**Formula:** (Reach × Impact × Confidence) / Effort

**Features:** portfolio analysis, quarterly roadmap gen, capacity planning (story points or dev days), CSV input/output for Jira/Linear, JSON export for dashboards

```bash
# Basic prioritization
python product-manager-toolkit/scripts/rice_prioritizer.py features.csv

# With capacity planning
python product-manager-toolkit/scripts/rice_prioritizer.py features.csv --capacity 20

# JSON output
python product-manager-toolkit/scripts/rice_prioritizer.py features.csv --output json
```

```csv
feature,reach,impact,confidence,effort
User Dashboard,500,3,0.8,5
API Rate Limiting,1000,2,0.9,3
Dark Mode,300,1,1.0,2
```

### 2. Customer Interview Analyzer (`product-manager-toolkit/scripts/customer_interview_analyzer.py`)

NLP-based interview transcript analysis.

**Features:** pain point extraction with severity scoring, feature request ID, sentiment analysis, theme extraction, JTBD pattern recognition

```bash
# Analyze transcript
python product-manager-toolkit/scripts/customer_interview_analyzer.py interview.txt

# JSON output
python product-manager-toolkit/scripts/customer_interview_analyzer.py interview.txt json
```

### 3. User Story Generator (`agile-product-owner/scripts/user_story_generator.py`)

INVEST-compliant user story generation.

**Features:** sprint planning with capacity allocation, epic breakdown, acceptance criteria gen, story point estimation, priority scoring

```bash
# Interactive mode
python agile-product-owner/scripts/user_story_generator.py

# Sprint planning (30 story points)
python agile-product-owner/scripts/user_story_generator.py sprint 30
```

### 4. OKR Cascade Generator (`product-strategist/scripts/okr_cascade_generator.py`)

Automated OKR hierarchy (company → product → team).

**Features:** alignment scoring (vertical + horizontal), strategy templates (growth, retention, revenue, innovation), key result tracking, progress visualization

```bash
# Growth strategy OKRs
python product-strategist/scripts/okr_cascade_generator.py growth

# Retention strategy
python product-strategist/scripts/okr_cascade_generator.py retention
```

### 5. Persona Generator (`ux-researcher-designer/scripts/persona_generator.py`)

Data-driven persona creation from user research.

```bash
python ux-researcher-designer/scripts/persona_generator.py
python ux-researcher-designer/scripts/persona_generator.py --output json
```

### 6. Design Token Generator (`ui-design-system/scripts/design_token_generator.py`)

Complete design token system from brand color.

```bash
python ui-design-system/scripts/design_token_generator.py "#0066CC" modern css
python ui-design-system/scripts/design_token_generator.py "#0066CC" modern scss
python ui-design-system/scripts/design_token_generator.py "#0066CC" modern json
```

### 7. Competitive Matrix Builder (`competitive-teardown/scripts/competitive_matrix_builder.py`)

Weighted competitive scoring with gap analysis.

```bash
python competitive-teardown/scripts/competitive_matrix_builder.py competitors.json
```

### 8. Landing Page Scaffolder (`landing-page-generator/scripts/landing_page_scaffolder.py`)

Production-ready landing pages as Next.js/React TSX components with Tailwind CSS (default) or plain HTML.

**Features:** TSX default (Next.js 14+ App Router + Tailwind), 4 styles (`dark-saas`, `clean-minimal`, `bold-startup`, `enterprise`), 7 section generators, copy frameworks: PAS, AIDA, BAB

```bash
python landing-page-generator/scripts/landing_page_scaffolder.py config.json --format tsx
python landing-page-generator/scripts/landing_page_scaffolder.py config.json --format html
```

### 9. Project Bootstrapper (`saas-scaffolder/scripts/project_bootstrapper.py`)

SaaS project scaffolding with auth, billing, API setup.

```bash
python saas-scaffolder/scripts/project_bootstrapper.py project_config.json
```

### 10. Metrics Calculator (`product-analytics/scripts/metrics_calculator.py`)

Product analytics — retention, cohort, funnel analysis.

**Features:** retention curve from event data, funnel conversion with stage drop-off, cohort grouping + comparison

```bash
# Retention analysis
python product-analytics/scripts/metrics_calculator.py retention events.csv

# Funnel analysis
python product-analytics/scripts/metrics_calculator.py funnel funnel.csv --stages visit,signup,activate,pay

# KPI summary
python product-analytics/scripts/metrics_calculator.py kpi metrics.csv --json
```

### 11. Sample Size Calculator (`experiment-designer/scripts/sample_size_calculator.py`)

Statistical sample size planning for A/B tests.

**Features:** MDE calculation, absolute + relative effect size modes, power analysis with configurable alpha/beta

```bash
# Absolute MDE
python experiment-designer/scripts/sample_size_calculator.py --baseline-rate 0.12 --mde 0.02 --mde-type absolute

# Relative MDE
python experiment-designer/scripts/sample_size_calculator.py --baseline-rate 0.12 --mde 0.15 --mde-type relative

# Custom power/significance
python experiment-designer/scripts/sample_size_calculator.py --baseline-rate 0.12 --mde 0.02 --alpha 0.01 --power 0.9
```

### 12. Assumption Mapper (`product-discovery/scripts/assumption_mapper.py`)

Map + prioritize product assumptions for discovery validation.

**Features:** risk × uncertainty scoring, CSV input with structured fields, categorization by type (desirability, viability, feasibility, usability)

```bash
python product-discovery/scripts/assumption_mapper.py assumptions.csv
python product-discovery/scripts/assumption_mapper.py assumptions.csv --json
```

### 13. Changelog Generator (`roadmap-communicator/scripts/changelog_generator.py`)

Structured changelogs from git commit history.

**Note:** Requires `git` on PATH — run inside git repo.

```bash
python roadmap-communicator/scripts/changelog_generator.py --from v1.0.0 --to HEAD
python roadmap-communicator/scripts/changelog_generator.py --from v1.0.0 --to v2.0.0 --json
```

## Product Workflows

### Workflow 1: Feature Prioritization to Sprint Execution

```bash
python product-manager-toolkit/scripts/rice_prioritizer.py features.csv --capacity 30
python agile-product-owner/scripts/user_story_generator.py sprint 30
```

### Workflow 2: Strategy to Team-Level OKRs

```bash
python product-strategist/scripts/okr_cascade_generator.py growth --json > okrs.json
```

### Workflow 3: Research to Persona Artifacts

```bash
python ux-researcher-designer/scripts/persona_generator.py json > personas.json
```

### Workflow 4: Brand-Aligned Landing Page

```bash
python ../marketing-skill/content-production/scripts/brand_voice_analyzer.py website_copy.txt --format json > voice.json
python ui-design-system/scripts/design_token_generator.py "#0066CC" modern css
python landing-page-generator/scripts/landing_page_scaffolder.py config.json --format tsx
python competitive-teardown/scripts/competitive_matrix_builder.py competitors.json
```

### Workflow 5: Product Analytics and Experimentation

```bash
python product-analytics/scripts/metrics_calculator.py retention events.csv
python product-analytics/scripts/metrics_calculator.py funnel funnel.csv --stages visit,signup,activate,pay
python experiment-designer/scripts/sample_size_calculator.py --baseline-rate 0.12 --mde 0.02 --mde-type absolute
```

### Workflow 6: Discovery and Opportunity Validation

```bash
python product-discovery/scripts/assumption_mapper.py assumptions.csv
```

### Workflow 7: Roadmap and Release Communication

```bash
python roadmap-communicator/scripts/changelog_generator.py --from v1.0.0 --to HEAD
```

## Quality Standards

All product Python tools must: CLI-first for automation, interactive + batch modes, JSON output for integration, stdlib only, actionable recommendations.

## Additional Resources

- **Main Documentation:** `../CLAUDE.md`
- **Marketing Brand Voice:** `../marketing-skill/content-production/scripts/brand_voice_analyzer.py`

---

**Last Updated:** April 9, 2026 | **Skills:** 16/16 production-ready | **Tools:** 17 | **Agents:** 5 | **Commands:** 8
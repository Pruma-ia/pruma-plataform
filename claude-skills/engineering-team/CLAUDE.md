# Engineering Team Skills - Claude Code Guidance

36 production-ready engineering skills + Python automation tools.

## Engineering Skills Overview

**Core Engineering (16 skills):**
- senior-architect, senior-frontend, senior-backend, senior-fullstack
- senior-qa, senior-devops, senior-secops
- code-reviewer, senior-security
- aws-solution-architect, ms365-tenant-manager, google-workspace-cli, tdd-guide, tech-stack-evaluator, epic-design
- **a11y-audit** — WCAG 2.2 accessibility audit + fix (a11y_scanner.py, contrast_checker.py)
- **azure-cloud-architect** — Azure infra design, ARM/Bicep templates, landing zones
- **gcp-cloud-architect** — GCP infra design, Terraform modules, cloud-native patterns
- **security-pen-testing** — Pen testing methodology, vuln assessment, exploit analysis
- **snowflake-development** — Snowflake DW dev, SQL optimization, data pipeline patterns

**Security (5 skills):**
- **adversarial-reviewer** — Adversarial code review, 3 hostile personas (Saboteur, New Hire, Security Auditor)
- **threat-detection** — Hypothesis-driven threat hunting, IOC sweep, z-score anomaly detection
- **incident-response** — SEV1-SEV4 triage, 14-type incident taxonomy, NIST SP 800-61 forensics
- **cloud-security** — IAM privilege escalation paths, S3 public access checks, security group detection
- **red-team** — MITRE ATT&CK kill-chain planning, effort scoring, choke point ID
- **ai-security** — ATLAS-mapped prompt injection detection, model inversion & data poisoning risk scoring

**AI/ML/Data (5 skills):**
- senior-data-scientist, senior-data-engineer, senior-ml-engineer
- senior-prompt-engineer, senior-computer-vision

**Total Tools:** 39+ Python automation tools

## Core Engineering Tools

### 1. Project Scaffolder (`senior-fullstack/scripts/project_scaffolder.py`)

**Purpose:** Production-ready project scaffolding for modern stacks

**Supported Stacks:**
- Next.js + GraphQL + PostgreSQL
- React + REST + MongoDB
- Vue + GraphQL + MySQL
- Express + TypeScript + PostgreSQL

**Features:**
- Docker Compose config
- CI/CD pipeline (GitHub Actions)
- Testing infra (Jest, Cypress)
- TypeScript + ESLint + Prettier
- DB migrations

**Usage:**
```bash
# Create new project
python senior-fullstack/scripts/project_scaffolder.py my-project --type nextjs-graphql

# Start services
cd my-project && docker-compose up -d
```

### 2. Code Quality Analyzer (`senior-fullstack/scripts/code_quality_analyzer.py`)

**Purpose:** Code quality analysis + metrics

**Features:**
- Security vuln scanning
- Performance issue detection
- Test coverage assessment
- Docs quality
- Dependency analysis
- Actionable recommendations

**Usage:**
```bash
# Analyze project
python senior-fullstack/scripts/code_quality_analyzer.py /path/to/project

# JSON output
python senior-fullstack/scripts/code_quality_analyzer.py /path/to/project --json
```

**Output:**
```
Code Quality Report:
- Overall Score: 85/100
- Security: 90/100 (2 medium issues)
- Performance: 80/100 (3 optimization opportunities)
- Test Coverage: 75% (target: 80%)
- Documentation: 88/100

Recommendations:
1. Update lodash to 4.17.21 (CVE-2020-8203)
2. Optimize database queries in UserService
3. Add integration tests for payment flow
```

### 3. Fullstack Scaffolder (`senior-fullstack/scripts/fullstack_scaffolder.py`)

**Purpose:** Rapid fullstack app generation

**Usage:**
```bash
python senior-fullstack/scripts/fullstack_scaffolder.py my-app --stack nextjs-graphql
```

## AI/ML/Data Tools

### Data Science Tools

**Experiment Designer** (`senior-data-scientist/scripts/experiment_designer.py`)
- A/B test design, statistical power analysis, sample size calc

**Feature Engineering Pipeline** (`senior-data-scientist/scripts/feature_engineering_pipeline.py`)
- Automated feature gen, correlation analysis, feature selection

**Statistical Analyzer** (`senior-data-scientist/scripts/statistical_analyzer.py`)
- Hypothesis testing, causal inference, regression analysis

### Data Engineering Tools

**Pipeline Orchestrator** (`senior-data-engineer/scripts/pipeline_orchestrator.py`)
- Airflow DAG gen, Spark job templates, data quality checks

**Data Quality Validator** (`senior-data-engineer/scripts/data_quality_validator.py`)
- Schema validation, null check enforcement, anomaly detection

**ETL Generator** (`senior-data-engineer/scripts/etl_generator.py`)
- ETL workflows, CDC patterns, incremental loading

### ML Engineering Tools

**Model Deployment Pipeline** (`senior-ml-engineer/scripts/model_deployment_pipeline.py`)
- Containerized model serving, REST API gen, load balancing config

**MLOps Setup Tool** (`senior-ml-engineer/scripts/mlops_setup_tool.py`)
- MLflow config, model versioning, drift monitoring

**LLM Integration Builder** (`senior-ml-engineer/scripts/llm_integration_builder.py`)
- OpenAI API integration, prompt templates, response parsing

### Prompt Engineering Tools

**Prompt Optimizer** (`senior-prompt-engineer/scripts/prompt_optimizer.py`)
- Prompt A/B testing, token optimization, few-shot example gen

**RAG System Builder** (`senior-prompt-engineer/scripts/rag_system_builder.py`)
- Vector DB setup, embedding gen, retrieval strategies

**Agent Orchestrator** (`senior-prompt-engineer/scripts/agent_orchestrator.py`)
- Multi-agent workflows, tool calling patterns, state management

### Computer Vision Tools

**Vision Model Trainer** (`senior-computer-vision/scripts/vision_model_trainer.py`)
- Object detection (YOLO, Faster R-CNN), semantic segmentation, transfer learning

**Inference Optimizer** (`senior-computer-vision/scripts/inference_optimizer.py`)
- Model quantization, TensorRT optimization, ONNX export

**Video Processor** (`senior-computer-vision/scripts/video_processor.py`)
- Frame extraction, object tracking, scene detection

## Tech Stack Patterns

### Frontend (React/Next.js)
- TypeScript strict mode, component-driven architecture, atomic design
- State: Zustand/Jotai
- Testing: Jest + React Testing Library

### Backend (Node.js/Express)
- Clean architecture, dependency injection, repository pattern, DDD
- Testing: Jest + Supertest

### Fullstack Integration
- GraphQL for API layer, REST for external services, WebSocket for real-time
- Redis for caching, PostgreSQL for persistence

## Development Workflows

### Workflow 1: New Project Setup

```bash
# 1. Scaffold project
python senior-fullstack/scripts/project_scaffolder.py my-app --type nextjs-graphql

# 2. Start services
cd my-app && docker-compose up -d

# 3. Run migrations
npm run migrate

# 4. Start development
npm run dev
```

### Workflow 2: Code Quality Check

```bash
# 1. Analyze codebase
python senior-fullstack/scripts/code_quality_analyzer.py ./

# 2. Fix security issues
npm audit fix

# 3. Run tests
npm test

# 4. Build production
npm run build
```

### Workflow 3: ML Model Deployment

```bash
# 1. Setup MLOps infrastructure
python senior-ml-engineer/scripts/mlops_setup_tool.py

# 2. Deploy model
python senior-ml-engineer/scripts/model_deployment_pipeline.py model.pkl

# 3. Monitor performance
# Check MLflow dashboard
```

## Quality Standards

All engineering tools must:
- Support modern stacks (Next.js, React, Vue, Express)
- Generate production-ready code
- Include testing infra
- Provide Docker configs
- Support CI/CD integration

## Integration Patterns

### GitHub Actions CI/CD

All scaffolders generate GitHub Actions workflows:
```yaml
.github/workflows/
├── test.yml          # Run tests on PR
├── build.yml         # Build and lint
└── deploy.yml        # Deploy to production
```

### Docker Compose

Multi-service dev environment:
```yaml
services:
  - app (Next.js)
  - api (GraphQL)
  - db (PostgreSQL)
  - redis (Cache)
```

## Additional Resources

- **Quick Start:** `START_HERE.md`
- **Team Structure:** `TEAM_STRUCTURE_GUIDE.md`
- **Engineering Roadmap:** `engineering_skills_roadmap.md` (if exists)
- **Main Docs:** `../CLAUDE.md`

---

**Last Updated:** March 31, 2026
**Skills Deployed:** 36 engineering skills production-ready
**Total Tools:** 39+ Python automation tools across core + AI/ML/Data + epic-design + a11y

---

## epic-design

Cinematic 2.5D interactive websites with scroll storytelling, parallax depth, premium animations. Asset inspection pipeline, 45+ techniques across 8 categories, accessibility built-in.

**Key features:**
- 6-layer depth system, automatic parallax
- 13 text animation techniques, 9 scroll patterns
- Asset inspection with background judgment rules
- Python tool for automated image analysis
- WCAG 2.1 AA compliant (reduced-motion)

**Use for:** Product launches, portfolio sites, SaaS marketing pages, event sites, Apple-style animations

**Live demo:** [epic-design-showcase.vercel.app](https://epic-design-showcase.vercel.app/)
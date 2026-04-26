# Backlog de PRDs — Pruma IA

Documentos de requisitos ordenados por prioridade RICE.

| # | Feature | Status | RICE Score | Esforço |
|---|---------|--------|-----------|---------|
| 1 | [Login com Google](login-google.md) | 📋 Pronto para dev | 666 | S |
| 2 | [Integração Asaas](integracao-asaas.md) | 📝 PRD pendente | 300 | L |
| 3 | [Refactor Fluxos em Execução](refactor-flow-runs.md) | 📝 PRD pendente | 100 | L |

## Status

- 📋 Pronto para dev — PRD aprovado, pode entrar no sprint
- 🚧 Em desenvolvimento
- ✅ Entregue
- 📝 PRD pendente — feature mapeada, documento não escrito ainda
- 🔍 Em discovery

## Como adicionar nova feature

1. Criar arquivo `docs/prd/nome-da-feature.md` usando o template abaixo
2. Adicionar linha na tabela acima
3. Rodar o RICE prioritizer para atualizar ordenação:

```bash
python3 ~/.claude/skills/product-manager-toolkit/scripts/rice_prioritizer.py docs/prd/pruma_backlog.csv --capacity 10
```

## Template One-Page PRD

```markdown
# PRD — [Nome da Feature]

**Status:** | **Prioridade:** | **Esforço estimado:**

## Problema
## Solução
## Escopo (dentro / fora)
## Fluxo do usuário
## Requisitos técnicos
## Métricas de sucesso
## Riscos
## Dependências
```

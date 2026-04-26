# docs/prd — Regras de PRD

## Responsabilidade desta pasta
Backlog priorizado de features. Fonte de verdade sobre O QUÊ e POR QUÊ — não COMO implementar.

## Regras obrigatórias

### Ao criar novo PRD
1. Criar arquivo `nome-da-feature.md` usando o template do `README.md`
2. Adicionar linha na tabela do `README.md` na posição correta por RICE score
3. Adicionar linha no `pruma_backlog.csv` com os valores RICE
4. Rodar o prioritizer para confirmar ordenação:
   ```bash
   python3 ~/.claude/skills/product-manager-toolkit/scripts/rice_prioritizer.py docs/prd/pruma_backlog.csv --capacity 10
   ```

### Ao iniciar desenvolvimento de uma feature
- Atualizar status no `README.md` para 🚧 Em desenvolvimento

### Ao entregar uma feature
- Atualizar status no `README.md` para ✅ Entregue

## O que NÃO pertence a PRD
- Como implementar (vai em comentários de código ou tech spec)
- Detalhes de UI/componentes (vai no código ou Figma)
- Histórico de mudanças (vai no git)
- Valores hardcoded (preços, IDs, endpoints)

## O que PERTENCE a PRD
- Problema que a feature resolve e quem sente
- Escopo claro: dentro e fora do MVP
- Métricas de sucesso mensuráveis
- Riscos e mitigações
- Dependências externas (APIs, times, decisões pendentes)

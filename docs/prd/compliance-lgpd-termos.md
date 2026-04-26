# PRD — Compliance LGPD: Termos, Privacidade e DPA

**Status:** ✅ Entregue (pendências abaixo) | **Prioridade:** P0 | **Esforço estimado:** M (2 dias dev + redação jurídica externa) | **RICE Score:** 500

---

## Problema

Pruma opera sem Política de Privacidade, Termos de Uso ou DPA. Isso é:
1. **Ilegal** — LGPD (Lei 13.709/2018) exige desde 2020. Multa: até 2% do faturamento, máx R$50M por infração.
2. **Risco comercial** — empresas B2B exigem DPA antes de assinar contrato.
3. **Risco de WhatsApp** — Meta exige opt-in explícito e política de privacidade publicada para uso da API oficial.

---

## Solução

Publicar documentos legais, adicionar aceite no cadastro e criar fluxo de consentimento para comunicações (email/WhatsApp).

---

## Escopo

**Dentro:**
- Página `/privacy` — Política de Privacidade (LGPD-compliant)
- Página `/terms` — Termos de Uso
- Página `/dpa` — Data Processing Agreement (para clientes B2B)
- Checkbox de aceite obrigatório no `/register` e `/onboarding`
- Campo `acceptedTermsAt` em `users` (timestamp do aceite)
- Consentimento explícito para comunicações de marketing (opt-in separado de transacional)
- Link no rodapé do painel: Privacidade | Termos | DPA
- Aviso em emails e WhatsApp: "Nunca solicitamos senhas ou dados sensíveis"

**Fora:**
- Gestão de cookies avançada (CMP completo — escopo separado)
- Tradução para inglês (v1 em PT-BR)
- Portal do titular de dados self-service (escopo separado)

---

## O que os documentos devem cobrir (para o jurídico)

### Política de Privacidade
- Dados coletados: nome, email, telefone, CNPJ, IP, dados de aprovações, logs
- Base legal de cada tratamento (contrato, legítimo interesse, consentimento)
- Suboperadores: Neon (DB), Vercel (hosting), Asaas (pagamentos), Google (OAuth), Meta (WhatsApp), Resend (email)
- Retenção: approvals por 5 anos (compliance fiscal), logs por 90 dias, dados do usuário enquanto conta ativa + 30 dias após exclusão
- Direitos do titular: acesso, correção, exclusão, portabilidade, revogação de consentimento
- Contato DPO: privacidade@pruma.ia
- Prazo de notificação de incidente: 72h para ANPD, 24h para o controlador (cliente B2B)

### Termos de Uso
- Definição do serviço e limitações
- Responsabilidades do cliente (dados que trafegam pelo n8n são de responsabilidade dele)
- SLA e disponibilidade
- Política de cancelamento e reembolso
- Uso aceitável (proibições: spam, conteúdo ilegal via aprovações)
- Propriedade intelectual
- Limitação de responsabilidade

### DPA (Data Processing Agreement)
- Pruma como operadora, cliente como controlador
- Finalidade: operar painel de aprovações e fluxos
- Suboperadores listados e aceitos
- Obrigações de segurança (criptografia, acesso restrito)
- Procedimento de incidente: notificação em 24h ao controlador
- Direito de auditoria (mediante solicitação, 30 dias de aviso)
- Duração: vinculada ao contrato de serviço

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Páginas estáticas `/privacy`, `/terms`, `/dpa` | ❌ Falta |
| Campo `acceptedTermsAt` em `users` (migration) | ❌ Falta |
| Campo `marketingConsent` em `users` (boolean) | ❌ Falta |
| Checkbox aceite obrigatório no register/onboarding | ❌ Falta |
| Links no rodapé do dashboard | ❌ Falta |
| Disclaimer em templates de email | ❌ Falta |
| Redação jurídica (terceiro especializado em LGPD + SaaS BR) | ❌ Falta |

---

## Métricas de sucesso

- 100% dos novos usuários com `acceptedTermsAt` preenchido
- Zero usuários sem aceite explícito após deploy
- DPA disponível para download por clientes B2B

---

## Riscos

| Risco | Mitigação |
|---|---|
| Template genérico não cobre especificidades do produto | Contratar jurídico especializado — não usar template da internet |
| Usuários existentes sem aceite | Migration: exibir modal de aceite na próxima sessão |
| WhatsApp API recusada por ausência de política | Política publicada em URL pública antes de solicitar acesso Meta |

---

## Dependências

- Redação jurídica externa (não é dev — precisa de advogado LGPD)
- Página pública acessível antes de solicitar WhatsApp Business API (Meta exige)

---

## Pendências pós-entrega

Itens bloqueados por decisão externa — dev não pode resolver sozinho:

| Item | Bloqueio | Ação |
|---|---|---|
| Substituir `[CNPJ]` nas páginas legais | CNPJ ainda não disponível | Preencher quando CNPJ sair |
| Substituir `[ENDEREÇO COMPLETO]` nas páginas legais | Endereço legal da empresa | Preencher quando definido |
| Substituir `[NOME DO DPO]` nas páginas legais | DPO não nomeado ainda | Preencher após nomeação |
| Criar mailbox `privacidade@pruma.ia` | Infraestrutura de email | Criar antes de publicar política |
| Remover disclaimer "RASCUNHO — pendente revisão jurídica" | Revisão por advogado LGPD | Remover após sign-off jurídico |

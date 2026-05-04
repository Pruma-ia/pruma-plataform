# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-02
**Phase:** 1-Foundation
**Areas discussed:** Gate do OTP, Onboarding Checklist, Dashboard Métricas, Logo

---

## Gate do OTP

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect completo via proxy.ts | emailVerified no JWT; se false → /verify-email | ✓ |
| Acesso parcial (read-only) | Acesso com banner, cada ação checa flag | |
| Banner sem bloqueio | Acesso total com aviso | |

**User's choice:** Redirect completo via proxy.ts

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cai em /verify-email diretamente | Register → /verify-email | ✓ |
| Dashboard com redirect automático | Register → /dashboard → proxy redireciona | |

**User's choice:** /verify-email diretamente pós-registro

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mostrar erro, deixar reenviar | Erro na UI, botão reenvio após 60s | ✓ |
| Invalidar sessão, voltar para /register | Mais agressivo, força re-registro | |

**User's choice:** Mostrar erro, deixar reenviar

---

| Option | Description | Selected |
|--------|-------------|----------|
| 15 minutos | Padrão de mercado | ✓ |
| 1 hora | Mais generoso, janela maior | |

**User's choice:** 15 minutos

**Notes:** Usuário confirmou que não há usuários reais em prod → sem migração necessária. "podemos apagar e começar a vida nova"

---

## Onboarding Checklist

| Option | Description | Selected |
|--------|-------------|----------|
| Derivado do DB | flows.count + approvals.count; zero schema change | ✓ |
| Coluna/tabela explícita | Mais flexível, exige migração | |

**User's choice:** Derivado do DB

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 itens (conectar + fluxo + aprovação) | Mapeiam para flows.count e approvals.count | ✓ |
| Adicionar mais um item | Ex: convidar membro | |

**User's choice:** Sim, esses 3

---

| Option | Description | Selected |
|--------|-------------|----------|
| Todos os membros | Sem checar role | ✓ |
| Só owner/admin | Requer checar session.user.role | |

**User's choice:** Todos os membros

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nenhum fluxo + nenhuma aprovação | flows.count=0 AND approvals.count=0 | ✓ |
| Flag onboardingComplete na org | Coluna explícita, exige migração | |

**User's choice:** Nenhum fluxo + nenhuma aprovação

**Notes:** Insight crítico revelado nesta área — "quem cria o fluxo no n8n é a equipe da Pruma, o cliente depende da Pruma para fazer isso" e "o cliente nem sabe que existe um n8n por baixo dos panos". Isso mudou o framing dos itens do checklist.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Status passivo (itens na perspectiva do cliente) | "Integração configurada", "Processo configurado", etc. | ✓ |
| Ações do cliente | "Conectar n8n", "Criar fluxo" — implica que o cliente faz | |

**User's choice:** Direcionar item 1 para WhatsApp de suporte (freeform response)

**Notes:** "vamos direcionar para o whatsapp de suporte" — item 1 = CTA para WhatsApp do suporte Pruma. Auto-marca ao clicar.

---

## Dashboard Métricas

| Option | Description | Selected |
|--------|-------------|----------|
| UTC no servidor | Simples, aceitável para clientes BR | ✓ |
| UTC-3 fixo (Horário de Brasília) | Hardcoded, quebra no horário de verão histórico | |

**User's choice:** UTC no servidor

---

| Option | Description | Selected |
|--------|-------------|----------|
| Últimos 30 dias | Relevante operacionalmente | ✓ |
| Todo o histórico | Pode distorcer | |

**User's choice:** Últimos 30 dias

---

| Option | Description | Selected |
|--------|-------------|----------|
| Exibir "—" (travessão) | Sem confundir com "0 minutos" | ✓ |
| Exibir "0 min" | Tecnicamente impreciso | |

**User's choice:** Exibir "—" com tooltip

---

## Logo

| Option | Description | Selected |
|--------|-------------|----------|
| Upload de arquivo via R2 | Mesmo padrão de presigned URL de approval_files | ✓ |
| Campo de URL | Zero infraestrutura extra, menos intuitivo | |

**User's choice:** Upload via R2

---

| Option | Description | Selected |
|--------|-------------|----------|
| PNG/JPG/WebP, máx 2MB | Formatos comuns, tamanho generoso | ✓ |
| Qualquer imagem, máx 5MB | Menos restritivo | |

**User's choice:** PNG/JPG/WebP, máx 2MB

---

| Option | Description | Selected |
|--------|-------------|----------|
| Header do dashboard | Logo visível para todos os membros | ✓ |
| Só na página de settings | Menos valor percebido | |

**User's choice:** Header do dashboard

---

## Claude's Discretion

- **PROF-02 (contas conectadas):** View-only. Disconnect em fase futura.
- **INFRA-01 (Upstash):** Migrar authRateMap + billingRateMap + novos endpoints OTP. Usar Upstash free tier.

## Deferred Ideas

- Disconnect de conta conectada (PROF-02): guard "último método de auth" necessário, deixar para fase futura.
- Preview/crop de logo client-side: útil mas não necessário para MVP.

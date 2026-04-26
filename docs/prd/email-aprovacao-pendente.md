# PRD — Notificação por Email de Aprovação Pendente

**Status:** 📋 Pronto para dev | **Prioridade:** P0 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 550

---

## Problema

Aprovações chegam via n8n mas usuários não são notificados. Sem email, o cliente precisa abrir o painel manualmente para saber se há algo pendente — quebra o value prop central do produto. É a reclamação #1 esperada de qualquer cliente pagante na semana 1.

---

## Solução

Enviar email para todos os membros com permissão de aprovar (`owner`, `admin`, `member`) quando uma nova aprovação chegar via webhook n8n.

---

## Escopo

**Dentro:**
- Email disparado no `POST /api/n8n/approvals` após inserção no banco
- Destinatários: membros da org com role owner/admin/member (não viewer)
- Conteúdo: título da aprovação, nome do fluxo, botão "Ver aprovação" (link direto)
- Disclaimer obrigatório: "A Pruma nunca solicita senhas ou dados sensíveis por email"
- Provider: Resend (simples, Next.js friendly, plano free suficiente para início)
- Template HTML branded (cores Pruma)

**Fora:**
- Notificações por WhatsApp (PRD separado)
- Preferências granulares por usuário (escopo separado)
- Digest / resumo diário (escopo separado)
- Notificação de aprovação resolvida (escopo separado)

---

## Fluxo do usuário

```
n8n → POST /api/n8n/approvals
    → approval inserida no banco
    → busca membros da org (owner/admin/member)
    → envia email para cada um via Resend
    → email contém: título, fluxo, botão "Revisar agora"
    → usuário clica → /approvals/[id]
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Conta Resend + domínio verificado (notifications@pruma.ia) | ❌ Falta |
| `RESEND_API_KEY` no Vercel env | ❌ Falta |
| Template HTML email (branded) | ❌ Falta |
| Disparo no `POST /api/n8n/approvals` após insert | ❌ Falta |
| Query membros elegíveis por org | ❌ Falta |
| Erro de email não bloqueia criação da aprovação (fire-and-forget) | ❌ Falta |

---

## Métricas de sucesso

- Tempo médio de resolução de aprovação: redução mensurável vs baseline
- Taxa de abertura de email: >40% (benchmark SaaS transacional)
- Tickets "não vi a aprovação": zero

---

## Riscos

| Risco | Mitigação |
|---|---|
| Email cai em spam | Domínio verificado SPF/DKIM no Resend + remetente dedicado |
| Muitas aprovações = spam de email | Rate limit por org: máx 1 email por aprovação, não agrupar em v1 |
| Erro Resend bloqueia criação | Fire-and-forget: logar erro, não propagar exception |

---

## Dependências

- Verificação de email (`verificacao-email-telefone.md`) — email não verificado não recebe notificação
- Conta Resend criada e domínio configurado antes de iniciar dev

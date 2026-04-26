# PRD — WhatsApp: Notificação e Aprovação

**Status:** 🔍 Em discovery | **Prioridade:** P2 | **Esforço estimado:** L (8–10 dias) | **RICE Score:** 100

---

## Problema

Email e in-app exigem que o usuário abra o computador. WhatsApp é o canal de comunicação principal do Brasil — cliente que precisa aprovar urgentemente está no celular. Aprovação por WhatsApp reduz tempo de resposta de horas para minutos e é diferencial competitivo direto.

---

## Solução

Notificação via WhatsApp quando aprovação chega, com link assinado que abre a aprovação já autenticada no browser. Aprovação acontece na UI web (não via reply) para garantir segurança e auditabilidade.

**Arquitetura escolhida: link assinado (v1)**
```
Aprovação criada → WhatsApp com link JWT de curto prazo
→ usuário clica → /approvals/[id]?token=xxx → autenticado → aprova
```
Reply-based ("APROVAR 123456") fica para v2, após validar adoção.

---

## Escopo

**Dentro:**
- Integração Meta Cloud API (WhatsApp Business oficial)
- Número verificado Pruma (não usar número pessoal ou provider não-oficial)
- Envio de mensagem quando `POST /api/n8n/approvals` cria aprovação
- Destinatários: membros com `phoneVerified=true` e role owner/admin/member
- Template de mensagem aprovado pela Meta: título, fluxo, link assinado (JWT 2h)
- Token JWT de aprovação: uso único, TTL 2h, invalidado após click
- Disclaimer obrigatório em toda mensagem: "A Pruma nunca solicita senhas ou dados sensíveis por WhatsApp"
- Log de envio por aprovação (status: sent / failed / delivered)
- Opt-in explícito no perfil: "Receber notificações por WhatsApp" (LGPD + Meta exige)

**Fora:**
- Aprovação por reply (v2)
- WhatsApp para recuperação de senha ou OTP
- Chatbot / atendimento via WhatsApp
- Broadcast / marketing via WhatsApp

---

## Fluxo do usuário

```
Aprovação criada pelo n8n
→ Pruma envia WhatsApp para aprovadores com phone verificado + opt-in ativo:
  "📋 Nova aprovação: [Título]
   Fluxo: [Nome do fluxo]
   Revisar: https://app.pruma.ia/approvals/[id]?t=[JWT]
   
   ⚠️ A Pruma nunca solicita senhas ou dados sensíveis por WhatsApp."
→ Usuário clica → página de aprovação já aberta e autenticada
→ Aprova/rejeita normalmente
→ Token invalidado
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Conta Meta Business API aprovada + número verificado | ❌ Pré-requisito (fora do code) |
| Template de mensagem aprovado pela Meta | ❌ Pré-requisito (process Meta) |
| `META_WHATSAPP_TOKEN` + `META_PHONE_NUMBER_ID` no Vercel env | ❌ Falta |
| Campo `whatsappOptIn: boolean` em `users` | ❌ Falta |
| Campo `phoneVerified` em `users` (PRD verificação) | ❌ Depende de outro PRD |
| `POST /api/whatsapp/send` — envia via Meta Cloud API | ❌ Falta |
| JWT de aprovação: `sign({ approvalId, userId }, secret, { expiresIn: "2h" })` | ❌ Falta |
| Validação do token em `/approvals/[id]` | ❌ Falta |
| Tabela `whatsapp_logs` (approvalId, userId, status, sentAt) | ❌ Falta |
| UI opt-in em `/settings/profile` | ❌ Falta |

### Segurança obrigatória
- Token JWT assinado com secret separado (`WHATSAPP_TOKEN_SECRET`)
- TTL 2h — não reutilizável
- Invalidado no banco após primeiro uso (tabela `used_approval_tokens`)
- Acesso à aprovação pelo token não bypassa verificação de org (usuário deve ser membro)
- Rate limit: máx 1 WhatsApp por aprovação (não reenviar automaticamente)

---

## Métricas de sucesso

- Tempo médio de resolução de aprovação: redução de X% após WhatsApp ativado
- Taxa de opt-in: >60% dos usuários com telefone verificado
- Taxa de click no link: >70% das mensagens enviadas

---

## Riscos

| Risco | Mitigação |
|---|---|
| Meta rejeita template de mensagem | Preparar template seguindo guidelines Meta + ter alternativa email |
| Número Pruma banido (uso indevido) | Usar Meta Cloud API oficial — nunca Evolution/Z-API |
| Token interceptado | TTL curto + uso único + HTTPS |
| Usuário sem `phoneVerified` recebe WhatsApp de terceiro | Bloqueio hard: só enviar se `phoneVerified=true` |
| LGPD: envio sem consentimento | Opt-in explícito obrigatório antes do primeiro envio |

---

## Dependências (bloqueadoras)

1. PRD Verificação de Telefone (`verificacao-email-telefone.md`) — `phoneVerified=true` exigido
2. PRD Compliance LGPD (`compliance-lgpd-termos.md`) — política publicada, Meta exige URL
3. Conta Meta Business API aprovada (processo externo, pode demorar semanas)
4. Template de mensagem aprovado pela Meta (processo externo, 24–72h)

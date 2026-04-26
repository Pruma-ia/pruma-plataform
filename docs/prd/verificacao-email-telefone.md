# PRD — Verificação de Email e Telefone

**Status:** 📋 Pronto para dev | **Prioridade:** P0 | **Esforço estimado:** M (3–4 dias) | **RICE Score:** 320

---

## Problema

Emails e telefones não são verificados no cadastro:
- Email não verificado: notificações vão para endereço errado ou inexistente
- Telefone não verificado: WhatsApp de aprovação pode ir para número de terceiro — risco grave de segurança e LGPD
- Sem verificação: qualquer pessoa pode se cadastrar com email/telefone alheio

---

## Solução

OTP por email no cadastro + OTP por SMS ao adicionar telefone. Fluxo não-bloqueante para email (banner persistente) e bloqueante para telefone antes de ativar WhatsApp.

---

## Escopo

**Dentro:**
- Verificação de email: OTP 6 dígitos enviado no cadastro, válido 15 min
- Banner persistente no dashboard: "Verifique seu email para receber notificações"
- `emailVerified` já existe em `users` — apenas popular corretamente
- Verificação de telefone: OTP 6 dígitos via SMS (Twilio ou Sinch) ao adicionar telefone
- Campo `phoneVerified: boolean` em `users`
- Re-envio de OTP com rate limit (máx 3/hora)

**Fora:**
- Bloqueio de acesso por email não verificado (v1 é não-bloqueante para email)
- Verificação de CNPJ (escopo separado)
- Verificação via chamada de voz

---

## Fluxo do usuário

```
Email:
Cadastro → email com código OTP → /verify-email?token=xxx OU digitar código
→ emailVerified preenchido → banner some

Credentials sem verificação imediata:
Dashboard → banner "Verifique seu email" → clica → reenvio → verifica

Telefone:
/settings/profile → adiciona telefone → SMS com OTP → digita → phoneVerified=true
→ WhatsApp liberado para o número
```

---

## Requisitos técnicos

| Item | Status |
|---|---|
| `email_otps` table (email, codeHash, expiresAt, usedAt) | ❌ Falta |
| `POST /api/auth/send-email-otp` | ❌ Falta |
| `POST /api/auth/verify-email-otp` | ❌ Falta |
| Campo `phoneVerified` em `users` (migration) | ❌ Falta |
| `POST /api/user/send-phone-otp` — envia SMS | ❌ Falta |
| `POST /api/user/verify-phone-otp` | ❌ Falta |
| Banner no dashboard (server component lê `emailVerified`) | ❌ Falta |
| Provider SMS: Twilio ou Sinch (avaliar custo BR) | ❌ Falta |

### Segurança
- OTP: 6 dígitos numéricos gerados com `crypto.randomInt`
- Apenas hash SHA-256 armazenado
- Rate limit: 3 tentativas por OTP, 3 envios por hora por email/telefone
- OTP inválido não revela se email/telefone existe

---

## Métricas de sucesso

- Taxa de verificação de email em 7 dias: >80% dos novos cadastros
- Taxa de verificação de telefone: >60% dos usuários que adicionam telefone

---

## Riscos

| Risco | Mitigação |
|---|---|
| SMS não chega (operadora BR) | Fallback: reenvio + suporte manual temporário |
| Custo SMS escala com base | Monitorar, migrar para WhatsApp OTP via Meta API no futuro |
| Usuário Google: email já verificado pelo OAuth | Marcar `emailVerified` automaticamente no login Google |

---

## Dependências

- Resend configurado (email OTP usa mesmo provider)
- Conta Twilio/Sinch criada com número BR antes de iniciar dev
- PRD Perfil do Usuário (`perfil-usuario.md`) — telefone adicionado lá
- PRD WhatsApp (`whatsapp-notificacao-aprovacao.md`) — exige `phoneVerified=true`

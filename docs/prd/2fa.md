# PRD — Autenticação de Dois Fatores (2FA)

**Status:** 📝 PRD pendente | **Prioridade:** P3 | **Esforço estimado:** L (5–7 dias) | **RICE Score:** 80

---

## Problema

Contas de empresas gerenciam aprovações de processos críticos. Senha comprometida = acesso total a todos os fluxos e aprovações da org. Clientes enterprise e regulados exigem 2FA como pré-requisito para contratar.

---

## Solução

2FA via TOTP (Google Authenticator / Authy) opcional para todos os usuários, obrigatório configurável por org.

---

## Escopo

**Dentro:**
- TOTP (RFC 6238) — compatível com Google Authenticator, Authy, 1Password
- Ativação em `/settings/profile`: QR Code + código de confirmação
- Backup codes (8 códigos de uso único) gerados na ativação
- Login: após credenciais válidas → tela de OTP
- Owner pode tornar 2FA obrigatório para toda a org
- Desativação com confirmação via OTP atual

**Fora:**
- 2FA via SMS (TOTP é mais seguro e sem custo de SMS)
- 2FA para login Google (Google já gerencia 2FA próprio)
- SSO/SAML enterprise

---

## Requisitos técnicos

| Item | Status |
|---|---|
| Lib: `otplib` (TOTP) + `qrcode` (QR) | ❌ Falta |
| Campo `totpSecret` (encrypted) em `users` | ❌ Falta |
| Campo `twoFactorEnabled` em `users` | ❌ Falta |
| Campo `twoFactorRequired` em `organizations` | ❌ Falta |
| Tabela `totp_backup_codes` (userId, codeHash, usedAt) | ❌ Falta |
| Fluxo de ativação em `/settings/profile` | ❌ Falta |
| Middleware de 2FA no login credentials | ❌ Falta |
| `totpSecret` armazenado criptografado (AES-256, `TOTP_ENCRYPTION_KEY` env) | ❌ Falta |

---

## Métricas de sucesso

- Taxa de adoção de 2FA: >30% usuários em 90 dias
- Incidentes de conta comprometida: zero após adoção

---

## Riscos

| Risco | Mitigação |
|---|---|
| Usuário perde acesso ao TOTP e não tem backup codes | Suporte manual com verificação de identidade |
| 2FA obrigatório bloqueia membros que não ativaram | Grace period de 7 dias após owner ativar obrigatoriedade |

---

## Dependências

- PRD Gestão de Senha (`gestao-senha.md`) — só para usuários credentials
- Nenhuma outra dependência técnica

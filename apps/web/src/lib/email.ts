import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")

const FROM = process.env.RESEND_FROM ?? "Pruma IA <noreply@pruma.ia>"

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Redefinição de senha — Pruma IA",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:#0D1B4B;margin-bottom:16px">Redefinição de senha</h2>
        <p style="color:#374151;margin-bottom:24px">
          Recebemos uma solicitação para redefinir a senha da sua conta.
          Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#00AEEF;color:#fff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
          Redefinir senha
        </a>
        <p style="color:#6B7280;font-size:12px;margin-top:32px">
          Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.<br/>
          Nunca solicitamos sua senha por e-mail ou telefone.
        </p>
      </div>
    `,
  })
}

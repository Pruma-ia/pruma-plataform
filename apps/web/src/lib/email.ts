import { Resend } from "resend"
import mjml2html from "mjml"

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")

const FROM = process.env.RESEND_FROM ?? "Pruma IA <noreply@pruma.io>"

async function buildPasswordResetHtml(resetUrl: string): Promise<string> {
  const { html } = await mjml2html(`
    <mjml>
      <mj-head>
        <mj-attributes>
          <mj-all font-family="Inter, Arial, sans-serif" />
        </mj-attributes>
      </mj-head>
      <mj-body background-color="#f1f5f9">

        <mj-section padding="24px 0 0" background-color="#f1f5f9">
          <mj-column></mj-column>
        </mj-section>

        <mj-section background-color="#0D1B4B" border-radius="12px 12px 0 0" padding="28px 40px">
          <mj-column>
            <mj-text font-size="22px" font-weight="800" color="#ffffff" padding="0">
              Pruma<span style="color:#00AEEF">IA</span>
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-section background-color="#ffffff" padding="40px 40px 32px">
          <mj-column>
            <mj-text font-size="20px" font-weight="700" color="#0D1B4B" padding="0 0 12px 0">
              Redefinição de senha
            </mj-text>
            <mj-text font-size="14px" line-height="1.7" color="#4B5563" padding="0 0 16px 0">
              Recebemos uma solicitação para redefinir a senha da sua conta.
              O link expira em <strong>1 hora</strong>.
            </mj-text>
            <mj-button background-color="#00AEEF" color="#ffffff" border-radius="8px"
                       font-weight="700" font-size="14px" inner-padding="13px 32px"
                       href="${resetUrl}" align="left">
              Redefinir senha
            </mj-button>
          </mj-column>
        </mj-section>

        <mj-section background-color="#F8FAFC" border-radius="0 0 12px 12px" padding="24px 40px">
          <mj-column border-top="1px solid #E5E7EB" padding-top="24px">
            <mj-text font-size="12px" color="#9CA3AF" line-height="1.6" padding="0">
              Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.<br/>
              Nunca solicitamos sua senha por e-mail ou telefone.
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-section padding="0 0 24px" background-color="#f1f5f9">
          <mj-column></mj-column>
        </mj-section>

      </mj-body>
    </mjml>
  `)
  return html
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Redefinição de senha — Pruma IA",
    html: await buildPasswordResetHtml(resetUrl),
  })
}

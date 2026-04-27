import { Resend } from "resend"
import nodemailer from "nodemailer"
import mjml2html from "mjml"

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")

const FROM = process.env.RESEND_FROM ?? "Pruma IA <noreply@pruma.io>"

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
    })
  }
  return _transporter
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    await resend.emails.send({ from: FROM, to, subject, html })
  } else {
    await getTransporter().sendMail({ from: FROM, to, subject, html })
  }
}

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
  await sendEmail(email, "Redefinição de senha — Pruma IA", await buildPasswordResetHtml(resetUrl))
}

async function buildApprovalNotificationHtml(
  title: string,
  approvalUrl: string,
  flowName?: string,
  description?: string,
  filenames?: string[]
): Promise<string> {
  const safeTitle = escapeHtml(title)
  const safeFlowName = flowName ? escapeHtml(flowName) : undefined
  const safeDescription = description ? escapeHtml(description) : undefined
  const safeFilenames = filenames?.map(escapeHtml)
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
            <mj-text font-size="20px" font-weight="700" color="#0D1B4B" padding="0 0 8px 0">
              Nova aprovação pendente
            </mj-text>
            <mj-text font-size="16px" font-weight="600" color="#374151" padding="0 0 ${safeFlowName ? "4px" : "20px"} 0">
              ${safeTitle}
            </mj-text>
            ${safeFlowName ? `
            <mj-text font-size="13px" color="#6B7280" padding="0 0 20px 0">
              Fluxo: ${safeFlowName}
            </mj-text>
            ` : ""}
            <mj-text font-size="14px" line-height="1.7" color="#4B5563" padding="0 0 20px 0">
              ${safeDescription ?? "Uma nova aprovação aguarda sua revisão no painel Pruma."}
            </mj-text>
            ${safeFilenames && safeFilenames.length > 0 ? `
            <mj-text font-size="13px" color="#6B7280" padding="0 0 20px 0">
              <strong style="color:#374151">Anexos:</strong><br/>
              ${safeFilenames.map((f) => `• ${f}`).join("<br/>")}
            </mj-text>
            ` : ""}
            <mj-button background-color="#00AEEF" color="#ffffff" border-radius="8px"
                       font-weight="700" font-size="14px" inner-padding="13px 32px"
                       href="${approvalUrl}" align="left">
              Revisar agora
            </mj-button>
          </mj-column>
        </mj-section>

        <mj-section background-color="#F8FAFC" border-radius="0 0 12px 12px" padding="24px 40px">
          <mj-column border-top="1px solid #E5E7EB" padding-top="24px">
            <mj-text font-size="12px" color="#9CA3AF" line-height="1.6" padding="0">
              A Pruma nunca solicita senhas ou dados sensíveis por e-mail.
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

export async function sendApprovalNotificationEmail(
  to: { email: string; name: string | null },
  params: { approvalId: string; title: string; flowName?: string; description?: string; filenames?: string[] }
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pruma.io"
  const approvalUrl = `${appUrl}/approvals/${params.approvalId}`
  await sendEmail(
    to.email,
    `Aprovação pendente: ${params.title}`,
    await buildApprovalNotificationHtml(params.title, approvalUrl, params.flowName, params.description, params.filenames)
  )
}

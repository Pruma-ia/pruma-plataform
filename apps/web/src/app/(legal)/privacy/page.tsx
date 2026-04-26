import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade — Pruma IA",
}

// TODO: substituir antes de publicar
// [CNPJ] → CNPJ real da empresa
// [ENDEREÇO COMPLETO] → endereço da sede
// [NOME DO DPO] → nome do encarregado
// privacidade@pruma.ia → email ainda não criado

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>Política de Privacidade</h1>
      <p className="text-muted-foreground text-sm">Última atualização: 26/04/2026 — <strong>RASCUNHO — pendente revisão jurídica</strong></p>

      <p>
        A Pruma IA, inscrita no CNPJ sob o nº <strong>[CNPJ]</strong>, com sede em <strong>[ENDEREÇO COMPLETO]</strong>{" "}
        (&quot;nós&quot;, &quot;nosso&quot; ou &quot;Controlador&quot;), valoriza a privacidade dos dados pessoais dos usuários e
        representantes das empresas-clientes que utilizam a nossa plataforma SaaS. Esta Política de Privacidade descreve como
        coletamos, usamos, armazenamos e protegemos os dados pessoais em conformidade com a Lei nº 13.709/2018 (LGPD).
      </p>

      <h2>1. Dados Pessoais Coletados</h2>
      <p>Coletamos exclusivamente os seguintes dados pessoais de representantes e usuários vinculados às empresas-clientes:</p>
      <ul>
        <li>Nome completo</li>
        <li>Endereço de e-mail corporativo</li>
        <li>CPF (quando exigido para emissão de notas fiscais ou contratos)</li>
        <li>Cargo e nome da empresa empregadora</li>
        <li>Dados de acesso e logs de utilização da plataforma (endereço IP, timestamps, ações realizadas)</li>
      </ul>

      <h2>2. Finalidades e Base Legal</h2>
      <p>Cada tratamento possui finalidade específica e base legal prevista na LGPD (art. 7º):</p>
      <table>
        <thead>
          <tr><th>Finalidade</th><th>Dados Utilizados</th><th>Base Legal (LGPD)</th></tr>
        </thead>
        <tbody>
          <tr><td>Cadastro e autenticação na plataforma</td><td>Nome, e-mail, CPF</td><td>Execução de contrato — art. 7º, V</td></tr>
          <tr><td>Suporte técnico e atendimento ao cliente</td><td>Nome, e-mail, logs</td><td>Legítimo interesse — art. 7º, IX</td></tr>
          <tr><td>Emissão de nota fiscal e faturamento</td><td>Nome, CPF, e-mail</td><td>Obrigação legal — art. 7º, II</td></tr>
          <tr><td>Segurança e prevenção a fraudes</td><td>IP, logs de acesso</td><td>Legítimo interesse — art. 7º, IX</td></tr>
          <tr><td>Comunicados sobre a plataforma (atualizações, manutenções)</td><td>E-mail</td><td>Execução de contrato — art. 7º, V</td></tr>
          <tr><td>Envio de materiais de marketing (opt-in)</td><td>Nome, e-mail</td><td>Consentimento — art. 7º, I</td></tr>
        </tbody>
      </table>

      <h2>3. Compartilhamento de Dados</h2>
      <p>Os dados pessoais poderão ser compartilhados com os seguintes operadores e terceiros, sob contrato de proteção de dados (DPA):</p>
      <ul>
        <li><strong>Neon</strong> — banco de dados PostgreSQL (hospedagem nos EUA)</li>
        <li><strong>Vercel</strong> — hospedagem e edge runtime (EUA)</li>
        <li><strong>Cloudflare R2</strong> — armazenamento de arquivos de aprovações</li>
        <li><strong>Asaas</strong> — processamento de pagamentos (Brasil)</li>
        <li><strong>Google</strong> — autenticação OAuth</li>
        <li><strong>Resend</strong> — e-mails transacionais</li>
        <li><strong>Meta</strong> — notificações WhatsApp (quando habilitado)</li>
        <li>Autoridades regulatórias e órgãos públicos — quando exigido por lei ou ordem judicial</li>
      </ul>
      <p>Não vendemos dados pessoais a terceiros.</p>

      <h2>4. Transferência Internacional</h2>
      <p>
        Caso dados pessoais sejam transferidos para fora do Brasil (ex.: servidores localizados no exterior), adotamos
        cláusulas contratuais padrão aprovadas pela ANPD ou exigimos que o país destinatário ofereça grau de proteção
        equivalente ao da LGPD, conforme art. 33.
      </p>

      <h2>5. Retenção e Exclusão</h2>
      <p>Mantemos os dados pessoais pelo seguinte período:</p>
      <ul>
        <li>Dados de conta ativa: durante toda a vigência do contrato de uso da plataforma</li>
        <li>Dados após encerramento do contrato: até 5 (cinco) anos para fins contábeis/fiscais e cumprimento de obrigação legal</li>
        <li>Logs de segurança: até 12 (doze) meses, salvo necessidade de investigação de incidente</li>
      </ul>
      <p>Após os prazos acima, os dados são anonimizados ou definitivamente excluídos.</p>

      <h2>6. Direitos do Titular</h2>
      <p>Nos termos do art. 18 da LGPD, o titular (usuário ou representante da empresa-cliente) pode, a qualquer momento:</p>
      <ul>
        <li>Confirmar a existência de tratamento de seus dados</li>
        <li>Acessar os dados que mantemos</li>
        <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei</li>
        <li>Revogar o consentimento (quando aplicável)</li>
        <li>Solicitar a portabilidade dos dados a outro fornecedor</li>
        <li>Obter informações sobre com quem compartilhamos seus dados</li>
      </ul>
      <p>
        Para exercer seus direitos, entre em contato com o nosso Encarregado de Dados (DPO) pelo e-mail:{" "}
        <a href="mailto:privacidade@pruma.ia">privacidade@pruma.ia</a>. Atenderemos sua solicitação em até <strong>15 dias úteis</strong>.
      </p>

      <h2>7. Segurança da Informação</h2>
      <p>Adotamos medidas técnicas e organizacionais adequadas, incluindo:</p>
      <ul>
        <li>Criptografia em trânsito (TLS/HTTPS) e em repouso</li>
        <li>Controle de acesso baseado em funções (RBAC) e autenticação multifator (MFA)</li>
        <li>Monitoramento de segurança e logs de auditoria</li>
        <li>Testes regulares de vulnerabilidade (pentests)</li>
        <li>Plano de resposta a incidentes com notificação à ANPD em até 72 horas, quando exigível</li>
      </ul>

      <h2>8. Encarregado de Dados (DPO)</h2>
      <p>O Encarregado de Dados da Pruma IA é:</p>
      <ul>
        <li><strong>Nome:</strong> [NOME DO DPO]</li>
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@pruma.ia">privacidade@pruma.ia</a></li>
      </ul>

      <h2>9. Alterações nesta Política</h2>
      <p>
        Esta Política pode ser atualizada periodicamente. Em caso de alterações relevantes, notificaremos os usuários por e-mail
        ou por aviso na plataforma com antecedência mínima de 10 (dez) dias.
      </p>

      <h2>10. Foro</h2>
      <p>Fica eleito o foro da Comarca de São Paulo — SP para dirimir quaisquer litígios decorrentes desta Política.</p>

      <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>Aviso:</strong> A Pruma nunca solicita senhas, dados de cartão ou informações sensíveis por e-mail. Se receber
        mensagem suspeita em nosso nome, contate{" "}
        <a href="mailto:privacidade@pruma.ia">privacidade@pruma.ia</a>.
      </div>
    </article>
  )
}

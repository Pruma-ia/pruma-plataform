import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "DPA — Data Processing Agreement — Pruma IA",
}

export default function DpaPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>Data Processing Agreement (DPA)</h1>
      <p className="text-muted-foreground text-sm">Última atualização: abril de 2025 — <strong>RASCUNHO — pendente revisão jurídica</strong></p>

      <p>Este Acordo de Processamento de Dados (&quot;DPA&quot;) complementa os Termos de Uso e regula o tratamento de dados pessoais realizado pela Pruma IA em nome do Cliente, nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>

      <h2>1. Partes e papéis</h2>
      <ul>
        <li><strong>Controlador:</strong> o Cliente que contrata a Pruma IA e determina as finalidades e meios do tratamento dos dados pessoais de seus usuários e aprovadores.</li>
        <li><strong>Operadora:</strong> Pruma IA, que trata dados pessoais em nome do Controlador, conforme suas instruções documentadas.</li>
      </ul>

      <h2>2. Objeto e finalidade do tratamento</h2>
      <p>A Pruma IA trata dados pessoais exclusivamente para:</p>
      <ul>
        <li>Autenticar usuários do painel do Cliente</li>
        <li>Registrar e gerenciar aprovações criadas pelos fluxos n8n do Cliente</li>
        <li>Enviar notificações transacionais relacionadas a aprovações pendentes</li>
        <li>Processar pagamentos e manter o serviço ativo</li>
      </ul>
      <p>Nenhum dado pessoal do Cliente será usado para finalidades próprias da Pruma IA (ex.: publicidade, análise de mercado) sem consentimento explícito do Controlador.</p>

      <h2>3. Categorias de dados e titulares</h2>
      <table>
        <thead>
          <tr><th>Categoria</th><th>Exemplos</th><th>Titulares</th></tr>
        </thead>
        <tbody>
          <tr><td>Dados de identificação</td><td>Nome, e-mail</td><td>Usuários do painel do Cliente</td></tr>
          <tr><td>Dados de aprovações</td><td>Título, decisão, comentários, arquivos</td><td>Aprovadores e solicitantes</td></tr>
          <tr><td>Logs de acesso</td><td>IP, timestamps, ações</td><td>Usuários do painel</td></tr>
        </tbody>
      </table>

      <h2>4. Suboperadores autorizados</h2>
      <p>O Cliente autoriza o uso dos seguintes suboperadores. A Pruma garante que todos têm obrigações de proteção de dados equivalentes às deste DPA:</p>
      <ul>
        <li><strong>Neon</strong> — PostgreSQL (armazenamento principal)</li>
        <li><strong>Vercel</strong> — hospedagem e edge runtime</li>
        <li><strong>Cloudflare R2</strong> — armazenamento de arquivos de aprovações</li>
        <li><strong>Asaas</strong> — processamento de pagamentos</li>
        <li><strong>Google</strong> — autenticação OAuth</li>
        <li><strong>Resend</strong> — e-mails transacionais</li>
        <li><strong>Meta</strong> — notificações WhatsApp (quando habilitado)</li>
      </ul>
      <p>A Pruma notificará o Cliente com 30 dias de antecedência sobre qualquer alteração nos suboperadores.</p>

      <h2>5. Obrigações da Pruma (Operadora)</h2>
      <ul>
        <li>Tratar dados somente conforme instruções documentadas do Controlador</li>
        <li>Garantir que pessoas autorizadas estão sob obrigação de confidencialidade</li>
        <li>Implementar medidas técnicas e organizacionais adequadas (criptografia TLS, acesso mínimo, monitoramento)</li>
        <li>Auxiliar o Controlador no atendimento a direitos dos titulares</li>
        <li>Excluir ou devolver dados ao término do contrato, conforme instrução do Controlador</li>
        <li>Disponibilizar informações necessárias para demonstrar conformidade</li>
      </ul>

      <h2>6. Notificação de incidentes</h2>
      <p>Em caso de incidente de segurança que afete dados pessoais do Cliente:</p>
      <ul>
        <li>Notificação ao Controlador: em até <strong>24 horas</strong> após ciência do incidente</li>
        <li>Notificação à ANPD: em até <strong>72 horas</strong>, quando aplicável</li>
        <li>A notificação incluirá: natureza do incidente, categorias e volume de dados afetados, medidas tomadas e recomendadas</li>
      </ul>

      <h2>7. Direito de auditoria</h2>
      <p>O Cliente pode solicitar auditoria das práticas de processamento da Pruma, mediante aviso prévio de 30 dias. A auditoria será conduzida em horário comercial, sem impacto para outros clientes, e a Pruma poderá exigir NDA para proteção de informações confidenciais de terceiros.</p>

      <h2>8. Transferência internacional de dados</h2>
      <p>Dados podem ser transferidos para os EUA (Neon, Vercel, Cloudflare, Google, Resend). Essas transferências são amparadas por cláusulas contratuais padrão ou adequação reconhecida, conforme art. 33 da LGPD.</p>

      <h2>9. Direitos dos titulares durante a vigência</h2>
      <p>Titulares de dados podem exercer seus direitos previstos na LGPD (acesso, correção, exclusão, portabilidade, revogação de consentimento) a qualquer momento durante a relação contratual, enviando solicitação para <a href="mailto:privacidade@pruma.io">privacidade@pruma.io</a>. A Pruma responderá em até <strong>15 dias úteis</strong> e executará as ações cabíveis conforme a legislação vigente.</p>
      <p>Pedidos de exclusão de dados durante a vigência serão atendidos desde que não haja obrigação legal de retenção (ex.: dados fiscais retidos por 5 anos). Quando a exclusão não for possível, a Pruma informará o motivo e o prazo estimado.</p>

      <h2>10. Duração e encerramento</h2>
      <p>Este DPA vigora pelo período da relação contratual entre as partes. Ao término, a Pruma excluirá os dados pessoais do Cliente em até 30 dias, salvo obrigação legal de retenção. Dados de aprovações serão mantidos pelo período legal mínimo (5 anos para fins fiscais) e depois eliminados.</p>

      <h2>11. Contato</h2>
      <p>Para questões relativas a este DPA: <a href="mailto:privacidade@pruma.io">privacidade@pruma.io</a></p>

      <div className="mt-8 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-700 dark:text-blue-400">
        Para assinar este DPA formalmente (empresas B2B), entre em contato com <a href="mailto:privacidade@pruma.io">privacidade@pruma.io</a>.
      </div>

      <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>Aviso:</strong> A Pruma nunca solicita senhas, dados de cartão ou informações sensíveis por e-mail.
      </div>
    </article>
  )
}

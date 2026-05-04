import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos de Uso — Pruma IA",
}

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>Termos de Uso</h1>
      <p className="text-muted-foreground text-sm">Última atualização: 26/04/2026</p>

      <p>
        Estes Termos de Uso (&quot;Termos&quot;) regulam a relação entre a Pruma IA (&quot;Fornecedor&quot;) e a empresa-cliente
        (&quot;Cliente&quot;) que contrata e utiliza a plataforma SaaS Pruma IA. Ao acessar ou utilizar a plataforma, o Cliente
        declara ter lido, compreendido e concordado com estes Termos.
      </p>

      <h2>1. Objeto</h2>
      <p>
        O Fornecedor disponibiliza ao Cliente, em regime de Software como Serviço (SaaS), acesso à plataforma Pruma IA, por meio
        de licença de uso temporária, não exclusiva, intransferível e revogável, nas condições descritas nestes Termos e no Plano
        contratado.
      </p>

      <h2>2. Cadastro e Contas de Usuário</h2>
      <ul>
        <li>O Cliente é responsável por manter a confidencialidade das credenciais de acesso.</li>
        <li>O Cliente deve garantir que os usuários cadastrados são colaboradores ou representantes autorizados da empresa.</li>
        <li>É vedado compartilhar credenciais entre múltiplos usuários, salvo se o plano assim permitir.</li>
        <li>O Fornecedor pode suspender contas em caso de suspeita de uso indevido.</li>
      </ul>

      <h2>3. Responsabilidades do Cliente</h2>
      <p>O Cliente compromete-se a:</p>
      <ul>
        <li>Utilizar a plataforma somente para fins lícitos e de acordo com estes Termos</li>
        <li>Não realizar engenharia reversa, descompilar ou tentar obter o código-fonte da plataforma</li>
        <li>Não sobrecarregar intencionalmente a infraestrutura do Fornecedor</li>
        <li>Notificar o Fornecedor imediatamente em caso de acesso não autorizado às suas contas</li>
      </ul>

      <h2>4. Responsabilidades do Fornecedor</h2>
      <p>O Fornecedor compromete-se a:</p>
      <ul>
        <li>Manter a plataforma disponível com SLA de 99,5% ao mês, exceto janelas de manutenção previamente comunicadas</li>
        <li>Fornecer suporte técnico nos canais e horários definidos no Plano contratado</li>
        <li>Comunicar ao Cliente com antecedência mínima de 5 dias úteis sobre manutenções programadas que afetem a disponibilidade</li>
      </ul>

      <h2>5. Propriedade Intelectual</h2>
      <p>
        Todos os direitos de propriedade intelectual relacionados à plataforma pertencem exclusivamente ao Fornecedor. O Cliente
        retém a titularidade dos dados inseridos na plataforma.
      </p>

      <h2>6. Tratamento de Dados Pessoais (LGPD)</h2>
      <p><em>Esta cláusula constitui o núcleo do Acordo de Processamento de Dados (DPA) entre as partes.</em></p>
      <p>Para fins da LGPD (Lei nº 13.709/2018):</p>
      <ul>
        <li>O Cliente atua como <strong>Controlador</strong> dos dados pessoais de seus colaboradores e usuários finais.</li>
        <li>O Fornecedor atua como <strong>Operador</strong>, tratando dados somente sob instrução documentada do Cliente.</li>
      </ul>

      <h3>6.1 Obrigações do Fornecedor (Operador)</h3>
      <ul>
        <li>Tratar os dados pessoais apenas nas finalidades instruídas pelo Cliente</li>
        <li>Manter registros das operações de tratamento (art. 37 da LGPD)</li>
        <li>Implementar medidas técnicas e organizacionais de segurança adequadas (art. 46)</li>
        <li>Notificar o Cliente em até 48 horas em caso de incidente de segurança que possa afetar dados pessoais</li>
        <li>Não subcontratar o tratamento a terceiros sem prévia autorização por escrito do Cliente</li>
        <li>Colaborar com o Cliente no atendimento de solicitações de titulares</li>
        <li>Excluir ou devolver todos os dados pessoais ao término do contrato, conforme escolha do Cliente</li>
      </ul>

      <h3>6.2 Obrigações do Cliente (Controlador)</h3>
      <ul>
        <li>Obter as bases legais adequadas (consentimento, contrato, legítimo interesse etc.) antes de inserir dados pessoais na plataforma</li>
        <li>Informar aos titulares sobre o uso da plataforma para tratamento de seus dados</li>
        <li>Não inserir dados pessoais sensíveis (art. 5º, II da LGPD) sem prévio acordo escrito com o Fornecedor</li>
        <li>Responder às solicitações de titulares relativas aos dados sob seu controle</li>
      </ul>

      <h2>7. Vigência e Rescisão</h2>
      <p>
        O contrato vige pelo prazo do plano contratado, renovando-se automaticamente. Qualquer das partes pode rescindi-lo com
        aviso prévio de 30 dias. Em caso de inadimplência ou violação material destes Termos, a rescisão pode ocorrer
        imediatamente, sem necessidade de aviso prévio.
      </p>

      <h2>8. Limitação de Responsabilidade</h2>
      <p>
        O Fornecedor não responde por danos indiretos, lucros cessantes ou perda de dados decorrentes de uso indevido da
        plataforma pelo Cliente. A responsabilidade total do Fornecedor em qualquer hipótese fica limitada ao valor pago pelo
        Cliente nos últimos 3 (três) meses do contrato.
      </p>

      <h2>9. Disposições Gerais</h2>
      <ul>
        <li>Este instrumento é regido pela legislação brasileira.</li>
        <li>Fica eleito o foro da Comarca de São Paulo — SP para dirimir controvérsias.</li>
        <li>Alterações a estes Termos serão comunicadas com antecedência mínima de 10 dias.</li>
      </ul>

      <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>Aviso:</strong> A Pruma nunca solicita senhas, dados de cartão ou informações sensíveis por e-mail. Dúvidas
        sobre estes termos: <a href="mailto:privacidade@pruma.io">privacidade@pruma.io</a>
      </div>
    </article>
  )
}

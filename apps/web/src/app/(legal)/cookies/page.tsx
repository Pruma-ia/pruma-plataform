import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Aviso de Cookies — Pruma IA",
}

// TODO: substituir antes de publicar
// privacidade@pruma.io → email ainda não criado

export default function CookiesPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>Aviso de Cookies</h1>
      <p className="text-muted-foreground text-sm">Última atualização: 26/04/2026 — <strong>RASCUNHO — pendente revisão jurídica</strong></p>

      <p>
        A Pruma IA utiliza cookies e tecnologias similares no website institucional e na plataforma para garantir seu
        funcionamento, analisar o uso e melhorar a experiência dos usuários. Este aviso explica quais cookies usamos, para que
        servem e como você pode gerenciá-los.
      </p>

      <h2>1. O que são Cookies?</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no dispositivo do usuário quando ele acessa uma página web. Eles
        permitem reconhecer o dispositivo e lembrar preferências entre sessões.
      </p>

      <h2>2. Tipos de Cookies Utilizados</h2>
      <table>
        <thead>
          <tr><th>Tipo</th><th>Nome/Exemplo</th><th>Finalidade</th><th>Duração</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Estritamente necessários</td>
            <td>_session, csrf_token</td>
            <td>Autenticação, segurança e funcionamento da plataforma</td>
            <td>Sessão</td>
          </tr>
          <tr>
            <td>Preferências</td>
            <td>lang, theme</td>
            <td>Salvar idioma, tema e preferências de exibição</td>
            <td>1 ano</td>
          </tr>
          <tr>
            <td>Analíticos</td>
            <td>_ga (Google Analytics)</td>
            <td>Medir o uso da plataforma e identificar melhorias</td>
            <td>2 anos</td>
          </tr>
          <tr>
            <td>Marketing (opt-in)</td>
            <td>_fbp, _gcl_au</td>
            <td>Exibir anúncios relevantes (somente com consentimento)</td>
            <td>90 dias</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Base Legal</h2>
      <p>
        Cookies estritamente necessários são utilizados com base na execução do contrato (art. 7º, V, LGPD). Cookies analíticos
        e de marketing dependem do consentimento explícito do usuário, coletado por meio do banner de cookies na primeira visita.
      </p>

      <h2>4. Gerenciamento de Cookies</h2>
      <p>Você pode gerenciar suas preferências de cookies das seguintes formas:</p>
      <ul>
        <li>Configurações do navegador: a maioria dos navegadores permite bloquear ou excluir cookies</li>
        <li>Opt-out do Google Analytics: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">tools.google.com/dlpage/gaoptout</a></li>
      </ul>
      <p>A desativação de cookies necessários pode prejudicar o funcionamento da plataforma.</p>

      <h2>5. Cookies de Terceiros</h2>
      <p>
        Alguns cookies são definidos por serviços de terceiros (ex.: Google Analytics). Esses parceiros têm suas próprias
        políticas de privacidade, que recomendamos consultar.
      </p>

      <h2>6. Contato</h2>
      <p>
        Dúvidas sobre o uso de cookies? Entre em contato com nosso DPO:{" "}
        <a href="mailto:privacidade@pruma.io">privacidade@pruma.io</a>
      </p>

      <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        <strong>Aviso:</strong> A Pruma nunca solicita senhas, dados de cartão ou informações sensíveis por e-mail.
      </div>
    </article>
  )
}

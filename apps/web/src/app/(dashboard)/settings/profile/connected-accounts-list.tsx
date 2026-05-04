import { ConnectedAccount } from "@/lib/connected-accounts"

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  credentials: "E-mail e senha",
  "azure-ad": "Microsoft",
}

interface ConnectedAccountsListProps {
  accounts: ConnectedAccount[]
}

export function ConnectedAccountsList({ accounts }: ConnectedAccountsListProps) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma conta conectada.</p>
    )
  }

  return (
    <ul role="list" className="divide-y">
      {accounts.map((a) => (
        <li
          key={`${a.provider}:${a.providerAccountId}`}
          className="flex items-center justify-between py-3"
          role="listitem"
        >
          <div>
            <p className="text-sm font-medium">
              {PROVIDER_LABELS[a.provider] ?? a.provider}
            </p>
            <p className="text-xs text-muted-foreground">Conectado</p>
          </div>
          <span className="text-xs text-muted-foreground">Vinculado</span>
        </li>
      ))}
    </ul>
  )
}

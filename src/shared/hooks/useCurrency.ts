import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/database/db'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency } from '../../core/utils/number'

/**
 * Returns the organisation's currency code and a formatting helper.
 * Falls back to 'USD' while the org record is loading or unavailable.
 */
export function useCurrency() {
  const organizationId = useAuthStore(s => s.appUser?.organizationId)

  const currency = useLiveQuery(
    async () => {
      if (!organizationId) return 'USD'
      const org = await db.organizations.get(organizationId)
      return org?.currency ?? 'USD'
    },
    [organizationId],
    'USD',
  )

  const symbol = (() => {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 })
        .formatToParts(0).find(p => p.type === 'currency')?.value ?? currency
    } catch {
      return currency
    }
  })()

  return {
    currency,
    /** Currency symbol, e.g. '$', '₵', '₦' */
    symbol,
    /** Format a monetary amount with the org's currency symbol */
    fmt: (amount: number) => formatCurrency(Math.abs(amount), currency),
  }
}

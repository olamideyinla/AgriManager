import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useBudgetVsActual } from '../../core/database/hooks/use-financial-budgets'
import { useCurrency } from '../../shared/hooks/useCurrency'
import type { FinancialCategory } from '../../shared/types'

const CATEGORY_LABEL: Record<FinancialCategory, string> = {
  feed:           'Feed',
  labor:          'Labor',
  medication:     'Medication',
  transport:      'Transport',
  utilities:      'Utilities',
  sales_eggs:     'Egg Sales',
  sales_birds:    'Bird Sales',
  sales_milk:     'Milk Sales',
  sales_fish:     'Fish Sales',
  sales_crops:    'Crop Sales',
  sales_other:    'Other Sales',
  rent:           'Rent',
  insurance:      'Insurance',
  equipment:      'Equipment',
  administrative: 'Admin',
  other:          'Other',
}

export function BudgetWidget({ orgId }: { orgId: string }) {
  const navigate = useNavigate()
  const currentMonth = format(new Date(), 'yyyy-MM')
  const bva = useBudgetVsActual(orgId, currentMonth)

  if (!bva || bva.length === 0) return null

  // Top 3 by pct descending
  const top3 = bva.slice(0, 3)

  return (
    <button
      onClick={() => navigate('/financials/budget')}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Monthly Budget</p>
        <span className="text-xs text-primary-600 font-medium">View all →</span>
      </div>
      <div className="space-y-2">
        {top3.map(item => {
          const barColor =
            item.pct >= 100 ? 'bg-red-500' :
            item.pct >= 70  ? 'bg-amber-400' :
                              'bg-emerald-500'
          const pctColor =
            item.pct >= 100 ? 'text-red-500' :
            item.pct >= 70  ? 'text-amber-600' :
                              'text-emerald-600'
          return (
            <div key={item.category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  {CATEGORY_LABEL[item.category]}
                </span>
                <span className={`text-xs font-semibold ${pctColor}`}>
                  {item.pct.toFixed(0)}% of budget
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </button>
  )
}

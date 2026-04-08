import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { nanoid } from 'nanoid'
import { useAuthStore } from '../../stores/auth-store'
import { useBudgetVsActual, useBudgetsForMonth } from '../../core/database/hooks/use-financial-budgets'
import { db } from '../../core/database/db'
import { useCurrency } from '../../shared/hooks/useCurrency'
import type { FinancialCategory, FinancialBudget } from '../../shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: FinancialCategory[] = [
  'feed', 'labor', 'medication', 'transport', 'utilities',
  'rent', 'insurance', 'equipment', 'administrative', 'other',
]

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

const CATEGORY_ICON: Partial<Record<FinancialCategory, string>> = {
  feed: '🌾', labor: '👷', medication: '💊', transport: '🚚',
  utilities: '⚡', rent: '🏠', insurance: '🛡️', equipment: '🔧',
  administrative: '📋', other: '📦',
}

// ── Budget row ─────────────────────────────────────────────────────────────────

function BudgetRow({
  category,
  budgetCents,
  actualCents,
  orgId,
  month,
  existingBudget,
}: {
  category: FinancialCategory
  budgetCents: number
  actualCents: number
  orgId: string
  month: string
  existingBudget: FinancialBudget | undefined
}) {
  const { fmt } = useCurrency()
  const pct = budgetCents > 0 ? Math.min((actualCents / budgetCents) * 100, 100) : 0

  const barColor = budgetCents === 0
    ? 'bg-gray-200'
    : pct >= 100
    ? 'bg-red-500'
    : pct >= 70
    ? 'bg-amber-400'
    : 'bg-emerald-500'

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0
    const cents = Math.round(val * 100)
    const now = new Date().toISOString()
    const record: FinancialBudget = {
      id:                existingBudget?.id ?? nanoid(),
      organizationId:    orgId,
      month,
      category,
      budgetAmountCents: cents,
      syncStatus:        'pending',
      createdAt:         existingBudget?.createdAt ?? now,
      updatedAt:         now,
    }
    await db.financialBudgets.put(record)
  }

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-lg">{CATEGORY_ICON[category] ?? '•'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-800">{CATEGORY_LABEL[category]}</p>
            <p className="text-xs text-gray-500">{fmt(actualCents / 100)} spent</p>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      {/* Budget input */}
      <div className="flex items-center gap-2 pl-9">
        <span className="text-xs text-gray-400">Budget:</span>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
          <span className="text-xs text-gray-400">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            defaultValue={budgetCents > 0 ? (budgetCents / 100).toFixed(2) : ''}
            placeholder="Set budget"
            onBlur={handleBlur}
            className="w-24 text-sm font-medium text-gray-700 bg-transparent outline-none"
          />
        </div>
        {budgetCents > 0 && (
          <p className={`text-xs font-semibold ${
            pct >= 100 ? 'text-red-500' : pct >= 70 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {pct.toFixed(0)}%
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FinancialBudgetPage() {
  const navigate = useNavigate()
  const orgId = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const { fmt } = useCurrency()

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const month = format(currentDate, 'yyyy-MM')
  const monthLabel = format(currentDate, 'MMMM yyyy')

  const budgets = useBudgetsForMonth(orgId, month)
  const bva = useBudgetVsActual(orgId, month)

  const budgetMap = new Map(budgets?.map(b => [b.category, b]) ?? [])
  const bvaCatMap = new Map(bva?.map(b => [b.category, b]) ?? [])

  const totalBudgeted = budgets?.reduce((s, b) => s + b.budgetAmountCents, 0) ?? 0
  const totalActual   = bva?.reduce((s, b) => s + b.actualCents, 0) ?? 0
  const totalPct      = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0

  return (
    <div className="min-h-dvh bg-gray-50 pb-10 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">Monthly Budget</h1>
        </div>
        {/* Month picker */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-base font-semibold text-gray-800">{monthLabel}</p>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Summary card */}
        {totalBudgeted > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500">Total Budgeted</p>
                <p className="text-lg font-bold text-gray-800">{fmt(totalBudgeted / 100)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Spent</p>
                <p className={`text-lg font-bold ${totalPct >= 100 ? 'text-red-500' : totalPct >= 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fmt(totalActual / 100)}
                </p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${totalPct >= 100 ? 'bg-red-500' : totalPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(totalPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-right text-gray-400 mt-1">{totalPct.toFixed(0)}% of budget used</p>
          </div>
        )}

        {/* Category budgets */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
            Expense Categories
          </h3>
          <p className="text-xs text-gray-400 mb-3">Tap amount to set a monthly limit</p>
          {EXPENSE_CATEGORIES.map(cat => (
            <BudgetRow
              key={cat}
              category={cat}
              budgetCents={budgetMap.get(cat)?.budgetAmountCents ?? 0}
              actualCents={bvaCatMap.get(cat)?.actualCents ?? 0}
              orgId={orgId}
              month={month}
              existingBudget={budgetMap.get(cat)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

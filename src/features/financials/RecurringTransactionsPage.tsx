import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'
import { useCurrency } from '../../shared/hooks/useCurrency'
import type { RecurringFrequency, RecurringTransaction } from '../../shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  daily:     'Daily',
  weekly:    'Weekly',
  monthly:   'Monthly',
  quarterly: 'Quarterly',
}

const CATEGORY_LABEL: Record<string, string> = {
  feed: 'Feed', labor: 'Labor', medication: 'Medication',
  transport: 'Transport', utilities: 'Utilities', rent: 'Rent',
  insurance: 'Insurance', equipment: 'Equipment', administrative: 'Admin',
  sales_eggs: 'Egg Sales', sales_birds: 'Bird Sales', sales_milk: 'Milk Sales',
  sales_fish: 'Fish Sales', sales_crops: 'Crop Sales', sales_other: 'Other Sales',
  other: 'Other',
}

// ── Row component ─────────────────────────────────────────────────────────────

function RecurringRow({ rec }: { rec: RecurringTransaction }) {
  const navigate = useNavigate()
  const { fmt }  = useCurrency()
  const isIncome = rec.type === 'income'
  const today    = new Date().toISOString().split('T')[0]
  const isDue    = rec.nextDueDate <= today

  return (
    <button
      onClick={() => navigate(`/financials/recurring/${rec.id}`)}
      className="w-full bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 flex-shrink-0">
        <RefreshCw size={16} className={isIncome ? 'text-emerald-600' : 'text-red-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{rec.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{CATEGORY_LABEL[rec.category] ?? rec.category}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-400">{FREQUENCY_LABEL[rec.frequency]}</span>
          {isDue && rec.isActive && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-amber-600 font-medium">Due today</span>
            </>
          )}
          {!rec.isActive && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">Inactive</span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Next: {format(parseISO(rec.nextDueDate), 'd MMM yyyy')}
        </p>
      </div>
      <p className={`text-sm font-semibold shrink-0 ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
        {isIncome ? '+' : '-'}{fmt(rec.amountCents / 100)}
      </p>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterTab = 'active' | 'all'

export default function RecurringTransactionsPage() {
  const navigate = useNavigate()
  const userId   = useAuthStore(s => s.user?.id)
  const [tab, setTab] = useState<FilterTab>('active')

  const orgId = useLiveQuery(async () => {
    if (!userId) return null
    const u = await db.appUsers.get(userId)
    return u?.organizationId ?? null
  }, [userId])

  const records = useLiveQuery(async () => {
    if (!orgId) return []
    return db.recurringTransactions
      .where('organizationId').equals(orgId)
      .toArray()
  }, [orgId]) ?? []

  const filtered = tab === 'active' ? records.filter(r => r.isActive) : records

  // Group by frequency
  const grouped = new Map<RecurringFrequency, RecurringTransaction[]>()
  for (const rec of filtered) {
    const freq = rec.frequency
    if (!grouped.has(freq)) grouped.set(freq, [])
    grouped.get(freq)!.push(rec)
  }

  const freqOrder: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly']

  return (
    <div className="min-h-dvh bg-gray-50 pb-28 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Recurring Transactions</h1>
            <p className="text-xs text-gray-500">Auto-posted on schedule</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200 -mb-px">
          {(['active', 'all'] as FilterTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-sm py-2.5 font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-500'
              }`}
            >
              {t === 'active' ? 'Active' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mt-4">
            <p className="text-3xl mb-2">🔄</p>
            <p className="text-sm font-medium text-gray-700 mb-1">No recurring transactions</p>
            <p className="text-xs text-gray-400">Add recurring expenses or income to automate your bookkeeping.</p>
          </div>
        ) : (
          freqOrder.map(freq => {
            const group = grouped.get(freq)
            if (!group?.length) return null
            return (
              <div key={freq}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                  {FREQUENCY_LABEL[freq]}
                </p>
                <div className="space-y-2">
                  {group.map(rec => <RecurringRow key={rec.id} rec={rec} />)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/financials/recurring/new')}
        className="fixed bottom-24 right-4 bg-primary-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-20"
        aria-label="Add Recurring"
      >
        <Plus size={26} />
      </button>
    </div>
  )
}

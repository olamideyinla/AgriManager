import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { db } from '../../core/database/db'
import { useMarketPrices, useLatestMarketPrices } from '../../core/database/hooks/use-market-prices'
import type { MarketPrice } from '../../shared/types'

// ── Commodity suggestions ─────────────────────────────────────────────────────

const COMMODITY_SUGGESTIONS = [
  'Broiler live weight (kg)',
  'Eggs (dozen)',
  'Eggs (crate/30)',
  'Milk (liter)',
  'Cattle (head)',
  'Pig (kg live)',
  'Fish (kg)',
  'Maize/Corn (kg)',
  'Wheat (kg)',
  'Soybean (kg)',
  'Layer feed (50kg bag)',
  'Broiler starter (50kg bag)',
  'Broiler finisher (50kg bag)',
  'Rabbit (kg)',
]

const SOURCE_OPTIONS = [
  'Local market',
  'Cooperative',
  'Exporter',
  'Farm gate',
  'Supermarket',
  'Online',
]

// ── Price card ────────────────────────────────────────────────────────────────

function PriceCard({
  commodity,
  latestPrice,
  previousPrice,
  currency,
  onAddClick,
}: {
  commodity: string
  latestPrice: MarketPrice
  previousPrice?: MarketPrice
  currency: string
  onAddClick: () => void
}) {
  const change = previousPrice
    ? ((latestPrice.pricePerUnit - previousPrice.pricePerUnit) / previousPrice.pricePerUnit) * 100
    : null

  const dateLabel = (() => {
    try { return format(new Date(latestPrice.priceDate), 'MMM d') }
    catch { return latestPrice.priceDate }
  })()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{commodity}</p>
          <p className="text-xs text-gray-500 mt-0.5">per {latestPrice.unit}</p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className="text-lg font-bold text-gray-900">
            {currency}{latestPrice.pricePerUnit.toFixed(2)}
          </p>
          {change != null && (
            <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${
              change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-gray-400'
            }`}>
              {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{dateLabel}</span>
          {latestPrice.source && <span>· {latestPrice.source}</span>}
        </div>
        <button
          onClick={onAddClick}
          className="text-xs text-primary-600 font-semibold flex items-center gap-0.5 active:opacity-70"
        >
          <Plus className="w-3 h-3" />
          Update
        </button>
      </div>
    </div>
  )
}

// ── Add price form ────────────────────────────────────────────────────────────

interface FormValues {
  commodity: string
  pricePerUnit: string
  unit: string
  priceDate: string
  source: string
  notes: string
}

function AddPriceForm({
  prefillCommodity,
  onClose,
  orgId,
}: {
  prefillCommodity?: string
  onClose: () => void
  orgId: string
}) {
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      commodity:    prefillCommodity ?? '',
      pricePerUnit: '',
      unit:         '',
      priceDate:    today,
      source:       '',
      notes:        '',
    },
  })

  const commodity = watch('commodity')

  const onSubmit = async (values: FormValues) => {
    if (!values.commodity || !values.pricePerUnit || !values.unit) return
    setIsSaving(true)
    try {
      await db.marketPrices.add({
        id:           nanoid(),
        organizationId: orgId,
        commodity:    values.commodity,
        pricePerUnit: Number(values.pricePerUnit),
        unit:         values.unit,
        priceDate:    values.priceDate,
        source:       values.source || undefined,
        notes:        values.notes || undefined,
        syncStatus:   'pending',
        createdAt:    new Date(),
        updatedAt:    new Date(),
      })
      addToast({ type: 'success', message: 'Market price saved' })
      onClose()
    } catch {
      addToast({ type: 'error', message: 'Failed to save price' })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredSuggestions = COMMODITY_SUGGESTIONS.filter(
    s => !commodity || s.toLowerCase().includes(commodity.toLowerCase())
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Commodity with suggestions */}
      <div className="relative">
        <label className="text-xs text-gray-500 mb-1 block">Commodity *</label>
        <input
          type="text"
          {...register('commodity', { required: true })}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="e.g. Broiler live weight (kg)"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          autoComplete="off"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
            {filteredSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onMouseDown={() => {
                  setValue('commodity', s)
                  setShowSuggestions(false)
                  // Auto-fill unit if possible
                  const unitMap: Record<string, string> = {
                    '(kg)': 'kg',
                    '(dozen)': 'dozen',
                    '(crate/30)': 'crate',
                    '(liter)': 'liter',
                    '(head)': 'head',
                    '(50kg bag)': '50kg bag',
                  }
                  for (const [key, unit] of Object.entries(unitMap)) {
                    if (s.includes(key)) {
                      setValue('unit', unit)
                      break
                    }
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Price *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('pricePerUnit', { required: true })}
            placeholder="0.00"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Unit *</label>
          <input
            type="text"
            {...register('unit', { required: true })}
            placeholder="kg, dozen, head…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Date</label>
          <input
            type="date"
            {...register('priceDate', { required: true })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Source</label>
          <select
            {...register('source')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">— select —</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
        <input
          type="text"
          {...register('notes')}
          placeholder="Any extra info…"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-3 rounded-2xl font-semibold text-sm bg-primary-600 text-white active:scale-95 transition-all disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : 'Save Price'}
      </button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarketPricePage() {
  const navigate  = useNavigate()
  const orgId     = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const currency  = useAuthStore(s => s.appUser?.currencySymbol ?? '')
  const [showForm, setShowForm]             = useState(false)
  const [prefillCommodity, setPrefill]      = useState<string | undefined>()
  const [selectedCommodity, setSelected]    = useState<string | null>(null)

  const allPrices  = useMarketPrices(orgId)
  const latest     = useLatestMarketPrices(orgId)

  if (allPrices === undefined || latest === undefined) {
    return <div className="flex items-center justify-center h-dvh bg-gray-50 text-gray-400 text-sm">Loading…</div>
  }

  const handleUpdateClick = (commodity: string) => {
    setPrefill(commodity)
    setShowForm(true)
  }

  // Build a map of commodity → sorted price history
  const historyMap = new Map<string, MarketPrice[]>()
  for (const p of allPrices) {
    const arr = historyMap.get(p.commodity) ?? []
    arr.push(p)
    historyMap.set(p.commodity, arr)
  }
  // Sort each commodity's history by date desc
  for (const [k, v] of historyMap.entries()) {
    historyMap.set(k, v.sort((a, b) => b.priceDate.localeCompare(a.priceDate)))
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-safe-top pb-4">
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white -ml-2">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Market Prices</h1>
            <p className="text-white/70 text-sm">Track commodity prices over time</p>
          </div>
          <button
            onClick={() => { setPrefill(undefined); setShowForm(true) }}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-24">
        {latest.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📈</p>
            <p className="text-sm">No market prices recorded yet</p>
            <p className="text-xs mt-1">Tap + to add your first price</p>
          </div>
        ) : (
          latest.map(lp => {
            const history = historyMap.get(lp.commodity) ?? []
            const latestRecord = history[0]
            const previousRecord = history[1]
            if (!latestRecord) return null
            return (
              <div key={lp.commodity}>
                <PriceCard
                  commodity={lp.commodity}
                  latestPrice={latestRecord}
                  previousPrice={previousRecord}
                  currency={currency}
                  onAddClick={() => handleUpdateClick(lp.commodity)}
                />
                {/* History expand */}
                {history.length > 1 && (
                  <button
                    onClick={() => setSelected(selectedCommodity === lp.commodity ? null : lp.commodity)}
                    className="w-full text-xs text-gray-400 text-center py-1 active:text-gray-600"
                  >
                    {selectedCommodity === lp.commodity ? '▲ Hide history' : `▼ ${history.length - 1} more entries`}
                  </button>
                )}
                {selectedCommodity === lp.commodity && (
                  <div className="space-y-1 ml-4">
                    {history.slice(1).map(p => (
                      <div key={p.id} className="bg-white rounded-xl border border-gray-100 px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {(() => { try { return format(new Date(p.priceDate), 'MMM d, yyyy') } catch { return p.priceDate } })()}
                          {p.source && ` · ${p.source}`}
                        </span>
                        <span className="text-xs font-semibold text-gray-700">{currency}{p.pricePerUnit.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add form bottom sheet */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {prefillCommodity ? `Update: ${prefillCommodity}` : 'Add Market Price'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
            </div>
            <AddPriceForm
              prefillCommodity={prefillCommodity}
              onClose={() => setShowForm(false)}
              orgId={orgId}
            />
          </div>
        </div>
      )}
    </div>
  )
}

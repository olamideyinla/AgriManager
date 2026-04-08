import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { useUnitEconomics } from '../../core/database/hooks/use-unit-economics'
import type { EnterpriseInstance } from '../../shared/types'

// ── Data loading ──────────────────────────────────────────────────────────────

function useActiveEnterprises() {
  const appUser = useAuthStore(s => s.appUser)
  return useLiveQuery(async () => {
    if (!appUser) return []
    const locs   = await db.farmLocations.where('organizationId').equals(appUser.organizationId).toArray()
    const infras = await db.infrastructures.where('farmLocationId').anyOf(locs.map(l => l.id)).toArray()
    return db.enterpriseInstances
      .where('infrastructureId').anyOf(infras.map(i => i.id))
      .filter(e => e.status === 'active')
      .toArray()
  }, [appUser?.organizationId]) ?? []
}

// ── Output label by enterprise type ──────────────────────────────────────────

function outputLabel(enterprise: EnterpriseInstance | undefined): string {
  if (!enterprise) return 'unit'
  switch (enterprise.enterpriseType) {
    case 'layers':       return 'egg'
    case 'broilers':     return 'kg (live weight)'
    case 'cattle_dairy': return 'litre'
    case 'cattle_beef':  return 'kg (live weight)'
    case 'fish':         return 'kg (biomass)'
    case 'crop_annual':
    case 'crop_perennial': return 'kg (harvest)'
    default:             return 'unit'
  }
}

// ── Input row ────────────────────────────────────────────────────────────────

function InputRow({ label, value, onChange, min = 0, step = 0.01, suffix = '' }: {
  label: string; value: number; onChange: (n: number) => void
  min?: number; step?: number; suffix?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {suffix && <span className="text-xs text-gray-400 w-10">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 pt-safe-top">
      <div className="flex items-center gap-3 py-3">
        <button onClick={onBack} className="touch-target -ml-2">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Break-Even Calculator</h1>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BreakEvenCalculator() {
  const navigate    = useNavigate()
  const enterprises = useActiveEnterprises()
  const { fmt }     = useCurrency()

  const [selectedIdx, setSelectedIdx] = useState(0)
  const enterprise = enterprises?.[selectedIdx] as EnterpriseInstance | undefined

  const econ = useUnitEconomics(enterprise?.id, enterprise)

  // User-editable inputs (pre-filled from econ)
  const [totalCost,       setTotalCost]       = useState(0)
  const [additionalCost,  setAdditionalCost]  = useState(0)
  const [expectedOutput,  setExpectedOutput]  = useState(0)
  const [marketPrice,     setMarketPrice]     = useState(0)

  // Sync defaults from econ when enterprise changes
  const econTotalCost = Math.round(econ.totalExpenses * 100) / 100
  const econOutput = useMemo(() => {
    if (!enterprise) return 0
    switch (enterprise.enterpriseType) {
      case 'layers':       return econ.costPerEgg ? Math.round(econ.totalExpenses / econ.costPerEgg) : 0
      case 'broilers':     return enterprise.currentStockCount
      case 'cattle_dairy': return econ.costPerLiterMilk ? Math.round(econ.totalExpenses / econ.costPerLiterMilk) : 0
      case 'fish':         return econ.costPerKgFish ? Math.round(econ.totalExpenses / econ.costPerKgFish) : 0
      case 'crop_annual':
      case 'crop_perennial': return econ.costPerKgHarvest ? Math.round(econ.totalExpenses / econ.costPerKgHarvest) : 0
      default: return enterprise.currentStockCount
    }
  }, [enterprise, econ])

  const effectiveCost   = totalCost > 0 ? totalCost : econTotalCost
  const effectiveOutput = expectedOutput > 0 ? expectedOutput : econOutput

  const totalProjectedCost = effectiveCost + additionalCost
  const breakEvenPrice  = effectiveOutput > 0 ? totalProjectedCost / effectiveOutput : 0
  const effectivePrice  = marketPrice > 0 ? marketPrice : breakEvenPrice
  const projectedRevenue= effectiveOutput * effectivePrice
  const projectedProfit = projectedRevenue - totalProjectedCost
  const marginPct       = projectedRevenue > 0 ? Math.round((projectedProfit / projectedRevenue) * 100) : 0
  const isProfitable    = projectedProfit >= 0

  const unit = outputLabel(enterprise)

  if (enterprises === undefined) {
    return <div className="flex h-dvh items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

  if (enterprises.length === 0) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <Header onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-500 text-sm">No active enterprises found.</p>
          <p className="text-gray-400 text-xs mt-1">Start an enterprise to use this tool.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      <Header onBack={() => navigate(-1)} />

      <div className="px-4 py-4 space-y-4">
        {/* Enterprise selector */}
        {enterprises.length > 1 && (
          <div className="card p-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select enterprise</label>
            <select
              value={selectedIdx}
              onChange={e => { setSelectedIdx(+e.target.value); setTotalCost(0); setExpectedOutput(0) }}
              className="input text-sm"
            >
              {enterprises.map((e, i) => (
                <option key={e.id} value={i}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Auto-filled data */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cost Data (auto-filled · editable)
          </p>
          <InputRow
            label="Total cost to date"
            value={effectiveCost}
            onChange={setTotalCost}
            step={1}
            suffix="$"
          />
          <InputRow
            label="Estimated additional cost"
            value={additionalCost}
            onChange={setAdditionalCost}
            step={1}
            suffix="$"
          />
          <InputRow
            label={`Expected total output (${unit})`}
            value={effectiveOutput}
            onChange={setExpectedOutput}
            step={1}
            suffix={unit.split(' ')[0]}
          />
        </div>

        {/* Market price */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Market</p>
          <InputRow
            label={`Market price per ${unit}`}
            value={effectivePrice}
            onChange={setMarketPrice}
            step={0.01}
            suffix={`$/${unit.split(' ')[0]}`}
          />
        </div>

        {/* Output cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Cost',   value: fmt(totalProjectedCost), color: 'border-l-red-400' },
            { label: 'Break-even',   value: `${fmt(breakEvenPrice)}/${unit.split(' ')[0]}`, color: 'border-l-amber-400' },
            { label: 'Market Price', value: `${fmt(effectivePrice)}/${unit.split(' ')[0]}`, color: marketPrice >= breakEvenPrice ? 'border-l-emerald-500' : 'border-l-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${color} p-3 shadow-sm`}>
              <p className="text-[10px] text-gray-400 font-medium">{label}</p>
              <p className="text-sm font-bold text-gray-900 mt-1 leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${isProfitable ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {isProfitable
            ? <TrendingUp className="w-7 h-7 text-emerald-600 shrink-0" />
            : <TrendingDown className="w-7 h-7 text-red-600 shrink-0" />
          }
          <div>
            <p className={`font-bold text-base ${isProfitable ? 'text-emerald-800' : 'text-red-800'}`}>
              {isProfitable ? `Projected profit: ${fmt(projectedProfit)}` : `Projected loss: ${fmt(-projectedProfit)}`}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Margin: {marginPct}% · Revenue: {fmt(projectedRevenue)}
            </p>
          </div>
        </div>

        {/* Guidance note */}
        {breakEvenPrice > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Break-Even Note</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              You need to sell at <strong>{fmt(breakEvenPrice)} per {unit.split(' ')[0]}</strong> to cover all costs.
              {effectivePrice > breakEvenPrice
                ? ` Current market (${fmt(effectivePrice)}) is ${fmt(effectivePrice - breakEvenPrice)} above break-even.`
                : effectivePrice < breakEvenPrice
                  ? ` Current market (${fmt(effectivePrice)}) is ${fmt(breakEvenPrice - effectivePrice)} below break-even.`
                  : ' Current market is exactly at break-even.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

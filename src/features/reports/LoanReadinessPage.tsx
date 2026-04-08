import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays, parseISO } from 'date-fns'
import { ArrowLeft, Share2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { db } from '../../core/database/db'

// ── Score bands ────────────────────────────────────────────────────────────────

interface ScoreBand {
  label: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}

function scoreBand(score: number): ScoreBand {
  if (score >= 80) return { label: 'Strong', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', description: 'Your farm records demonstrate strong creditworthiness.' }
  if (score >= 60) return { label: 'Good',   color: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',    description: 'Good records with a few areas to strengthen.' }
  if (score >= 40) return { label: 'Developing', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', description: 'Improving but lenders may need more evidence.' }
  return { label: 'Not Ready', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', description: 'Consistent record-keeping required before loan applications.' }
}

// ── Score gauge (SVG semi-circle) ─────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const band = scoreBand(score)
  const clampedScore = Math.min(100, Math.max(0, score))

  // Semi-circle arc: from 180° to 0° (left to right)
  const r  = 80
  const cx = 110
  const cy = 100
  const startAngle = Math.PI
  const endAngle   = 0

  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  })

  // Track arc: full grey semi-circle
  const trackStart = toXY(startAngle)
  const trackEnd   = toXY(endAngle)
  const trackPath  = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`

  // Fill arc: from left to score position
  const scoreAngle = Math.PI - (clampedScore / 100) * Math.PI
  const fillEnd    = toXY(scoreAngle)
  const largeArc   = clampedScore > 50 ? 1 : 0
  const fillPath   = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`

  const fillColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className={`${band.bgColor} border ${band.borderColor} rounded-2xl p-4 text-center`}>
      <svg width="220" height="110" viewBox="0 0 220 110" className="mx-auto">
        {/* Track */}
        <path d={trackPath} stroke="#e5e7eb" strokeWidth="14" fill="none" strokeLinecap="round" />
        {/* Fill */}
        {clampedScore > 0 && (
          <path d={fillPath} stroke={fillColor} strokeWidth="14" fill="none" strokeLinecap="round" />
        )}
        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="700" fill={fillColor}>
          {score}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="#6b7280">
          out of 100
        </text>
      </svg>
      <p className={`text-xl font-bold ${band.color} -mt-2`}>{band.label}</p>
      <p className="text-xs text-gray-500 mt-1">{band.description}</p>
    </div>
  )
}

// ── Dimension card ─────────────────────────────────────────────────────────────

interface Dimension {
  name: string
  score: number
  maxScore: number
  tip: string
  icon: string
}

function DimensionCard({ dim }: { dim: Dimension }) {
  const pct      = Math.round((dim.score / dim.maxScore) * 100)
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{dim.icon}</span>
          <p className="text-sm font-semibold text-gray-800">{dim.name}</p>
        </div>
        <span className="text-sm font-bold text-gray-700">{dim.score}/{dim.maxScore}</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">{dim.tip}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LoanReadinessPage() {
  const navigate = useNavigate()
  const userId   = useAuthStore(s => s.user?.id)

  const data = useLiveQuery(async () => {
    if (!userId) return null
    const user = await db.appUsers.get(userId)
    if (!user) return null
    const orgId = user.organizationId

    const today     = new Date()
    const todayStr  = today.toISOString().split('T')[0]
    const day30Ago  = format(subDays(today, 30), 'yyyy-MM-dd')
    const day180Ago = format(subDays(today, 180), 'yyyy-MM-dd')

    // Enterprises
    const enterprises = await db.enterpriseInstances.toArray()
    const activeEnts  = enterprises.filter(e => e.status === 'active')

    // All financial transactions for org
    const allTxns = await db.financialTransactions
      .where('organizationId').equals(orgId).toArray()

    // Inventory items
    const invItems = await db.inventoryItems
      .where('organizationId').equals(orgId).toArray()

    // ── Dimension 1: Record Completeness (25 pts) ─────────────────────────
    // Days with at least one daily entry / 30 days
    const recordTables = [
      db.layerDailyRecords,
      db.broilerDailyRecords,
      db.cattleDailyRecords,
      db.fishDailyRecords,
      db.cropActivityRecords,
      db.pigDailyRecords,
      db.rabbitDailyRecords,
      db.customAnimalDailyRecords,
    ]

    const recentEntIds = activeEnts.map(e => e.id)
    const recentDatesSet = new Set<string>()

    for (const table of recordTables) {
      const rows = await (table as typeof db.layerDailyRecords)
        .filter(r => recentEntIds.includes(r.enterpriseInstanceId) && r.date >= day30Ago && r.date <= todayStr)
        .toArray()
      rows.forEach(r => recentDatesSet.add(r.date))
    }

    const daysWithEntries = recentDatesSet.size
    const recordScore     = Math.round(Math.min(daysWithEntries / 30, 1) * 25)

    // ── Dimension 2: Financial History (20 pts) ───────────────────────────
    // # unique months with at least one transaction (capped at 6)
    const monthsWithTxns = new Set(
      allTxns
        .filter(t => t.date >= day180Ago)
        .map(t => t.date.slice(0, 7)),
    )
    const finHistScore = Math.min(monthsWithTxns.size, 6) / 6 * 20

    // ── Dimension 3: Profitability (20 pts) ───────────────────────────────
    const totalIncome   = allTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpenses = allTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const netProfit = totalIncome - totalExpenses
    const profitMargin = totalIncome > 0 ? netProfit / totalIncome : 0
    const profitScore = netProfit > 0 ? 20 : profitMargin > -0.1 ? 10 : 0

    // ── Dimension 4: Expense Tracking (15 pts) ────────────────────────────
    const txnsWithCategory = allTxns.filter(t => t.category && t.category !== 'other').length
    const expTrackScore = allTxns.length > 0
      ? Math.round(Math.min(txnsWithCategory / allTxns.length, 1) * 15)
      : 0

    // ── Dimension 5: Enterprise Diversity (10 pts) ────────────────────────
    const activeTypes = new Set(activeEnts.map(e => e.enterpriseType)).size
    const diversityScore = activeTypes >= 3 ? 10 : activeTypes === 2 ? 8 : activeTypes === 1 ? 5 : 0

    // ── Dimension 6: Inventory Management (10 pts) ────────────────────────
    const hasInventory = invItems.length > 0
    const hasStockout  = invItems.some(i => i.currentStock <= 0)
    const invScore = !hasInventory ? 0 : hasStockout ? 5 : 10

    const totalScore = Math.round(recordScore + finHistScore + profitScore + expTrackScore + diversityScore + invScore)

    return {
      totalScore: Math.min(totalScore, 100),
      dimensions: [
        {
          name: 'Record Completeness',
          score: recordScore,
          maxScore: 25,
          icon: '📋',
          tip: daysWithEntries >= 25
            ? 'Excellent! You have daily entries for most of the last 30 days.'
            : `${daysWithEntries}/30 days with entries in the last month — aim for daily entries to reach full score.`,
        },
        {
          name: 'Financial History',
          score: Math.round(finHistScore),
          maxScore: 20,
          icon: '📊',
          tip: monthsWithTxns.size >= 6
            ? 'At least 6 months of financial records — great for lenders.'
            : `${monthsWithTxns.size} of 6 months with transactions — keep recording income and expenses consistently.`,
        },
        {
          name: 'Profitability',
          score: profitScore,
          maxScore: 20,
          icon: '💰',
          tip: profitScore === 20
            ? 'Your farm is profitable — strong signal for lenders.'
            : profitScore === 10
            ? 'Near break-even — reducing costs or increasing sales will improve this score.'
            : 'Currently operating at a loss — focus on cutting top expenses and growing income.',
        },
        {
          name: 'Expense Tracking',
          score: expTrackScore,
          maxScore: 15,
          icon: '🏷️',
          tip: expTrackScore >= 13
            ? 'Expenses are well-categorized — lenders appreciate detailed cost records.'
            : 'Categorize all your expenses (not just "Other") to reach full score.',
        },
        {
          name: 'Enterprise Diversity',
          score: diversityScore,
          maxScore: 10,
          icon: '🌾',
          tip: activeTypes >= 3
            ? 'Multiple enterprise types show diversified income — reduces lender risk.'
            : 'Adding more enterprise types (e.g. layers + crops + fish) improves risk profile.',
        },
        {
          name: 'Inventory Management',
          score: invScore,
          maxScore: 10,
          icon: '📦',
          tip: invScore === 10
            ? 'Inventory tracked with no stockouts — demonstrates operational management.'
            : !hasInventory
            ? 'Add inventory items to track feed and supplies for this dimension.'
            : 'You have stockout warnings — restock to show proactive inventory management.',
        },
      ] satisfies Dimension[],
      daysWithEntries,
      monthsCount: monthsWithTxns.size,
      netProfit,
      totalTxns: allTxns.length,
      activeTypes,
      invScore,
    }
  }, [userId])

  const band = useMemo(() => data ? scoreBand(data.totalScore) : null, [data])

  const handleShare = () => {
    if (!data) return
    const lines = [
      `AgriManagerX — Loan Readiness Report`,
      `Date: ${format(new Date(), 'dd MMM yyyy')}`,
      ``,
      `Overall Score: ${data.totalScore}/100 (${band?.label})`,
      ``,
      ...data.dimensions.map(d => `${d.icon} ${d.name}: ${d.score}/${d.maxScore}`),
      ``,
      `Tip: ${data.dimensions.map(d => d.tip).join(' | ')}`,
    ]
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => alert('Report copied to clipboard!'))
      .catch(() => {/* silent fail */})
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-28 fade-in">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Loan Readiness</h1>
          <p className="text-xs text-gray-500">Based on your recorded data</p>
        </div>
        <button
          onClick={handleShare}
          disabled={!data}
          className="w-8 h-8 flex items-center justify-center text-primary-600 active:scale-95 transition-transform disabled:opacity-40"
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!data ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            {/* Score gauge */}
            <ScoreGauge score={data.totalScore} />

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-lg font-bold text-gray-800">{data.daysWithEntries}</p>
                <p className="text-xs text-gray-500">Days with entries (30d)</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-lg font-bold text-gray-800">{data.monthsCount}</p>
                <p className="text-xs text-gray-500">Months of records</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className={`text-lg font-bold ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {data.netProfit >= 0 ? '↑' : '↓'}
                </p>
                <p className="text-xs text-gray-500">{data.netProfit >= 0 ? 'Profitable' : 'At a loss'}</p>
              </div>
            </div>

            {/* Dimension cards */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                Score Breakdown
              </p>
              <div className="space-y-2">
                {data.dimensions.map(dim => (
                  <DimensionCard key={dim.name} dim={dim} />
                ))}
              </div>
            </div>

            {/* Methodology note */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-semibold text-gray-600">Methodology: </span>
                Score is computed entirely from your AgriManagerX data — no external APIs.
                Dimensions: Record Completeness (25), Financial History (20), Profitability (20),
                Expense Tracking (15), Enterprise Diversity (10), Inventory Management (10).
                This is an indicative score only, not a formal credit assessment.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

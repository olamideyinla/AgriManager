/**
 * PayrollPage — main entry point for the payroll module.
 * MANAGEMENT TOOL DISCLAIMER: Not a licensed payroll processor.
 * Always verify statutory figures with a qualified tax professional.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO, startOfMonth } from 'date-fns'
import {
  ArrowLeft, Play, CheckCircle, Clock, AlertCircle, ChevronRight,
  Users, FileText, BarChart3, Settings, Info,
} from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { FeatureGate } from '../../shared/components/FeatureGate'
import type { PayrollRun, RemittanceObligation } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentPeriod(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM')
}

function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// ── Status badge ──────────────────────────────────────────────────────────────

const RUN_STATUS: Record<string, { label: string; className: string }> = {
  draft:    { label: 'Draft',    className: 'bg-gray-100 text-gray-600' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700' },
  paid:     { label: 'Paid',     className: 'bg-emerald-100 text-emerald-700' },
}

function RunStatusBadge({ status }: { status: string }) {
  const s = RUN_STATUS[status] ?? RUN_STATUS.draft
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
}

const REM_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-700' },
  remitted:  { label: 'Remitted',  className: 'bg-emerald-100 text-emerald-700' },
  overdue:   { label: 'Overdue',   className: 'bg-red-100 text-red-700' },
}

function RemStatusBadge({ status }: { status: string }) {
  const s = REM_STATUS[status] ?? REM_STATUS.pending
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
}

// ── Tab components ─────────────────────────────────────────────────────────────

function ThisMonthTab({
  organizationId,
  fmt,
}: {
  organizationId: string
  fmt: (n: number) => string
}) {
  const navigate = useNavigate()
  const period = currentPeriod()

  const run = useLiveQuery(async () => {
    const runs = await db.payrollRuns
      .where('[organizationId+period]')
      .equals([organizationId, period])
      .toArray()
    return runs[0] ?? null
  }, [organizationId, period])

  const workerCount = useLiveQuery(async () => {
    const profiles = await db.workerPayrollProfiles
      .where('organizationId').equals(organizationId)
      .toArray()
    const activeWorkerIds = profiles.map(p => p.workerId)
    if (activeWorkerIds.length === 0) return 0
    const workers = await db.workers
      .where('id').anyOf(activeWorkerIds)
      .filter(w => w.status === 'active')
      .toArray()
    return workers.length
  }, [organizationId])

  const hasSettings = useLiveQuery(async () => {
    const s = await db.payrollSettings.where('organizationId').equals(organizationId).first()
    return !!s
  }, [organizationId])

  if (hasSettings === undefined || run === undefined) {
    return <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
  }

  if (!hasSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
          <Settings size={28} className="text-primary-600" />
        </div>
        <h3 className="text-gray-900 font-semibold mb-2">Set Up Payroll First</h3>
        <p className="text-gray-500 text-sm mb-6">
          Configure your country, pay day, and statutory deductions before running payroll.
        </p>
        <button
          onClick={() => navigate('/payroll/settings')}
          className="bg-primary-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:bg-primary-700"
        >
          Go to Payroll Settings
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Management tool only — not a licensed payroll processor. Verify statutory figures with a qualified tax professional.
        </p>
      </div>

      {/* Period heading */}
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Period</p>
        <h2 className="text-xl font-bold text-gray-900">{fmtPeriod(period)}</h2>
      </div>

      {/* Workers count */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
          <Users size={20} className="text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{workerCount ?? 0} workers enrolled</p>
          <p className="text-xs text-gray-500">with payroll profiles</p>
        </div>
        <button
          onClick={() => navigate('/payroll/workers')}
          className="ml-auto text-xs text-primary-600 font-medium"
        >
          Manage
        </button>
      </div>

      {/* Run status / CTA */}
      {run ? (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Payroll Run</p>
            <RunStatusBadge status={run.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Gross Pay</p>
              <p className="text-base font-bold text-gray-900">{fmt(run.totalGrossPay)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Net Pay</p>
              <p className="text-base font-bold text-emerald-700">{fmt(run.totalNetPay)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total PAYE</p>
              <p className="text-sm font-semibold text-red-700">{fmt(run.totalPAYE)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pension</p>
              <p className="text-sm font-semibold text-blue-700">{fmt(run.totalPension)}</p>
            </div>
          </div>
          {run.status !== 'paid' && (
            <button
              onClick={() => navigate(`/payroll/run/${run.id}`)}
              className="mt-3 w-full bg-primary-600 text-white text-sm font-semibold py-2.5 rounded-xl active:bg-primary-700"
            >
              {run.status === 'draft' ? 'Review & Approve' : 'Mark as Paid'}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate('/payroll/run')}
          className="w-full bg-primary-600 text-white py-4 rounded-xl flex items-center justify-center gap-3 active:bg-primary-700"
        >
          <Play size={20} />
          <span className="font-semibold">Run {fmtPeriod(period)} Payroll</span>
        </button>
      )}
    </div>
  )
}

function HistoryTab({ organizationId, fmt }: { organizationId: string; fmt: (n: number) => string }) {
  const navigate = useNavigate()

  const runs = useLiveQuery(async () => {
    return db.payrollRuns
      .where('organizationId').equals(organizationId)
      .reverse()
      .sortBy('period')
  }, [organizationId], [])

  if (!runs || runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <BarChart3 size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No payroll runs yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {runs.map(run => (
        <button
          key={run.id}
          onClick={() => navigate(`/payroll/run/${run.id}`)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-white text-left active:bg-gray-50"
        >
          <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={18} className="text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{fmtPeriod(run.period)}</span>
              <RunStatusBadge status={run.status} />
            </div>
            <p className="text-xs text-gray-500">{run.workerCount} workers · Net {fmt(run.totalNetPay)}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
      ))}
    </div>
  )
}

function RemittancesTab({ organizationId, fmt }: { organizationId: string; fmt: (n: number) => string }) {
  const navigate = useNavigate()

  const obligations = useLiveQuery(async () => {
    return db.remittanceObligations
      .where('organizationId').equals(organizationId)
      .reverse()
      .sortBy('dueDate')
  }, [organizationId], [])

  const pending = (obligations ?? []).filter(o => o.status !== 'remitted')
  const totalPending = pending.reduce((s, o) => s + o.totalAmount, 0)
  const overdue = pending.filter(o => o.status === 'overdue')

  if (!obligations || obligations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <CheckCircle size={32} className="text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">No remittance obligations yet</p>
        <p className="text-gray-400 text-xs mt-1">Run payroll to generate remittance records</p>
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      <div className="p-4 flex gap-3">
        <div className="flex-1 bg-yellow-50 rounded-xl p-3">
          <p className="text-xs text-yellow-700 font-medium">Pending</p>
          <p className="text-base font-bold text-yellow-900">{fmt(totalPending)}</p>
        </div>
        <div className="flex-1 bg-red-50 rounded-xl p-3">
          <p className="text-xs text-red-700 font-medium">Overdue</p>
          <p className="text-base font-bold text-red-900">{overdue.length} item{overdue.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {(obligations ?? []).map(ob => (
          <RemittanceRow key={ob.id} obligation={ob} fmt={fmt} onMark={() => navigate(`/payroll/remittance/${ob.id}`)} />
        ))}
      </div>
    </div>
  )
}

function RemittanceRow({
  obligation,
  fmt,
  onMark,
}: {
  obligation: RemittanceObligation
  fmt: (n: number) => string
  onMark: () => void
}) {
  return (
    <button
      onClick={onMark}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white text-left active:bg-gray-50"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        obligation.status === 'overdue' ? 'bg-red-50' :
        obligation.status === 'remitted' ? 'bg-emerald-50' : 'bg-yellow-50'
      }`}>
        {obligation.status === 'remitted'
          ? <CheckCircle size={18} className="text-emerald-600" />
          : obligation.status === 'overdue'
            ? <AlertCircle size={18} className="text-red-600" />
            : <Clock size={18} className="text-yellow-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">{obligation.deductionName}</span>
          <RemStatusBadge status={obligation.status} />
        </div>
        <p className="text-xs text-gray-500">
          {fmtPeriod(obligation.period)} · Due {format(parseISO(obligation.dueDate), 'd MMM yyyy')}
        </p>
        <p className="text-xs text-gray-400">To: {obligation.remittanceTo}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900">{fmt(obligation.totalAmount)}</p>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  )
}

function WorkersTab({ organizationId }: { organizationId: string }) {
  const navigate = useNavigate()

  const workers = useLiveQuery(async () => {
    return db.workers
      .where('organizationId').equals(organizationId)
      .filter(w => w.status === 'active')
      .toArray()
  }, [organizationId], [])

  const profiles = useLiveQuery(async () => {
    const ps = await db.workerPayrollProfiles
      .where('organizationId').equals(organizationId)
      .toArray()
    return new Map(ps.map(p => [p.workerId, p]))
  }, [organizationId], new Map())

  return (
    <div>
      <div className="p-4 pb-2">
        <p className="text-xs text-gray-500">
          Set up payroll profiles for permanent workers who receive monthly salary.
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {(workers ?? []).filter(w => w.workerType === 'permanent').map(worker => {
          const profile = (profiles ?? new Map()).get(worker.id)
          return (
            <button
              key={worker.id}
              onClick={() => navigate(`/payroll/worker/${worker.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white text-left active:bg-gray-50"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-gray-600">
                  {worker.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{worker.name}</p>
                <p className="text-xs text-gray-500">
                  {profile
                    ? `${profile.salaryType === 'monthly' ? 'Monthly' : 'Daily'} · Enrolled`
                    : 'Not enrolled in payroll'}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {profile
                  ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Set up</span>
                  : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Set up</span>
                }
                <ChevronRight size={16} className="text-gray-300" />
              </div>
            </button>
          )
        })}
        {(workers ?? []).filter(w => w.workerType === 'permanent').length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <Users size={32} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No permanent workers yet</p>
            <p className="text-gray-400 text-xs mt-1">Add workers in the Labor module first</p>
            <button
              onClick={() => navigate('/labor')}
              className="mt-4 text-sm text-primary-600 font-medium"
            >
              Go to Labor →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'month' | 'history' | 'remittances' | 'workers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'month',       label: 'This Month' },
  { id: 'history',     label: 'History' },
  { id: 'remittances', label: 'Remittances' },
  { id: 'workers',     label: 'Workers' },
]

export default function PayrollPage() {
  const navigate       = useNavigate()
  const organizationId = useAuthStore(s => s.appUser?.organizationId)
  const { fmt }        = useCurrency()
  const [tab, setTab]  = useState<Tab>('month')

  if (!organizationId) return null

  return (
    <FeatureGate feature="payroll" softLock>
      <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="touch-target text-gray-500">
                <ArrowLeft size={22} />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Payroll</h1>
            </div>
            <button
              onClick={() => navigate('/payroll/settings')}
              className="touch-target text-gray-500"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex -mx-4 px-4 overflow-x-auto gap-4 scrollbar-none">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'text-primary-600 border-primary-600'
                    : 'text-gray-500 border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'month'       && <ThisMonthTab organizationId={organizationId} fmt={fmt} />}
          {tab === 'history'     && <HistoryTab   organizationId={organizationId} fmt={fmt} />}
          {tab === 'remittances' && <RemittancesTab organizationId={organizationId} fmt={fmt} />}
          {tab === 'workers'     && <WorkersTab    organizationId={organizationId} />}
        </div>
      </div>
    </FeatureGate>
  )
}

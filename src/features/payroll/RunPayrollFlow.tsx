/**
 * RunPayrollFlow — review and approve a payroll run.
 * Route: /payroll/run (new run) or /payroll/run/:runId (existing)
 * MANAGEMENT TOOL DISCLAIMER: Not a licensed payroll processor.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfMonth } from 'date-fns'
import { ArrowLeft, CheckCircle, AlertCircle, ChevronRight, Info } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { db } from '../../core/database/db'
import { runMonthlyPayroll, approvePayrollRun, markPayrollPaid } from './services/payroll-runner'
import type { PayrollRun, PayslipRecord } from '../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPeriod(period: string): string {
  const [y, m] = period.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function currentPeriod(): string {
  return format(startOfMonth(new Date()), 'yyyy-MM')
}

// ── Payslip summary row ───────────────────────────────────────────────────────

function PayslipRow({
  payslip,
  fmt,
  onClick,
}: {
  payslip: PayslipRecord
  fmt: (n: number) => string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white text-left active:bg-gray-50"
    >
      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-gray-600">
          {payslip.workerName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{payslip.workerName}</p>
        <p className="text-xs text-gray-500">Gross {fmt(payslip.grossPay)} · PAYE {fmt(payslip.deductions.find(d => d.shortCode === 'PAYE')?.amount ?? 0)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-emerald-700">{fmt(payslip.netPay)}</p>
        <ChevronRight size={16} className="text-gray-300 ml-auto mt-0.5" />
      </div>
    </button>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color = 'gray' }: { label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    gray:    'text-gray-900',
    green:   'text-emerald-700',
    red:     'text-red-700',
    blue:    'text-blue-700',
    yellow:  'text-yellow-700',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-base font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'calculating' | 'review' | 'approving' | 'paying' | 'done' | 'error'

export default function RunPayrollFlow() {
  const navigate       = useNavigate()
  const { runId }      = useParams<{ runId?: string }>()
  const organizationId = useAuthStore(s => s.appUser?.organizationId)
  const appUser        = useAuthStore(s => s.appUser)
  const { fmt }        = useCurrency()

  const [period,    setPeriod]    = useState(currentPeriod())
  const [phase,     setPhase]     = useState<Phase>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [run,       setRun]       = useState<PayrollRun | null>(null)
  const [payslips,  setPayslips]  = useState<PayslipRecord[]>([])

  // If we were given a runId, load the existing run
  const existingRun = useLiveQuery(async () => {
    if (!runId) return null
    return db.payrollRuns.get(runId)
  }, [runId])

  const existingPayslips = useLiveQuery(async () => {
    if (!runId) return null
    return db.payslipRecords.where('payrollRunId').equals(runId).toArray()
  }, [runId])

  useEffect(() => {
    if (existingRun && existingPayslips) {
      setRun(existingRun)
      setPayslips(existingPayslips)
      setPhase('review')
    }
  }, [existingRun, existingPayslips])

  if (!organizationId) return null

  async function handleCalculate() {
    setPhase('calculating')
    setErrorMsg('')
    try {
      const result = await runMonthlyPayroll(organizationId!, period)
      setRun(result.run)
      setPayslips(result.payslips)
      setPhase('review')
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to calculate payroll')
      setPhase('error')
    }
  }

  async function handleApprove() {
    if (!run || !appUser) return
    setPhase('approving')
    try {
      await approvePayrollRun(run.id, appUser.fullName)
      setRun(prev => prev ? { ...prev, status: 'approved' } : prev)
      setPhase('review')
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to approve payroll')
      setPhase('error')
    }
  }

  async function handleMarkPaid() {
    if (!run) return
    setPhase('paying')
    try {
      await markPayrollPaid(run.id, organizationId!)
      setRun(prev => prev ? { ...prev, status: 'paid' } : prev)
      setPhase('done')
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Failed to mark payroll as paid')
      setPhase('error')
    }
  }

  const isPeriodLocked = !!runId  // can't change period for existing run

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/payroll')} className="touch-target text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {run ? fmtPeriod(run.period) : 'Run Payroll'}
        </h1>
        {run && (
          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
            run.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
            run.status === 'approved' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Phase: idle — period selection */}
        {phase === 'idle' && (
          <div className="p-4 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Management tool only. Verify all statutory deductions with a qualified tax professional before paying workers.
              </p>
            </div>

            <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Payroll Period</h2>
              <input
                type="month"
                value={period}
                onChange={e => !isPeriodLocked && setPeriod(e.target.value)}
                disabled={isPeriodLocked}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white disabled:bg-gray-50"
              />
            </section>

            <button
              onClick={handleCalculate}
              className="w-full bg-primary-600 text-white py-4 rounded-xl font-semibold text-base active:bg-primary-700"
            >
              Calculate Payroll
            </button>
          </div>
        )}

        {/* Phase: calculating */}
        {phase === 'calculating' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Calculating payslips…</p>
            <p className="text-gray-400 text-sm">Applying tax brackets and statutory deductions</p>
          </div>
        )}

        {/* Phase: error */}
        {phase === 'error' && (
          <div className="p-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800 mb-1">Could not run payroll</p>
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            </div>
            <button
              onClick={() => setPhase('idle')}
              className="w-full border border-gray-200 bg-white text-gray-700 py-3 rounded-xl font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Phase: review */}
        {phase === 'review' && run && (
          <div>
            {/* Summary stats */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <Stat label="Gross Pay"         value={fmt(run.totalGrossPay)}      color="gray" />
              <Stat label="Net Pay"           value={fmt(run.totalNetPay)}        color="green" />
              <Stat label="Total PAYE"        value={fmt(run.totalPAYE)}          color="red" />
              <Stat label="Pension (Ee)"      value={fmt(run.totalPension)}       color="blue" />
              <Stat label="Employer Costs"    value={fmt(run.totalEmployerCosts)} color="yellow" />
              <Stat label="Workers"           value={String(run.workerCount)}     color="gray" />
            </div>

            {/* Disclaimer */}
            {run.status === 'draft' && (
              <div className="px-4 pb-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    These are estimates based on {run.countryCode} tax profiles (effective {run.profileVersionDate}).
                    Verify all figures before approving.
                  </p>
                </div>
              </div>
            )}

            {/* Payslips */}
            <div className="border-t border-gray-100">
              <p className="px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50">
                Individual Payslips
              </p>
              <div className="divide-y divide-gray-100">
                {payslips.map(ps => (
                  <PayslipRow
                    key={ps.id}
                    payslip={ps}
                    fmt={fmt}
                    onClick={() => navigate(`/payroll/payslip/${ps.id}`)}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 space-y-3">
              {run.status === 'draft' && (
                <button
                  onClick={handleApprove}
                  disabled={phase === 'approving'}
                  className="w-full bg-primary-600 text-white py-4 rounded-xl font-semibold active:bg-primary-700 disabled:opacity-60"
                >
                  {phase === 'approving' ? 'Approving…' : 'Approve Payroll'}
                </button>
              )}
              {run.status === 'approved' && (
                <button
                  onClick={handleMarkPaid}
                  disabled={phase === 'paying'}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold active:bg-emerald-700 disabled:opacity-60"
                >
                  {phase === 'paying' ? 'Processing…' : 'Mark as Paid'}
                </button>
              )}
              {run.status === 'paid' && (
                <div className="flex items-center justify-center gap-2 text-emerald-700">
                  <CheckCircle size={20} />
                  <span className="font-semibold">Payroll Paid</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Phase: done */}
        {phase === 'done' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 px-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payroll Complete!</h2>
            <p className="text-gray-500 text-sm">
              Financial transactions have been recorded. Check Remittances for outstanding statutory payments.
            </p>
            <button
              onClick={() => navigate('/payroll')}
              className="bg-primary-600 text-white font-semibold px-8 py-3 rounded-xl active:bg-primary-700"
            >
              Back to Payroll
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

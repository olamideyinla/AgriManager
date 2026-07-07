import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useAuthStore } from '../../stores/auth-store'
import { useCurrency } from '../../shared/hooks/useCurrency'
import { usePageTitle } from '../../shared/hooks/usePageTitle'
import { FeatureGate } from '../../shared/components/FeatureGate'
import { db } from '../../core/database/db'
import { buildPdf, type PdfSection } from '../../core/services/export-pdf'
import { shareFile } from '../../shared/utils/file-download'
import { calculateDepreciation, calculateTotalCostOfOwnership } from '../machinery/services/machinery-calculator'
import type { MachineCategory, MachineStatus } from '../../shared/types'

const CATEGORY_LABEL: Record<MachineCategory, string> = {
  generator: 'Generator', pump: 'Water Pump', tractor: 'Tractor', vehicle: 'Vehicle',
  processing: 'Processing', irrigation: 'Irrigation', sprayer: 'Sprayer', incubator: 'Incubator',
  cold_storage: 'Cold Storage', feed_mill: 'Feed Mill', tools: 'Tools', other: 'Other',
}

const STATUS_LABEL: Record<MachineStatus, string> = {
  active: 'Active', under_repair: 'Under Repair', idle: 'Idle', retired: 'Retired', sold: 'Sold',
}

function MachineryReportContent() {
  usePageTitle('Machinery & Equipment Report')
  const navigate = useNavigate()
  const orgId = useAuthStore(s => s.appUser?.organizationId)
  const { fmt } = useCurrency()
  const [isExporting, setIsExporting] = useState(false)

  const data = useLiveQuery(async () => {
    if (!orgId) return null
    const machines = await db.machines.where('organizationId').equals(orgId).sortBy('name')
    const machineIds = machines.map(m => m.id)

    const [maintenanceRecords, fuelLogs, org] = await Promise.all([
      machineIds.length > 0 ? db.maintenanceRecords.where('machineId').anyOf(machineIds).toArray() : Promise.resolve([]),
      machineIds.length > 0 ? db.fuelLogs.where('machineId').anyOf(machineIds).toArray() : Promise.resolve([]),
      db.organizations.get(orgId),
    ])

    const rows = machines.map(m => {
      const mMaint = maintenanceRecords.filter(r => r.machineId === m.id)
      const mFuel = fuelLogs.filter(f => f.machineId === m.id)
      const dep = calculateDepreciation(m)
      const tco = calculateTotalCostOfOwnership(m, mMaint, mFuel)
      return {
        machine: m,
        bookValue: m.currentEstimatedValue ?? dep.currentBookValue,
        maintenanceCost: mMaint.reduce((s, r) => s + r.totalCost, 0),
        maintenanceCount: mMaint.length,
        scheduledCount: mMaint.filter(r => r.type === 'scheduled').length,
        unscheduledCount: mMaint.filter(r => r.type !== 'scheduled').length,
        fuelLiters: mFuel.reduce((s, f) => s + f.quantity, 0),
        fuelCost: mFuel.reduce((s, f) => s + f.totalCost, 0),
        tco,
      }
    })

    return {
      farmName: org?.name ?? 'Farm',
      rows,
      totalAssetValue: rows.reduce((s, r) => s + r.bookValue, 0),
      totalMaintenanceCost: rows.reduce((s, r) => s + r.maintenanceCost, 0),
      totalFuelCost: rows.reduce((s, r) => s + r.fuelCost, 0),
      totalTco: rows.reduce((s, r) => s + r.tco.totalCost, 0),
    }
  }, [orgId])

  const handleExport = async () => {
    if (!data) return
    setIsExporting(true)
    try {
      const sections: PdfSection[] = [
        {
          title: 'Asset Register',
          headers: ['Machine', 'Category', 'Status', 'Purchase Value', 'Book Value'],
          rows: data.rows.map(r => [
            r.machine.name,
            CATEGORY_LABEL[r.machine.category],
            STATUS_LABEL[r.machine.status],
            r.machine.purchasePrice != null ? fmt(r.machine.purchasePrice) : '—',
            fmt(r.bookValue),
          ]),
        },
        {
          title: 'Maintenance Summary',
          headers: ['Machine', 'Scheduled', 'Unscheduled', 'Total Cost'],
          rows: data.rows.map(r => [r.machine.name, String(r.scheduledCount), String(r.unscheduledCount), fmt(r.maintenanceCost)]),
        },
        {
          title: 'Fuel Consumption',
          headers: ['Machine', 'Total Liters', 'Total Cost'],
          rows: data.rows.map(r => [r.machine.name, r.fuelLiters.toFixed(1), fmt(r.fuelCost)]),
        },
        {
          title: 'Total Cost of Ownership',
          headers: ['Machine', 'Purchase', 'Maintenance', 'Fuel', 'Total'],
          rows: data.rows.map(r => [
            r.machine.name, fmt(r.tco.breakdown.purchase), fmt(r.tco.breakdown.maintenance),
            fmt(r.tco.breakdown.fuel), fmt(r.tco.totalCost),
          ]),
        },
      ]

      const doc = buildPdf({
        title: 'Machinery & Equipment Report',
        subtitle: `Total asset value: ${fmt(data.totalAssetValue)} · Total cost of ownership: ${fmt(data.totalTco)}`,
        farmName: data.farmName,
        sections,
      })
      const blob = doc.output('blob')
      await shareFile(blob, `machinery-report-${new Date().toISOString().slice(0, 10)}.pdf`, 'Machinery Report')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-10 fade-in">
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 active:scale-95 transition-transform -ml-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Machinery & Equipment</h1>
          <p className="text-xs text-gray-500">Asset register, maintenance, fuel & cost of ownership</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!data ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading…</div>
        ) : data.rows.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-2">🚜</p>
            <p className="text-sm text-gray-500 font-medium">No machines recorded yet</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-primary-700">{fmt(data.totalAssetValue)}</p>
                <p className="text-xs text-gray-500">Total Asset Value</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-800">{fmt(data.totalTco)}</p>
                <p className="text-xs text-gray-500">Total Cost of Ownership</p>
              </div>
            </div>

            {/* Asset register table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-x-auto">
              <p className="text-sm font-semibold text-gray-700 mb-3">Asset Register</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-semibold">Machine</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2 font-semibold text-right">Book Value</th>
                    <th className="pb-2 font-semibold text-right">TCO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => (
                    <tr key={r.machine.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium text-gray-800">{r.machine.name}</td>
                      <td className="py-2 text-gray-500">{STATUS_LABEL[r.machine.status]}</td>
                      <td className="py-2 text-right font-medium text-gray-700">{fmt(r.bookValue)}</td>
                      <td className="py-2 text-right font-medium text-gray-700">{fmt(r.tco.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60 active:bg-primary-700 transition-colors"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isExporting ? 'Generating PDF…' : 'Export PDF'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MachineryReportPage() {
  return (
    <FeatureGate feature="machinery_equipment" softLock>
      <MachineryReportContent />
    </FeatureGate>
  )
}

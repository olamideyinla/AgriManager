import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../../../core/database/db'
import type { EnterpriseInstance } from '../../../shared/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type RecordKind =
  | 'placement' | 'fish_stocking' | 'thinning' | 'batch_closeout'
  | 'litter' | 'soil_test' | 'post_harvest' | 'animal_registry'

interface ActionButton {
  kind: RecordKind
  label: string
  path: string
  icon: string
}

function getActions(enterprise: EnterpriseInstance): ActionButton[] {
  const base = `/enterprises/${enterprise.id}/records`
  const t    = enterprise.enterpriseType
  const buttons: ActionButton[] = []

  if (t === 'layers' || t === 'broilers') {
    buttons.push(
      { kind: 'placement',     label: 'Placement',  path: `${base}/placement`,  icon: '🐣' },
      { kind: 'thinning',      label: 'Thinning',   path: `${base}/thinning`,   icon: '✂️' },
      { kind: 'batch_closeout',label: 'Close-out',  path: `${base}/closeout`,   icon: '📋' },
    )
  } else if (t === 'fish') {
    buttons.push(
      { kind: 'fish_stocking', label: 'Stocking',   path: `${base}/fish-stocking`, icon: '🐟' },
      { kind: 'thinning',      label: 'Thinning',   path: `${base}/thinning`,      icon: '✂️' },
      { kind: 'batch_closeout',label: 'Close-out',  path: `${base}/closeout`,      icon: '📋' },
    )
  } else if (t === 'pigs_breeding' || t === 'pigs_growfinish') {
    buttons.push(
      { kind: 'placement',     label: 'Placement',  path: `${base}/placement`,  icon: '🐣' },
      { kind: 'litter',        label: 'Litter',     path: `${base}/litter`,     icon: '🌾' },
      { kind: 'thinning',      label: 'Thinning',   path: `${base}/thinning`,   icon: '✂️' },
    )
  } else if (t === 'crop_annual' || t === 'crop_perennial') {
    buttons.push(
      { kind: 'soil_test',    label: 'Soil Test',   path: `${base}/soil-test`,    icon: '🧪' },
      { kind: 'post_harvest', label: 'Post-Harvest',path: `${base}/post-harvest`, icon: '🏭' },
    )
  } else if (t === 'cattle_dairy' || t === 'cattle_beef' || t === 'rabbit' || t === 'custom_animal') {
    buttons.push(
      { kind: 'placement',     label: 'Placement',  path: `${base}/placement`,  icon: '🐣' },
      { kind: 'thinning',      label: 'Thinning',   path: `${base}/thinning`,   icon: '✂️' },
      { kind: 'batch_closeout',label: 'Close-out',  path: `${base}/closeout`,   icon: '📋' },
    )
    buttons.push(
      { kind: 'animal_registry', label: 'Animals', path: `/enterprises/${enterprise.id}/animals`, icon: '🏷️' },
    )
  } else {
    buttons.push(
      { kind: 'placement',     label: 'Placement',  path: `${base}/placement`,  icon: '🐣' },
      { kind: 'thinning',      label: 'Thinning',   path: `${base}/thinning`,   icon: '✂️' },
      { kind: 'batch_closeout',label: 'Close-out',  path: `${base}/closeout`,   icon: '📋' },
    )
  }
  return buttons
}

// ── History rows ───────────────────────────────────────────────────────────────

interface HistoryRow {
  id: string
  date: string
  label: string
  summary: string
  icon: string
}

function useHistory(enterpriseId: string): HistoryRow[] {
  const placements = useLiveQuery(
    () => db.placementRecords.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const thinnings = useLiveQuery(
    () => db.thinningRecords.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const closeouts = useLiveQuery(
    () => db.batchCloseouts.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const fishStockings = useLiveQuery(
    () => db.fishStockingRecords.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const litters = useLiveQuery(
    () => db.litterConditionLogs.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const soilTests = useLiveQuery(
    () => db.soilTestRecords.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const postHarvests = useLiveQuery(
    () => db.postHarvestRecords.where('enterpriseInstanceId').equals(enterpriseId).toArray(),
    [enterpriseId],
  ) ?? []

  const rows: HistoryRow[] = [
    ...placements.map(r => ({
      id:      r.id,
      date:    r.placementDate,
      label:   'Placement',
      summary: `${r.count.toLocaleString()} placed${r.breedOrStrain ? ` · ${r.breedOrStrain}` : ''}`,
      icon:    '🐣',
    })),
    ...thinnings.map(r => ({
      id:      r.id,
      date:    r.date,
      label:   'Thinning',
      summary: `${r.count.toLocaleString()} ${r.disposal}${r.avgWeightKg ? ` · ${r.avgWeightKg} kg avg` : ''}`,
      icon:    '✂️',
    })),
    ...closeouts.map(r => ({
      id:      r.id,
      date:    r.closeoutDate,
      label:   'Batch Close-out',
      summary: `${r.totalDays}d · ${r.mortalityRate}% mortality · ${(r.netProfitCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} net`,
      icon:    '📋',
    })),
    ...fishStockings.map(r => ({
      id:      r.id,
      date:    r.stockingDate,
      label:   'Fish Stocking',
      summary: `${r.count.toLocaleString()} fingerlings${r.species ? ` · ${r.species}` : ''}`,
      icon:    '🐟',
    })),
    ...litters.map(r => ({
      id:      r.id,
      date:    r.date,
      label:   'Litter Check',
      summary: `${r.condition}${r.ammoniaLevel ? ` · NH₃ ${r.ammoniaLevel}` : ''} · ${r.action}`,
      icon:    '🌾',
    })),
    ...soilTests.map(r => ({
      id:      r.id,
      date:    r.testDate,
      label:   'Soil Test',
      summary: `${r.ph ? `pH ${r.ph}` : 'No pH'}${r.recommendation ? ` · ${r.recommendation.slice(0, 30)}` : ''}`,
      icon:    '🧪',
    })),
    ...postHarvests.map(r => ({
      id:      r.id,
      date:    r.date,
      label:   'Post-Harvest',
      summary: `${r.totalHarvestKg.toLocaleString()} kg total${r.soldKg ? ` · ${r.soldKg} kg sold` : ''}`,
      icon:    '🏭',
    })),
  ]

  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RecordHistoryTab({ enterprise }: { enterprise: EnterpriseInstance }) {
  const navigate = useNavigate()
  const actions  = getActions(enterprise)
  const history  = useHistory(enterprise.id)

  return (
    <div className="p-4 space-y-4">

      {/* Quick-add buttons */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add Record</p>
        <div className="flex flex-wrap gap-2">
          {actions.map(a => (
            <button
              key={a.kind}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 shadow-sm active:scale-95 transition-transform"
            >
              <span>{a.icon}</span>
              <span>{a.label}</span>
              <Plus size={14} className="text-primary-500" />
            </button>
          ))}
        </div>
      </div>

      {/* History list */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📄</p>
          <p className="text-sm">No event records yet</p>
          <p className="text-xs mt-1">Use the buttons above to log your first event</p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">History</p>
          <div className="space-y-2">
            {history.map(row => (
              <div
                key={row.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3"
              >
                <span className="text-2xl flex-shrink-0">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">{row.label}</p>
                  <p className="text-xs text-gray-500 truncate">{row.summary}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">{row.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

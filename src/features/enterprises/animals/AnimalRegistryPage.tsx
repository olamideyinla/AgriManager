import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Tag } from 'lucide-react'
import { db } from '../../../core/database/db'
import type { AnimalRecord, AnimalStatus } from '../../../shared/types'

const STATUS_GROUPS: { status: AnimalStatus; label: string; color: string }[] = [
  { status: 'active',      label: 'Active',      color: 'text-emerald-700 bg-emerald-50' },
  { status: 'sold',        label: 'Sold',        color: 'text-blue-700 bg-blue-50' },
  { status: 'deceased',    label: 'Deceased',    color: 'text-gray-600 bg-gray-100' },
  { status: 'transferred', label: 'Transferred', color: 'text-amber-700 bg-amber-50' },
]

const SEX_ICON: Record<string, string> = { male: '♂', female: '♀', unknown: '?' }

function AnimalRow({ animal, onPress }: { animal: AnimalRecord; onPress: () => void }) {
  const latestWeight = useLiveQuery(
    async () => {
      const entries = await db.animalWeightEntries
        .where('[animalId+date]')
        .between([animal.id, '0000-00-00'], [animal.id, '9999-99-99'], true, true)
        .toArray()
      if (!entries.length) return null
      return entries.sort((a, b) => b.date.localeCompare(a.date))[0]
    },
    [animal.id],
  )

  return (
    <button
      onClick={onPress}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
        {SEX_ICON[animal.sex] ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Tag size={12} className="text-gray-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-800 truncate">
            {animal.tagId}{animal.name ? ` · ${animal.name}` : ''}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {animal.breedOrStrain ?? 'Unknown breed'}
          {latestWeight ? ` · ${latestWeight.weightKg} kg (${latestWeight.date})` : ''}
        </p>
      </div>
    </button>
  )
}

export default function AnimalRegistryPage() {
  const { id: enterpriseId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const enterprise = useLiveQuery(
    () => enterpriseId ? db.enterpriseInstances.get(enterpriseId) : undefined,
    [enterpriseId],
  )

  const animals = useLiveQuery(
    async () => {
      if (!enterpriseId) return []
      return db.animalRecords
        .where('enterpriseInstanceId').equals(enterpriseId)
        .toArray()
    },
    [enterpriseId],
  ) ?? []

  const grouped = STATUS_GROUPS.map(g => ({
    ...g,
    animals: animals.filter(a => a.status === g.status),
  })).filter(g => g.animals.length > 0)

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 px-4 pt-3 pb-4 safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-lg leading-tight">Animal Registry</p>
            <p className="text-white/60 text-xs truncate">{enterprise?.name ?? '…'} · {animals.length} animals</p>
          </div>
          <button
            onClick={() => navigate(`/enterprises/${enterpriseId}/animals/register`)}
            className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {animals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏷️</p>
            <p className="text-sm font-medium text-gray-500">No animals registered yet</p>
            <p className="text-xs text-gray-400 mt-1">Tap + to register your first animal</p>
            <button
              onClick={() => navigate(`/enterprises/${enterpriseId}/animals/register`)}
              className="mt-4 btn-primary text-sm"
            >
              Register Animal
            </button>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.status}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${group.color}`}>
                  {group.label}
                </span>
                <span className="text-xs text-gray-400">{group.animals.length}</span>
              </div>
              <div className="space-y-2">
                {group.animals.map(a => (
                  <AnimalRow
                    key={a.id}
                    animal={a}
                    onPress={() => navigate(`/enterprises/${enterpriseId}/animals/${a.id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

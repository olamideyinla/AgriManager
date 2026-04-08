import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Plus, Scale, Activity } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { nanoid } from 'nanoid'
import { db } from '../../../core/database/db'
import { TrendLineChart } from '../../../shared/components/charts/TrendLineChart'
import { useAuthStore } from '../../../stores/auth-store'
import { useUIStore } from '../../../stores/ui-store'
import type { AnimalEvent, AnimalEventType, AnimalStatus } from '../../../shared/types'

const STATUS_COLOR: Record<AnimalStatus, string> = {
  active:      'bg-emerald-100 text-emerald-700',
  sold:        'bg-blue-100 text-blue-700',
  deceased:    'bg-gray-100 text-gray-600',
  transferred: 'bg-amber-100 text-amber-700',
}

const EVENT_TYPE_ICONS: Record<AnimalEventType, string> = {
  birth: '🐣', weaning: '🌱', breeding: '💞', pregnancy_confirmed: '✅',
  farrowing: '👶', treatment: '💊', sold: '💰', deceased: '💀',
  transferred: '➡️', other: '📝',
}

// ── Add Event Sheet ────────────────────────────────────────────────────────────

interface AddEventFormValues {
  date: string
  eventType: AnimalEventType
  description: string
  amountCents: string
  notes: string
}

function AddEventSheet({ enterpriseId, animalId, onClose }: {
  enterpriseId: string; animalId: string; onClose: () => void
}) {
  const orgId    = useAuthStore(s => s.appUser?.organizationId) ?? ''
  const addToast = useUIStore(s => s.addToast)
  const [isSaving, setIsSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, setValue } = useForm<AddEventFormValues>({
    defaultValues: { date: today, eventType: 'other', description: '', amountCents: '', notes: '' },
  })

  const eventType = watch('eventType')

  const onSubmit = async (values: AddEventFormValues) => {
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const event: AnimalEvent = {
        id: nanoid(),
        animalId,
        enterpriseInstanceId: enterpriseId,
        organizationId: orgId,
        date: values.date,
        eventType: values.eventType,
        description: values.description.trim() || undefined,
        amountCents: values.amountCents ? Math.round(parseFloat(values.amountCents) * 100) : undefined,
        notes: values.notes.trim() || undefined,
        syncStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      await db.animalEvents.put(event)
      addToast({ message: 'Event logged', type: 'success' })
      onClose()
    } catch {
      addToast({ message: 'Failed to save', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const EVENT_TYPES: AnimalEventType[] = [
    'birth', 'weaning', 'breeding', 'pregnancy_confirmed', 'farrowing',
    'treatment', 'sold', 'deceased', 'transferred', 'other',
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-3xl p-4 space-y-4 pb-8 max-h-[85dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-gray-800">Log Event</p>
          <button onClick={onClose} className="text-gray-400 text-sm font-medium">Cancel</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" {...register('date')} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event type</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(et => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setValue('eventType', et)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    eventType === et
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{EVENT_TYPE_ICONS[et]}</span>
                  <span className="capitalize">{et.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input {...register('description')} placeholder="Brief description" className="input-base" />
          </div>
          {(eventType === 'sold' || eventType === 'treatment') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {eventType === 'sold' ? 'Sale proceeds ($)' : 'Treatment cost ($)'}
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amountCents')}
                placeholder="0.00"
                className="input-base"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea {...register('notes')} rows={2} placeholder="Optional notes" className="input-base resize-none" />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full btn-primary disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : 'Log Event'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────���─

export default function AnimalDetailPage() {
  const { id: enterpriseId, animalId } = useParams<{ id: string; animalId: string }>()
  const navigate = useNavigate()
  const [showEventSheet, setShowEventSheet] = useState(false)

  const animal = useLiveQuery(
    () => animalId ? db.animalRecords.get(animalId) : undefined,
    [animalId],
  )

  const weightEntries = useLiveQuery(
    async () => {
      if (!animalId) return []
      const entries = await db.animalWeightEntries
        .where('[animalId+date]')
        .between([animalId, '0000-00-00'], [animalId, '9999-99-99'], true, true)
        .toArray()
      return entries.sort((a, b) => b.date.localeCompare(a.date))
    },
    [animalId],
  ) ?? []

  const events = useLiveQuery(
    async () => {
      if (!animalId) return []
      const evts = await db.animalEvents
        .where('[animalId+date]')
        .between([animalId, '0000-00-00'], [animalId, '9999-99-99'], true, true)
        .toArray()
      return evts.sort((a, b) => b.date.localeCompare(a.date))
    },
    [animalId],
  ) ?? []

  const weightChartData = weightEntries
    .slice()
    .reverse()
    .map(e => ({ date: e.date.slice(5), value: e.weightKg }))

  if (!animal) {
    return <div className="flex h-dvh items-center justify-center text-gray-400 text-sm">Loading…</div>
  }

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
            <p className="text-white font-semibold text-lg leading-tight">
              {animal.tagId}{animal.name ? ` · ${animal.name}` : ''}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[animal.status]}`}>
                {animal.status}
              </span>
              <span className="text-white/60 text-xs">{animal.breedOrStrain ?? 'Unknown breed'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Details</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Sex',         value: animal.sex },
              { label: 'Birth date',  value: animal.birthDate ?? '—' },
              { label: 'Acquired',    value: animal.acquisitionDate },
              { label: 'Latest weight', value: weightEntries[0] ? `${weightEntries[0].weightKg} kg` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-800 capitalize">{value}</p>
              </div>
            ))}
          </div>
          {animal.notes && (
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">{animal.notes}</p>
          )}
        </div>

        {/* Weight history */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Weight History</p>
            <button
              onClick={() => navigate(`/enterprises/${enterpriseId}/animals/${animalId}/weight`)}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Scale size={13} />
              Log Weight
            </button>
          </div>
          {weightChartData.length > 0 ? (
            <>
              <TrendLineChart
                data={weightChartData}
                label="Weight"
                unit=" kg"
                color="#2D6A4F"
                height={150}
                showGrid
              />
              <div className="mt-3 space-y-2">
                {weightEntries.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{e.date}</span>
                    <span className="font-semibold text-gray-800">{e.weightKg} kg</span>
                    {e.bodyConditionScore != null && (
                      <span className="text-gray-400">BCS {e.bodyConditionScore}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No weight entries yet</p>
              <button
                onClick={() => navigate(`/enterprises/${enterpriseId}/animals/${animalId}/weight`)}
                className="mt-2 text-xs text-primary-600 font-medium"
              >
                Log first weight →
              </button>
            </div>
          )}
        </div>

        {/* Event log */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Event Log</p>
            <button
              onClick={() => setShowEventSheet(true)}
              className="flex items-center gap-1 text-xs text-primary-600 font-medium"
            >
              <Activity size={13} />
              Add Event
            </button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No events logged yet</p>
          ) : (
            <div className="space-y-2">
              {events.map(evt => (
                <div key={evt.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xl flex-shrink-0">{EVENT_TYPE_ICONS[evt.eventType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 capitalize">{evt.eventType.replace('_', ' ')}</p>
                    {evt.description && <p className="text-xs text-gray-500 truncate">{evt.description}</p>}
                    {evt.amountCents != null && (
                      <p className="text-xs text-emerald-600 font-medium">${(evt.amountCents / 100).toFixed(2)}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0">{evt.date}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FABs */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/enterprises/${enterpriseId}/animals/${animalId}/weight`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 text-white font-semibold text-sm active:bg-primary-700"
          >
            <Scale size={16} />
            Log Weight
          </button>
          <button
            onClick={() => setShowEventSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm active:bg-gray-50"
          >
            <Plus size={16} />
            Add Event
          </button>
        </div>
      </div>

      {showEventSheet && enterpriseId && animalId && (
        <AddEventSheet
          enterpriseId={enterpriseId}
          animalId={animalId}
          onClose={() => setShowEventSheet(false)}
        />
      )}
    </div>
  )
}

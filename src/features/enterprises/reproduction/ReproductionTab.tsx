import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Baby, Heart, Stethoscope, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useReproductiveEvents } from '../../../core/database/hooks/use-reproductive-events'
import type { EnterpriseInstance, ReproductiveEvent, ReproductiveEventType } from '../../../shared/types'

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<ReproductiveEventType, { label: string; emoji: string; color: string }> = {
  heat_observed:               { label: 'Heat Observed',        emoji: '🔥', color: 'bg-red-100 text-red-700' },
  service_natural:             { label: 'Natural Service',      emoji: '🐂', color: 'bg-blue-100 text-blue-700' },
  service_ai:                  { label: 'AI Service',           emoji: '💉', color: 'bg-indigo-100 text-indigo-700' },
  pregnancy_check_positive:    { label: 'Pregnancy ✓ Positive', emoji: '✅', color: 'bg-emerald-100 text-emerald-700' },
  pregnancy_check_negative:    { label: 'Pregnancy ✓ Negative', emoji: '❌', color: 'bg-gray-100 text-gray-600' },
  farrowing:                   { label: 'Farrowing',            emoji: '🐷', color: 'bg-pink-100 text-pink-700' },
  calving:                     { label: 'Calving',              emoji: '🐄', color: 'bg-amber-100 text-amber-700' },
  kindling:                    { label: 'Kindling',             emoji: '🐰', color: 'bg-purple-100 text-purple-700' },
  weaning:                     { label: 'Weaning',              emoji: '🍼', color: 'bg-teal-100 text-teal-700' },
  dry_off:                     { label: 'Dry Off',              emoji: '🥛', color: 'bg-gray-100 text-gray-600' },
  abortion:                    { label: 'Abortion',             emoji: '⚠️', color: 'bg-orange-100 text-orange-700' },
}

// ── Summary stats ─────────────────────────────────────────────────────────────

function ReproSummary({ events }: { events: ReproductiveEvent[] }) {
  const births = events.filter(e => ['farrowing', 'calving', 'kindling'].includes(e.eventType))
  const totalBorn = births.reduce((s, e) => s + (e.litterSize ?? 0), 0)
  const totalAlive = births.reduce((s, e) => s + (e.litterSizeAlive ?? e.litterSize ?? 0), 0)
  const services = events.filter(e => ['service_natural', 'service_ai'].includes(e.eventType)).length
  const pregnancies = events.filter(e => e.eventType === 'pregnancy_check_positive').length

  return (
    <div className="grid grid-cols-3 gap-2 mx-4 mb-3">
      <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
        <p className="text-lg font-bold text-emerald-600">{births.length}</p>
        <p className="text-xs text-gray-500 mt-0.5">Litters</p>
      </div>
      <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
        <p className="text-lg font-bold text-primary-600">{totalAlive}</p>
        <p className="text-xs text-gray-500 mt-0.5">Born alive</p>
      </div>
      <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
        <p className="text-lg font-bold text-amber-600">{services}</p>
        <p className="text-xs text-gray-500 mt-0.5">Services</p>
      </div>
    </div>
  )
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: ReproductiveEvent }) {
  const cfg = EVENT_CONFIG[event.eventType]
  const dateLabel = (() => {
    try { return format(new Date(event.eventDate), 'MMM d, yyyy') }
    catch { return event.eventDate }
  })()

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-start gap-3">
      <span className="text-2xl mt-0.5 shrink-0">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
          {event.animalTagId && (
            <span className="text-xs text-gray-500">Tag: {event.animalTagId}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{dateLabel}</p>
        {(event.litterSize != null) && (
          <p className="text-xs text-gray-600 mt-0.5">
            Born: {event.litterSize} total
            {event.litterSizeAlive != null && ` · ${event.litterSizeAlive} alive`}
            {event.maleCount != null && ` · ${event.maleCount}M / ${event.femaleCount ?? '?'}F`}
          </p>
        )}
        {event.notes && <p className="text-xs text-gray-500 mt-1 italic">{event.notes}</p>}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const FILTER_TYPES: { label: string; types: ReproductiveEventType[] | null }[] = [
  { label: 'All', types: null },
  { label: 'Services', types: ['service_natural', 'service_ai'] },
  { label: 'Births', types: ['farrowing', 'calving', 'kindling'] },
  { label: 'Health', types: ['pregnancy_check_positive', 'pregnancy_check_negative', 'abortion'] },
]

export function ReproductionTab({ enterprise }: { enterprise: EnterpriseInstance }) {
  const navigate = useNavigate()
  const [filterIdx, setFilterIdx] = useState(0)

  const allEvents = useReproductiveEvents(enterprise.id)

  if (allEvents === undefined) {
    return <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
  }

  const filter = FILTER_TYPES[filterIdx]
  const events = filter.types
    ? allEvents.filter(e => filter.types!.includes(e.eventType))
    : allEvents

  return (
    <div className="pb-24">
      {/* Summary */}
      <div className="pt-4">
        <ReproSummary events={allEvents} />
      </div>

      {/* Filter chips */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {FILTER_TYPES.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setFilterIdx(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filterIdx === i
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="px-4 space-y-2 mt-2">
        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Baby className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No reproductive events recorded</p>
            <p className="text-xs mt-1">Tap the + button to add one</p>
          </div>
        ) : (
          events.map(e => <EventRow key={e.id} event={e} />)
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate(`/enterprises/${enterprise.id}/reproduction/new`)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-50"
        aria-label="Record reproductive event"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}

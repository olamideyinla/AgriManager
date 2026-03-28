import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, History, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '../../stores/auth-store'
import { useUIStore } from '../../stores/ui-store'
import { useTodayChecklist, useWorkerStreak } from '../../core/database/hooks/use-worker-tasks'
import { generateDailyChecklist, recalculateChecklistCompletion } from '../../core/services/checklist-generator'
import { initReminderScheduler, loadReminderConfig } from '../../core/services/worker-reminder-engine'
import { db } from '../../core/database/db'
import { nowIso } from '../../shared/types/base'
import type { DailyTask, TimeWindow } from '../../shared/types'

// ── Constants ─────────────────────────────────────────────────────────────────

const SNOOZE_MS = 15 * 60 * 1_000 // 15 minutes

// ── Confetti burst ────────────────────────────────────────────────────────────

function ConfettiBurst() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-ping"
          style={{
            backgroundColor: ['#22c55e','#3b82f6','#f59e0b','#ec4899','#8b5cf6'][i % 5],
            top: `${30 + Math.sin(i * 30) * 25}%`,
            left: `${40 + Math.cos(i * 30) * 30}%`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  )
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 72 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="white" strokeWidth={6} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}

// ── Time window icons ─────────────────────────────────────────────────────────

const WINDOW_ICON: Record<TimeWindow, string> = {
  morning: '☀️',
  midday:  '🌤️',
  evening: '🌙',
  anytime: '📋',
}

const WINDOW_LABEL: Record<TimeWindow, string> = {
  morning: 'Morning',
  midday:  'Midday',
  evening: 'Evening',
  anytime: 'Anytime',
}

// ── Focus task card ───────────────────────────────────────────────────────────

function FocusCard({
  task,
  isCompleting,
  onYes,
  onNo,
}: {
  task: DailyTask
  isCompleting: boolean
  onYes: () => void
  onNo: () => void
}) {
  const isEntry = task.type === 'data_entry' || task.type === 'health_event'

  const stripColor =
    task.priority === 'required'
      ? 'bg-red-50 text-red-700 border-red-100'
      : task.priority === 'recommended'
      ? 'bg-blue-50 text-blue-700 border-blue-100'
      : 'bg-gray-50 text-gray-500 border-gray-100'

  return (
    <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
      {/* Time window + priority strip */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-sm font-semibold ${stripColor}`}>
        <span>{WINDOW_ICON[task.timeWindow]}</span>
        <span>{WINDOW_LABEL[task.timeWindow]}</span>
        <span className="ml-auto uppercase text-xs tracking-wide opacity-80">{task.priority}</span>
      </div>

      {/* Task content */}
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-xl font-bold text-gray-900 leading-snug">{task.title}</h2>
        {task.description && (
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{task.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-5 space-y-3">
        <button
          onClick={onYes}
          disabled={isCompleting}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-colors disabled:opacity-60 ${
            isEntry
              ? 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700'
          }`}
        >
          {isCompleting ? 'Saving…' : isEntry ? '→ Open Entry Form' : '✓  Yes — Done'}
        </button>

        <button
          onClick={onNo}
          disabled={isCompleting}
          className="w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 transition-colors disabled:opacity-40"
        >
          🕐  Not yet — Remind me in 15 min
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkerTasksPage() {
  const navigate = useNavigate()
  const appUser  = useAuthStore(s => s.appUser)
  const addToast = useUIStore(s => s.addToast)

  const today = format(new Date(), 'yyyy-MM-dd')
  const hour  = new Date().getHours()

  const checklistData = useTodayChecklist(appUser?.id)
  const streak        = useWorkerStreak(appUser?.id)

  const [generating, setGenerating]       = useState(false)
  const [completing, setCompleting]       = useState<string | null>(null)
  const [snoozed, setSnoozed]             = useState<Map<string, number>>(new Map()) // taskId → snoozeUntil
  const snoozeIntervalsRef                = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const [showConfetti, setShowConfetti]   = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const reminderRef                       = useRef<{ stop: () => void } | null>(null)

  // Generate checklist on mount
  useEffect(() => {
    if (!appUser) return
    const gen = async () => {
      setGenerating(true)
      try { await generateDailyChecklist(appUser, today) }
      catch (e) { console.error('Checklist generation failed:', e) }
      finally { setGenerating(false) }
    }
    void gen()
  }, [appUser?.id])

  // Init reminder scheduler (morning/midday/evening notifications)
  useEffect(() => {
    if (!appUser?.id) return
    const cfg = loadReminderConfig()
    reminderRef.current = initReminderScheduler(appUser.id, cfg)
    return () => reminderRef.current?.stop()
  }, [appUser?.id])

  // Clean up all snooze intervals on unmount
  useEffect(() => {
    return () => {
      for (const id of snoozeIntervalsRef.current.values()) clearInterval(id)
    }
  }, [])

  // Periodically un-snooze tasks whose time has elapsed
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now()
      setSnoozed(prev => {
        let changed = false
        const next = new Map(prev)
        for (const [id, until] of next) {
          if (now >= until) { next.delete(id); changed = true }
        }
        return changed ? next : prev
      })
    }, 30_000)
    return () => clearInterval(tick)
  }, [])

  // Watch for 100% completion → confetti
  useEffect(() => {
    if (checklistData?.checklist.completionPct === 100 && (checklistData?.tasks.length ?? 0) > 0) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
    }
  }, [checklistData?.checklist.completionPct])

  // ── Derived state ────────────────────────────────────────────────────────────

  const allTasks       = checklistData?.tasks ?? []
  const completedTasks = allTasks.filter(t => t.status === 'completed' || t.status === 'skipped')
  const pendingTasks   = allTasks.filter(t => t.status === 'pending' && !snoozed.has(t.id))
  const snoozedCount   = allTasks.filter(t => t.status === 'pending' && snoozed.has(t.id)).length
  const currentTask    = pendingTasks[0] ?? null
  const nextTask       = pendingTasks[1] ?? null
  const pct            = checklistData?.checklist.completionPct ?? 0
  const allDone        = allTasks.length > 0 && pendingTasks.length === 0 && snoozedCount === 0

  const dayName  = format(new Date(), 'EEEE, d MMMM')
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const clearSnooze = (taskId: string) => {
    if (snoozeIntervalsRef.current.has(taskId)) {
      clearInterval(snoozeIntervalsRef.current.get(taskId)!)
      snoozeIntervalsRef.current.delete(taskId)
    }
    setSnoozed(prev => { const m = new Map(prev); m.delete(taskId); return m })
  }

  const handleYes = async (task: DailyTask) => {
    clearSnooze(task.id)

    if (task.type === 'data_entry' && task.enterpriseInstanceId) {
      navigate(`/daily-entry/${task.enterpriseInstanceId}?date=${today}`)
      return
    }
    if (task.type === 'health_event' && task.linkedRecordId) {
      navigate('/health')
      return
    }

    setCompleting(task.id)
    try {
      await db.dailyTasks.update(task.id, {
        status: 'completed',
        completedAt: nowIso(),
        completedBy: appUser?.id ?? '',
        notes: null,
      })
      if (checklistData) await recalculateChecklistCompletion(checklistData.checklist.id)
      addToast({ message: `✓ ${task.title}`, type: 'success' })
    } finally {
      setCompleting(null)
    }
  }

  const handleNo = (task: DailyTask) => {
    // Cancel any existing snooze for this task
    clearSnooze(task.id)

    // Snooze for 15 minutes
    const snoozeUntil = Date.now() + SNOOZE_MS
    setSnoozed(prev => new Map(prev).set(task.id, snoozeUntil))
    addToast({ message: "We'll remind you in 15 min", type: 'info' })

    // Set a one-shot interval: fires once after 15 min, un-snoozes the task
    // (if user taps NO again, a NEW interval will be created)
    const intervalId = setInterval(async () => {
      clearInterval(intervalId)
      snoozeIntervalsRef.current.delete(task.id)

      // Check if task is still pending
      const t = await db.dailyTasks.get(task.id)
      if (!t || t.status !== 'pending') return

      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Task reminder 🔔', {
          body: task.title,
          icon: '/icon-192.png',
          tag: `task-snooze-${task.id}`,
        })
      }

      // Un-snooze so it re-appears as the current task
      setSnoozed(prev => { const m = new Map(prev); m.delete(task.id); return m })
      addToast({ message: `⏰ Reminder: ${task.title}`, type: 'warning' })
    }, SNOOZE_MS)

    snoozeIntervalsRef.current.set(task.id, intervalId)
  }

  const handleRefresh = async () => {
    if (!appUser) return
    setGenerating(true)
    try { await generateDailyChecklist(appUser, today) }
    finally { setGenerating(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {showConfetti && <ConfettiBurst />}

      {/* Header */}
      <div className="bg-primary-600 px-4 pt-3 pb-5 safe-top flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white">
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleRefresh()}
              disabled={generating}
              className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white disabled:animate-spin"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => navigate('/worker/history')}
              className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white"
            >
              <History size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4">
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing pct={pct} size={72} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{pct}%</span>
            </div>
          </div>

          {/* Greeting + summary */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-white/70 text-xs">{dayName}</p>
            <h1 className="text-white text-lg font-bold mt-0.5 leading-tight">
              {greeting}{appUser?.fullName ? `, ${appUser.fullName.split(' ')[0]}` : ''}!
            </h1>
            {generating ? (
              <p className="text-white/70 text-xs mt-1">Preparing tasks…</p>
            ) : allDone ? (
              <p className="text-white font-semibold text-sm mt-1">All done! 🎉</p>
            ) : (
              <p className="text-white/80 text-xs mt-1">
                {completedTasks.length} of {allTasks.length} done
                {snoozedCount > 0 && ` · ${snoozedCount} snoozed`}
              </p>
            )}
            {(streak?.currentStreak ?? 0) > 0 && (
              <p className="text-white/60 text-xs mt-0.5">🔥 {streak!.currentStreak} day streak</p>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable task area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Loading state */}
        {generating && !checklistData && (
          <div className="text-center py-14 text-gray-400 text-sm">
            <p className="text-4xl mb-3">📋</p>
            <p>Building your task list…</p>
          </div>
        )}

        {/* Empty state */}
        {!generating && allTasks.length === 0 && (
          <div className="text-center py-14 text-gray-400 text-sm">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-gray-700">No tasks today</p>
            <p className="text-xs mt-1">Your manager hasn't assigned any tasks yet</p>
          </div>
        )}

        {/* All done state */}
        {allDone && (
          <div className="text-center py-10">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-xl font-bold text-emerald-700">All done for today!</p>
            {(streak?.currentStreak ?? 0) > 1 && (
              <p className="text-sm text-gray-500 mt-2">🔥 {streak!.currentStreak}-day streak — keep it up!</p>
            )}
            {streak?.currentStreak === 7  && <p className="text-xs text-emerald-600 mt-1">One full week! Excellent! 🌟</p>}
            {streak?.currentStreak === 30 && <p className="text-xs text-emerald-600 mt-1">One month straight! 💪</p>}
          </div>
        )}

        {/* All snoozed (no current task, some pending) */}
        {!allDone && allTasks.length > 0 && pendingTasks.length === 0 && snoozedCount > 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">⏰</p>
            <p className="text-base font-semibold text-orange-700">All caught up for now</p>
            <p className="text-sm text-gray-500 mt-1">
              {snoozedCount} task{snoozedCount > 1 ? 's' : ''} will remind you in 15 min
            </p>
          </div>
        )}

        {/* Current task card */}
        {currentTask && (
          <>
            <p className="text-xs text-gray-400 font-medium text-center">
              {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} remaining
            </p>

            <FocusCard
              task={currentTask}
              isCompleting={completing === currentTask.id}
              onYes={() => void handleYes(currentTask)}
              onNo={() => handleNo(currentTask)}
            />

            {/* Next up preview */}
            {nextTask && (
              <div className="bg-white/70 rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <span className="text-lg">{WINDOW_ICON[nextTask.timeWindow]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Next up</p>
                  <p className="text-sm font-semibold text-gray-600 truncate">{nextTask.title}</p>
                </div>
                <span className="text-gray-300 text-sm">→</span>
              </div>
            )}
          </>
        )}

        {/* Completed tasks (collapsible) */}
        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(v => !v)}
              className="flex items-center gap-2 text-sm text-gray-500 font-medium w-full py-2"
            >
              <span>Completed ({completedTasks.length})</span>
              {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showCompleted && (
              <div className="space-y-2 mt-1">
                {completedTasks.map(t => (
                  <div
                    key={t.id}
                    className={`rounded-xl px-3 py-2.5 flex items-center gap-3 border ${
                      t.status === 'skipped'
                        ? 'bg-gray-50 border-gray-100'
                        : 'bg-emerald-50 border-emerald-100'
                    }`}
                  >
                    <span className="text-base">{t.status === 'skipped' ? '⏭' : '✅'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        t.status === 'skipped' ? 'text-gray-500' : 'text-emerald-700'
                      }`}>{t.title}</p>
                      {t.completedAt && (
                        <p className="text-xs text-gray-400">
                          {t.status === 'skipped' ? 'Skipped' : 'Done'} at {format(new Date(t.completedAt), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  )
}

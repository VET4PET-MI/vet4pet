import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Clock, Trash2, Settings, Lock, LockOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const mins = 8 * 60 + i * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})

const APPT_TYPE_DEFS = [
  { value: 'CHECKUP',      key: 'checkup',      color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  { value: 'VACCINATION',  key: 'vaccination',  color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  { value: 'FOLLOW_UP',    key: 'followUp',     color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500' },
  { value: 'EMERGENCY',    key: 'emergency',    color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500' },
  { value: 'CONSULTATION', key: 'consultation', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { value: 'OTHER',        key: 'other',        color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
]

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function toDateStr(d) { return d.toISOString().slice(0, 10) }
function isToday(d) { return toDateStr(d) === toDateStr(new Date()) }
function isSameDay(a, b) { return toDateStr(a) === toDateStr(b) }

function getOccupiedSlots(appointments) {
  const occupied = new Set()
  appointments.forEach(appt => {
    const startIdx = TIME_SLOTS.indexOf(appt.time)
    const slotsNeeded = Math.ceil(appt.duration / 30)
    for (let i = 1; i < slotsNeeded; i++) {
      const idx = startIdx + i
      if (idx < TIME_SLOTS.length) occupied.add(TIME_SLOTS[idx])
    }
  })
  return occupied
}

function ApptCard({ appt, onClick, apptTypes, t }) {
  const meta = apptTypes.find(x => x.value === appt.type) ?? apptTypes[5]
  return (
    <div
      onClick={onClick}
      className={`flex-1 flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer hover:shadow-md transition-shadow ${meta.color}`}
    >
      <div className={`w-1.5 h-full min-h-[1.5rem] rounded-full shrink-0 ${meta.dot}`} />
      <div className="min-w-0">
        <p className="text-xs font-semibold truncate">{appt.petName || t('schedule.fallbackPet')}</p>
        <p className="text-xs opacity-70 truncate">{appt.ownerName || appt.ownerId || '—'}</p>
        {appt.duration > 30 && (
          <p className="text-xs opacity-60 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />{t('schedule.minutes', { n: appt.duration })}
          </p>
        )}
      </div>
    </div>
  )
}

const DURATIONS = [15, 30, 45, 60]

function ApptModal({ initial, selectedDay, presetTime, onClose, onSaved, onCancelled }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isEdit   = !!initial

  const apptTypes = APPT_TYPE_DEFS.map(x => ({ ...x, label: t(`schedule.types.${x.key}`) }))

  const [form, setForm] = useState({
    petName:   initial?.petName   ?? '',
    ownerName: initial?.ownerName ?? '',
    ownerId:   initial?.ownerId   ?? '',
    date:      initial ? toDateStr(new Date(initial.date)) : toDateStr(selectedDay),
    time:      initial?.time      ?? presetTime ?? '09:00',
    duration:  initial?.duration  ?? 30,
    type:      initial?.type      ?? 'CHECKUP',
    notes:     initial?.notes     ?? '',
    status:    initial?.status    ?? 'booked',
  })
  const [submitting, setSub] = useState(false)
  const [error, setError]    = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSub(true); setError(null)
    try {
      const payload = { ...form, vetName: user?.name }
      if (isEdit) {
        await api.put(`/api/appointments/${initial._id}`, payload)
      } else {
        await api.post('/api/appointments', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message ?? t('schedule.saveFail'))
    } finally { setSub(false) }
  }

  async function handleCancel() {
    if (!window.confirm(t('schedule.cancelConfirm'))) return
    try {
      await api.patch(`/api/appointments/${initial._id}/cancel`)
      onCancelled()
    } catch { setError(t('schedule.cancelFail')) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? t('schedule.editTitle') : t('schedule.bookTitle')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('schedule.petName')}</label>
                <input value={form.petName} onChange={e => set('petName', e.target.value)}
                  placeholder={t('schedule.petNamePh')} required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('schedule.ownerName')}</label>
                <input value={form.ownerName} onChange={e => set('ownerName', e.target.value)}
                  placeholder={t('schedule.ownerNamePh')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('schedule.date')}</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('schedule.time')}</label>
                <input type="time" value={form.time} onChange={e => set('time', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">{t('schedule.duration')}</label>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => set('duration', d)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${form.duration === d ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >{t('schedule.minutes', { n: d })}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">{t('schedule.type')}</label>
              <div className="grid grid-cols-2 gap-2">
                {apptTypes.map(typ => (
                  <button key={typ.value} type="button" onClick={() => set('type', typ.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition ${
                      form.type === typ.value ? `${typ.color} ring-2 ring-offset-1 ring-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${typ.dot}`} />{typ.label}
                  </button>
                ))}
              </div>
            </div>

            {isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">{t('schedule.status')}</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {['booked','confirmed','completed','cancelled'].map(s => <option key={s} value={s}>{t(`schedule.statuses.${s}`)}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('schedule.notes')}</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder={t('schedule.notesPh')} rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            {isEdit && (
              <button type="button" onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5 rtl:flex-row-reverse">
                <Trash2 className="w-4 h-4" /> {t('schedule.cancelAppt')}
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              {t('schedule.close')}
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('schedule.saving')}</> : (isEdit ? t('schedule.update') : t('schedule.book'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Schedule() {
  const { t, i18n } = useTranslation()
  const navigate                      = useNavigate()
  const [weekStart, setWeekStart]     = useState(() => getWeekStart(new Date()))
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [appointments, setAppts]      = useState([])
  const [loading, setLoading]         = useState(false)
  const [showModal, setModal]         = useState(false)
  const [presetTime, setPresetTime]   = useState(null)
  const [editAppt, setEditAppt]       = useState(null)
  const [timeBlocks, setTimeBlocks]   = useState([])
  const [blockingSlot, setBlockSlot]  = useState(null)
  const [blockReason, setBlockReason] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [blockError, setBlockError]   = useState(null)

  const locale   = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'
  const weekDays = getWeekDays(weekStart)
  const apptTypes = APPT_TYPE_DEFS.map(x => ({ ...x, label: t(`schedule.types.${x.key}`) }))

  useEffect(() => {
    fetchAppts()
    fetchBlocks()
    setBlockSlot(null)
    setBlockReason('')
    setBlockError(null)
  }, [selectedDay])

  async function fetchAppts() {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/appointments?date=${toDateStr(selectedDay)}`)
      setAppts(data)
    } catch { setAppts([]) } finally { setLoading(false) }
  }

  async function fetchBlocks() {
    try {
      const { data } = await api.get(`/api/time-blocks?date=${toDateStr(selectedDay)}`)
      setTimeBlocks(data)
    } catch { setTimeBlocks([]) }
  }

  async function handleBlock(slot) {
    setBlockSaving(true)
    setBlockError(null)
    try {
      const [h, m] = slot.split(':').map(Number)
      const endMins = h * 60 + m + 30
      const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`
      const { data } = await api.post('/api/time-blocks', {
        date:      toDateStr(selectedDay),
        startTime: slot,
        endTime,
        reason:    blockReason.trim() || '',
      })
      setTimeBlocks(prev => [...prev, data].sort((a, b) => a.startTime.localeCompare(b.startTime)))
      setBlockSlot(null)
      setBlockReason('')
    } catch (err) {
      const msg = err.response
        ? (err.response.data?.message ?? t('schedule.serverError', { status: err.response.status }))
        : t('schedule.serverUnreachable')
      setBlockError(msg)
    } finally { setBlockSaving(false) }
  }

  async function handleUnblock(blockId) {
    try {
      await api.delete(`/api/time-blocks/${blockId}`)
      setTimeBlocks(prev => prev.filter(b => b._id !== blockId))
    } catch (err) {
      const msg = err.response
        ? (err.response.data?.message ?? t('schedule.serverError', { status: err.response.status }))
        : t('schedule.serverUnreachable')
      setBlockError(msg)
    }
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }
  function goToday()  { const now = new Date(); setWeekStart(getWeekStart(now)); setSelectedDay(now) }

  function openBook(time) { setPresetTime(time); setEditAppt(null); setModal(true) }
  function openEdit(appt) { setEditAppt(appt); setPresetTime(null); setModal(true) }

  function handleSaved() { setModal(false); fetchAppts() }
  function handleCancelled() { setModal(false); fetchAppts() }

  const occupied = getOccupiedSlots(appointments)
  const activeAppts = appointments.filter(a => a.status !== 'cancelled')
  const dateLabel = selectedDay.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
  const weekLabel = `${weekDays[0].toLocaleDateString(locale, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <AppLayout
      title={t('schedule.title')}
      subtitle={weekLabel}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/vet-schedule-settings')}
            className="flex items-center gap-2 px-4 py-2 border border-violet-300 text-violet-600 bg-violet-50 hover:bg-violet-100 text-sm font-medium rounded-lg transition-colors rtl:flex-row-reverse">
            <Settings className="w-4 h-4" /> {t('schedule.availability')}
          </button>
          <button onClick={() => openBook(null)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm rtl:flex-row-reverse">
            <Plus className="w-4 h-4" /> {t('schedule.bookAppointment')}
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        {/* Week nav */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
          <button onClick={prevWeek} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"><ChevronLeft className="w-4 h-4 rtl:rotate-180" /></button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition">{t('schedule.today')}</button>
          <button onClick={nextWeek} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition"><ChevronRight className="w-4 h-4 rtl:rotate-180" /></button>

          {/* Day tabs */}
          <div className="flex flex-1 overflow-x-auto gap-1 ms-2">
            {weekDays.map(day => (
              <button
                key={toDateStr(day)}
                onClick={() => setSelectedDay(day)}
                className={[
                  'shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors min-w-[3.5rem]',
                  isSameDay(day, selectedDay)
                    ? 'bg-violet-600 text-white'
                    : isToday(day)
                    ? 'text-violet-600 bg-violet-50 hover:bg-violet-100'
                    : 'text-slate-500 hover:bg-slate-100',
                ].join(' ')}
              >
                <span className="text-xs opacity-75">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
                <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">{dateLabel}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{t('schedule.appointments', { count: activeAppts.length })}</span>
                {timeBlocks.length > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <Lock className="w-3 h-3" /> {t('schedule.blockedCount', { count: timeBlocks.length })}
                  </span>
                )}
              </div>
            </div>

            {blockError && (
              <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <span className="flex-1">{blockError}</span>
                <button onClick={() => setBlockError(null)} className="shrink-0 text-red-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>
            ) : (
              <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Legend */}
                <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {t('schedule.legendBlocked')}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> {t('schedule.legendAppt')}
                  </span>
                  <span className="text-xs text-slate-400 ms-auto italic">{t('schedule.legendHint')}</span>
                </div>

                {TIME_SLOTS.map(slot => {
                  const appt         = appointments.find(a => a.time === slot && a.status !== 'cancelled')
                  const block        = timeBlocks.find(b => b.startTime === slot)
                  const isBlocking   = blockingSlot === slot
                  if (occupied.has(slot)) return null

                  return (
                    <div
                      key={slot}
                      className={[
                        'flex items-center gap-3 px-4 py-2 min-h-[3rem] transition-colors',
                        block      ? 'bg-red-50 border-s-4 border-red-300'    :
                        isBlocking ? 'bg-amber-50 border-s-4 border-amber-300' :
                                     'hover:bg-slate-50/50 border-s-4 border-transparent',
                      ].join(' ')}
                    >
                      {/* Time label */}
                      <span className={`w-12 text-xs shrink-0 font-mono ${block ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                        {slot}
                      </span>

                      {/* Slot content */}
                      {appt ? (
                        <ApptCard appt={appt} onClick={() => openEdit(appt)} apptTypes={apptTypes} t={t} />

                      ) : block ? (
                        <div className="flex-1 flex items-center gap-3">
                          <Lock className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="flex-1 text-sm text-red-600 font-medium truncate">
                            {block.reason || t('schedule.fallbackBlocked')}
                          </span>
                          <button
                            onClick={() => handleUnblock(block._id)}
                            title={t('schedule.unlockTitle')}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-colors"
                          >
                            <LockOpen className="w-3.5 h-3.5" /> {t('schedule.unlock')}
                          </button>
                        </div>

                      ) : isBlocking ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            autoFocus
                            value={blockReason}
                            onChange={e => setBlockReason(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleBlock(slot)
                              if (e.key === 'Escape') { setBlockSlot(null); setBlockReason('') }
                            }}
                            placeholder={t('schedule.blockReasonPh')}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                          />
                          <button
                            onClick={() => handleBlock(slot)}
                            disabled={blockSaving}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            {blockSaving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Lock className="w-3.5 h-3.5" />
                            }
                            {t('schedule.block')}
                          </button>
                          <button
                            onClick={() => { setBlockSlot(null); setBlockReason('') }}
                            className="shrink-0 px-3 py-1.5 text-slate-500 hover:bg-slate-200 text-xs font-medium rounded-lg transition-colors"
                          >
                            {t('schedule.cancel')}
                          </button>
                        </div>

                      ) : (
                        <button
                          onClick={() => { setBlockSlot(slot); setBlockReason('') }}
                          className="flex-1 flex items-center gap-2 text-start text-xs text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl px-3 py-2 transition-colors group"
                          title={t('schedule.unlockTitle')}
                        >
                          <Lock className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                          <span className="group-hover:text-red-400 transition-colors">{t('schedule.available')}</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <ApptModal
          initial={editAppt}
          selectedDay={selectedDay}
          presetTime={presetTime}
          onClose={() => setModal(false)}
          onSaved={handleSaved}
          onCancelled={handleCancelled}
        />
      )}
    </AppLayout>
  )
}

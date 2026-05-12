import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, Calendar, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import AppLayout from '../components/AppLayout'

const TYPE_COLORS = {
  CHECKUP:      'bg-blue-50 text-blue-700 border-blue-200',
  VACCINATION:  'bg-green-50 text-green-700 border-green-200',
  FOLLOW_UP:    'bg-amber-50 text-amber-700 border-amber-200',
  EMERGENCY:    'bg-red-50 text-red-700 border-red-200',
  CONSULTATION: 'bg-purple-50 text-purple-700 border-purple-200',
  OTHER:        'bg-slate-100 text-slate-700 border-slate-200',
}

const TYPE_KEYS = {
  CHECKUP: 'checkup', VACCINATION: 'vaccination', FOLLOW_UP: 'followUp',
  EMERGENCY: 'emergency', CONSULTATION: 'consultation', OTHER: 'other',
}

const STATUS_COLORS = {
  booked:    { icon: Clock,         color: 'text-amber-700 bg-amber-50 border-amber-200' },
  confirmed: { icon: CheckCircle2,  color: 'text-green-700 bg-green-50 border-green-200' },
  completed: { icon: CheckCircle2,  color: 'text-slate-600 bg-slate-100 border-slate-200' },
  cancelled: { icon: XCircle,       color: 'text-red-600 bg-red-50 border-red-200' },
}

export default function OwnerAppointments() {
  const { t, i18n }           = useTranslation()
  const navigate              = useNavigate()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancel] = useState(null)

  const locale = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'

  function formatDate(ds) {
    return new Date(ds).toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }

  useEffect(() => { fetchAppts() }, [])

  async function fetchAppts() {
    setLoading(true)
    try { const { data } = await api.get('/api/appointments'); setAppts(data) }
    catch {} finally { setLoading(false) }
  }

  async function handleCancel(id) {
    if (!window.confirm(t('ownerAppointments.confirmCancel'))) return
    setCancel(id)
    try { await api.patch(`/api/appointments/${id}/cancel`); fetchAppts() }
    catch {} finally { setCancel(null) }
  }

  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming  = appts.filter(a => new Date(a.date) >= today && a.status !== 'cancelled')
  const past      = appts.filter(a => new Date(a.date) < today || a.status === 'cancelled')

  function ApptCard({ appt }) {
    const sm   = STATUS_COLORS[appt.status] ?? STATUS_COLORS.booked
    const Icon = sm.icon
    const canCancel = appt.status === 'booked' || appt.status === 'confirmed'
    const typeLabel   = t(`ownerAppointments.types.${TYPE_KEYS[appt.type] ?? 'other'}`)
    const statusLabel = t(`ownerAppointments.status.${appt.status ?? 'booked'}`)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4 hover:shadow-md transition-shadow rtl:flex-row-reverse rtl:text-right">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${sm.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{appt.petName || t('ownerAppointments.fallbackPet')}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_COLORS[appt.type] ?? TYPE_COLORS.OTHER}`}>
              {typeLabel}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sm.color}`}>{statusLabel}</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(appt.date)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time} · {t('ownerAppointments.minShort', { n: appt.duration })}</span>
            {appt.vetName && <span>· {t('ownerAppointments.doctorPrefix', { name: appt.vetName })}</span>}
          </div>
          {appt.notes && <p className="text-xs text-slate-400 mt-1 truncate">· {appt.notes}</p>}
        </div>
        {canCancel && (
          <button
            onClick={() => handleCancel(appt._id)}
            disabled={cancelling === appt._id}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-colors disabled:opacity-50"
          >
            {cancelling === appt._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            {t('ownerAppointments.cancel')}
          </button>
        )}
      </div>
    )
  }

  return (
    <AppLayout
      title={t('ownerAppointments.title')}
      subtitle={t('ownerAppointments.subtitle')}
      actions={
        <button onClick={() => navigate('/book-appointment')}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm rtl:flex-row-reverse">
          <Plus className="w-4 h-4" /> {t('ownerAppointments.bookAppointment')}
        </button>
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : appts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-600">{t('ownerAppointments.noTitle')}</p>
            <p className="text-sm text-slate-400 mt-1 mb-6">{t('ownerAppointments.noHint')}</p>
            <button onClick={() => navigate('/book-appointment')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors">
              {t('ownerAppointments.bookNow')}
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-violet-500" /> {t('ownerAppointments.upcoming', { count: upcoming.length })}
                </h2>
                {upcoming.map(a => <ApptCard key={a._id} appt={a} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-base font-semibold text-slate-500">{t('ownerAppointments.pastAndCancelled')}</h2>
                {past.map(a => <ApptCard key={a._id} appt={a} />)}
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

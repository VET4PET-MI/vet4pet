import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Calendar, Clock, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import AppLayout from '../components/AppLayout'
import { localizeSpecies, localizeBreed } from '../utils/petLocale'

const APPT_TYPE_DEFS = [
  { value: 'CHECKUP',      key: 'checkup',      icon: '🩺' },
  { value: 'VACCINATION',  key: 'vaccination',  icon: '💉' },
  { value: 'FOLLOW_UP',    key: 'followUp',     icon: '🔄' },
  { value: 'CONSULTATION', key: 'consultation', icon: '💬' },
  { value: 'EMERGENCY',    key: 'emergency',    icon: '🚨' },
  { value: 'OTHER',        key: 'other',        icon: '📋' },
]

const DURATIONS = [15, 30, 45, 60]

const SPECIES_META = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function Steps({ current }) {
  const { t } = useTranslation()
  const steps = [t('bookAppointment.step1'), t('bookAppointment.step2'), t('bookAppointment.step3')]
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const done    = i + 1 < current
        const active  = i + 1 === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                done   ? 'bg-indigo-600 text-white' :
                active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                         'bg-slate-200 text-slate-500',
              ].join(' ')}>
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-16 h-0.5 mb-4 mx-1 ${done ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BookAppointment() {
  const { t, i18n } = useTranslation()
  const navigate   = useNavigate()

  const locale = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'

  const APPT_TYPES = APPT_TYPE_DEFS.map(x => ({ ...x, label: t(`bookAppointment.types.${x.key}`) }))

  const [step, setStep]         = useState(1)
  const [pets, setPets]         = useState([])
  const [selectedPet, setPet]   = useState(null)
  const [date, setDate]         = useState(todayStr())
  const [duration, setDuration] = useState(30)
  const [slots, setSlots]       = useState(null)
  const [selectedSlot, setSlot] = useState(null)
  const [apptType, setType]     = useState('CHECKUP')
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [slotsLoading, setSL]   = useState(false)
  const [error, setError]       = useState(null)
  const [booked, setBooked]     = useState(false)

  useEffect(() => {
    api.get('/api/pets').then(r => setPets(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (step !== 2 || !date) return
    setSL(true); setSlots(null); setSlot(null)
    api.get(`/api/appointments/available-slots?date=${date}&duration=${duration}`)
      .then(r => setSlots(r.data.slots))
      .catch(() => setSlots([]))
      .finally(() => setSL(false))
  }, [step, date, duration])

  async function handleBook() {
    setLoading(true); setError(null)
    try {
      await api.post('/api/appointments', {
        petId:     selectedPet._id,
        petName:   selectedPet.name,
        date,
        time:      selectedSlot,
        duration,
        type:      apptType,
        notes:     notes.trim(),
      })
      setBooked(true)
      setTimeout(() => navigate('/my-appointments'), 2000)
    } catch (err) {
      setError(err.response?.data?.message ?? t('bookAppointment.bookFail'))
    } finally { setLoading(false) }
  }

  if (booked) {
    return (
      <AppLayout title={t('bookAppointment.bookedHeader')}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{t('bookAppointment.successTitle')}</h2>
          <p className="text-slate-400 text-sm">{t('bookAppointment.successHint')}</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={t('bookAppointment.title')} subtitle={t('bookAppointment.subtitle')}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Steps current={step} />

        {/* Step 1: Select Pet */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">{t('bookAppointment.whichPet')}</h2>
            {pets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-4xl mb-3">🐾</div>
                <p className="font-medium text-slate-600">{t('bookAppointment.noPetsTitle')}</p>
                <button onClick={() => navigate('/my-pets')}
                  className="mt-4 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
                  {t('bookAppointment.addPetFirst')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pets.map(pet => {
                  const emoji = SPECIES_META[pet.species?.toLowerCase()] ?? '🐾'
                  const isSelected = selectedPet?._id === pet._id
                  return (
                    <button
                      key={pet._id}
                      onClick={() => setPet(pet)}
                      className={[
                        'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border text-start transition-all rtl:flex-row-reverse',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 bg-white hover:border-indigo-300',
                      ].join(' ')}
                    >
                      <span className="text-3xl shrink-0">{emoji}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{pet.name}</p>
                        <p className="text-sm text-slate-400">{localizeSpecies(pet.species, t)}{pet.breed ? ` · ${localizeBreed(pet.breed, t)}` : ''}{pet.age ? ` · ${pet.age} ${t('bookAppointment.yearShort')}` : ''}</p>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-indigo-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => setStep(2)}
              disabled={!selectedPet}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {t('bookAppointment.next')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* Step 2: Date + Time */}
        {step === 2 && (
          <div className="space-y-6">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('bookAppointment.back')}
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-800">{t('bookAppointment.selectDate')}</h2>
              <input
                type="date"
                value={date}
                min={todayStr()}
                onChange={e => { setDate(e.target.value); setSlot(null) }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-800">{t('bookAppointment.duration')}</h2>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} type="button" onClick={() => { setDuration(d); setSlot(null) }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${duration === d ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {t('bookAppointment.minShort', { n: d })}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> {t('bookAppointment.availableSlots')}
              </h2>
              {slotsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
              ) : slots === null ? null
              : slots.length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">{t('bookAppointment.noSlots')}</p>
                  <p className="text-xs mt-1">{t('bookAppointment.tryDifferent')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSlot(slot)}
                      className={[
                        'py-2.5 rounded-xl text-sm font-medium border transition-all',
                        selectedSlot === slot
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50',
                      ].join(' ')}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!selectedSlot}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {t('bookAppointment.next')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t('bookAppointment.back')}
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-800">{t('bookAppointment.bookingSummary')}</h2>
              <div className="space-y-2 text-sm">
                {[
                  [t('bookAppointment.summaryPet'),      selectedPet?.name],
                  [t('bookAppointment.summaryDate'),     new Date(date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })],
                  [t('bookAppointment.summaryTime'),     selectedSlot],
                  [t('bookAppointment.summaryDuration'), t('bookAppointment.minutes', { n: duration })],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-800">{t('bookAppointment.apptType')}</h2>
              <div className="grid grid-cols-2 gap-2">
                {APPT_TYPES.map(typ => (
                  <button key={typ.value} type="button" onClick={() => setType(typ.value)}
                    className={[
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-start rtl:flex-row-reverse',
                      apptType === typ.value ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    ].join(' ')}>
                    <span>{typ.icon}</span> {typ.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('bookAppointment.notesLabel')}</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder={t('bookAppointment.notesPh')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

            <button
              onClick={handleBook}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('bookAppointment.booking')}</>
                : <><Check className="w-4 h-4" /> {t('bookAppointment.confirm')}</>}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

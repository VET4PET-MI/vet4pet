import { useState, useEffect } from 'react'
import { Loader2, Save, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import AppLayout from '../components/AppLayout'

export default function VetScheduleSettings() {
  const { t } = useTranslation()
  const [form, setForm]       = useState({ workingDays: [1, 2, 3, 4, 5], workStart: '08:00', workEnd: '18:00' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)

  const DAYS = [0, 1, 2, 3, 4, 5, 6].map(v => ({
    value: v,
    label: t(`vetScheduleSettings.days.${v}`),
  }))

  useEffect(() => {
    api.get('/api/vet-schedule')
      .then(r => setForm({ workingDays: r.data.workingDays, workStart: r.data.workStart, workEnd: r.data.workEnd }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(day) {
    setForm(f => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter(d => d !== day)
        : [...f.workingDays, day].sort((a, b) => a - b),
    }))
    setSaved(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      await api.put('/api/vet-schedule', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError(t('vetScheduleSettings.saveFail'))
    } finally { setSaving(false) }
  }

  return (
    <AppLayout title={t('vetScheduleSettings.title')} subtitle={t('vetScheduleSettings.subtitle')}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">

            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{t('vetScheduleSettings.workingDays')}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{t('vetScheduleSettings.workingDaysDesc')}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(({ value, label }) => {
                  const active = form.workingDays.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={[
                        'w-14 py-3 rounded-xl text-sm font-semibold border transition-all',
                        active
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {form.workingDays.length === 0 && (
                <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  {t('vetScheduleSettings.mustSelectDay')}
                </p>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800">{t('vetScheduleSettings.clinicHours')}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{t('vetScheduleSettings.clinicHoursDesc')}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('vetScheduleSettings.startTime')}</label>
                  <input
                    type="time"
                    value={form.workStart}
                    onChange={e => { setForm(f => ({ ...f, workStart: e.target.value })); setSaved(false) }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('vetScheduleSettings.endTime')}</label>
                  <input
                    type="time"
                    value={form.workEnd}
                    onChange={e => { setForm(f => ({ ...f, workEnd: e.target.value })); setSaved(false) }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving || form.workingDays.length === 0}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {saving  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('vetScheduleSettings.saving')}</>
               : saved ? <><Check className="w-4 h-4" /> {t('vetScheduleSettings.saved')}</>
               : <><Save className="w-4 h-4" /> {t('vetScheduleSettings.save')}</>}
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  )
}

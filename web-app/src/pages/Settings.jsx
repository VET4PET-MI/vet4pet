import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, Calendar, ChevronRight, LogOut, Languages, MapPin, Loader2, Save, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import AppLayout from '../components/AppLayout'

function VetClinicSection() {
  const { t } = useTranslation()
  const [form, setForm]     = useState({ clinicName: '', address: '', phone: '', lat: '', lng: '', isOnCall: false })
  const [loading, setLoad]  = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState(null)
  const [locating, setLoc]  = useState(false)

  useEffect(() => {
    api.get('/api/users/me')
      .then(r => setForm({
        clinicName: r.data.clinicName ?? '',
        address:    r.data.address    ?? '',
        phone:      r.data.phone      ?? '',
        lat:        r.data.lat ?? '',
        lng:        r.data.lng ?? '',
        isOnCall:   r.data.isOnCall ?? false,
      }))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setSaved(false) }

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLoc(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude.toFixed(6))
        set('lng', pos.coords.longitude.toFixed(6))
        setLoc(false)
      },
      () => setLoc(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setError(null); setSaved(false)
    try {
      const payload = {
        clinicName: form.clinicName.trim(),
        address:    form.address.trim(),
        phone:      form.phone.trim(),
        isOnCall:   !!form.isOnCall,
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
      }
      await api.patch('/api/users/me', payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message ?? t('emergency.vetSettings.saveFail'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {t('emergency.vetSettings.title')}
        </p>
        <p className="text-xs text-slate-400 mt-1">{t('emergency.vetSettings.subtitle')}</p>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('emergency.vetSettings.clinicName')}</label>
          <input value={form.clinicName} onChange={e => set('clinicName', e.target.value)}
            placeholder={t('emergency.vetSettings.clinicNamePh')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('emergency.vetSettings.address')}</label>
          <input value={form.address} onChange={e => set('address', e.target.value)}
            placeholder={t('emergency.vetSettings.addressPh')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">{t('emergency.vetSettings.phone')}</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder={t('emergency.vetSettings.phonePh')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-600">{t('emergency.vetSettings.location')}</label>
            <button type="button" onClick={useCurrentLocation} disabled={locating}
              className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50">
              {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
              {t('emergency.vetSettings.useCurrentLocation')}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.lat} onChange={e => set('lat', e.target.value)} placeholder={t('emergency.vetSettings.lat')} type="number" step="any"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            <input value={form.lng} onChange={e => set('lng', e.target.value)} placeholder={t('emergency.vetSettings.lng')} type="number" step="any"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none rtl:flex-row-reverse">
          <input type="checkbox" checked={form.isOnCall} onChange={e => set('isOnCall', e.target.checked)}
            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500" />
          <span className="text-sm text-slate-700">{t('emergency.vetSettings.onCallToggle')}</span>
        </label>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

        <button type="submit" disabled={saving}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
          {saving  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('emergency.vetSettings.saving')}</>
           : saved ? <><Check className="w-4 h-4" /> {t('emergency.vetSettings.saved')}</>
           : <><Save className="w-4 h-4" /> {t('emergency.vetSettings.save')}</>}
        </button>
      </div>
    </form>
  )
}

export default function Settings() {
  const { t, i18n }      = useTranslation()
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const isHe = i18n.language?.startsWith('he')
  const roleLabel = user?.role === 'vet' ? t('auth.vetTab') : t('auth.ownerTab')
  const roleColor = user?.role === 'vet'
    ? 'bg-violet-50 text-violet-700 border-violet-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <AppLayout title={t('settings.title')}>
      <div className="max-w-xl mx-auto px-6 py-8 space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 rtl:flex-row-reverse rtl:text-right">
            <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'ME'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{user?.name ?? t('nav.fallbackUser')}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColor}`}>
                <Shield className="w-3 h-3" /> {roleLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl rtl:flex-row-reverse rtl:text-right">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1 rtl:text-right">
                <p className="text-xs text-slate-400 font-medium">{t('settings.fullName')}</p>
                <p className="text-sm text-slate-800 font-semibold truncate">{user?.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl rtl:flex-row-reverse rtl:text-right">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1 rtl:text-right">
                <p className="text-xs text-slate-400 font-medium">{t('settings.email')}</p>
                <p className="text-sm text-slate-800 font-semibold truncate">{user?.email ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Language switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            {t('settings.language')}
          </p>
          <div className="px-5 py-4 flex items-center gap-3 rtl:flex-row-reverse rtl:text-right">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0 rtl:text-right">
              <p className="text-sm font-semibold text-slate-800">{t('settings.languageDesc')}</p>
            </div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => i18n.changeLanguage('he')}
                className={`px-3 py-1.5 transition-colors ${isHe ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                עברית
              </button>
              <button
                type="button"
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-1.5 transition-colors ${!isHe ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Vet-only: clinic info (for emergency vet search) */}
        {user?.role === 'vet' && <VetClinicSection />}

        {/* Vet-only: availability shortcut */}
        {user?.role === 'vet' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
              {t('settings.clinicSettings')}
            </p>
            <button
              onClick={() => navigate('/vet-schedule-settings')}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-start rtl:flex-row-reverse"
            >
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0 rtl:text-right">
                <p className="text-sm font-semibold text-slate-800">{t('settings.availability')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('settings.availabilityDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            {t('settings.account')}
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors text-start rtl:flex-row-reverse group"
          >
            <div className="w-9 h-9 bg-red-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center shrink-0 transition-colors">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">{t('settings.logoutButton')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t('settings.logoutDesc')}</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-300">{t('settings.footer')}</p>
      </div>
    </AppLayout>
  )
}

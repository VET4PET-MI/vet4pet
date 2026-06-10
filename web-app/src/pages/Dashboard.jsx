import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, X, Calendar, MessageSquare, Video, Users, Stethoscope } from 'lucide-react'
import { PawPrint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import { localizeSpecies, localizeBreed } from '../utils/petLocale'

const SPECIES_META = {
  dog:    { icon: '🐕', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  cat:    { icon: '🐈', badge: 'bg-orange-50 border-orange-200 text-orange-700' },
  bird:   { icon: '🦜', badge: 'bg-sky-50 border-sky-200 text-sky-700' },
  rabbit: { icon: '🐇', badge: 'bg-rose-50 border-rose-200 text-rose-700' },
}
function speciesMeta(s = '') {
  return SPECIES_META[s.toLowerCase()] ?? { icon: '🐾', badge: 'bg-slate-100 border-slate-200 text-slate-600' }
}

function PetCard({ pet }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { icon, badge } = speciesMeta(pet.species)
  return (
    <div
      onClick={() => navigate(`/pet/${pet._id ?? pet.id}`)}
      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-brand/40 transition-all duration-200 cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none">{icon}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{localizeSpecies(pet.species, t)}</span>
      </div>
      <div>
        <h3 className="text-ink font-semibold text-base group-hover:text-brand-dark transition-colors leading-tight">{pet.name}</h3>
        <p className="text-slate-400 text-sm mt-0.5">{localizeBreed(pet.breed, t) || '—'}</p>
      </div>
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />{t('dashboard.active')}
        </span>
        <span className="text-xs text-brand font-medium group-hover:text-brand-dark transition-colors">{t('dashboard.viewRecord')}</span>
      </div>
    </div>
  )
}

function VetDashboard() {
  const { t, i18n }           = useTranslation()
  const { user }              = useAuth()
  const navigate              = useNavigate()
  const [nationalId, setNationalId] = useState('')
  const [name, setName]       = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [stats, setStats]     = useState({ todayAppts: 0, pendingConsults: 0, unreadMsgs: 0, patientsToday: 0 })

  const locale = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'
  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const rawName  = user?.name?.replace(/^Dr\.?\s+/i, '') ?? ''
  const firstName = rawName.split(' ')[0] || t('nav.fallbackVetName')

  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    Promise.all([
      api.get(`/api/appointments?date=${todayIso}`).catch(() => ({ data: [] })),
      api.get('/api/consultations/pending').catch(() => ({ data: [] })),
      api.get('/api/messages/unread-count').catch(() => ({ data: { count: 0 } })),
    ]).then(([appts, consults, msgs]) => {
      const todayActive = (appts.data || []).filter(a => a.status !== 'cancelled')
      setStats({
        todayAppts:      todayActive.length,
        pendingConsults: (consults.data || []).length,
        unreadMsgs:      msgs.data?.count ?? 0,
        // Privacy: we can't count all clinic patients, so show how many distinct
        // pets the vet is seeing today (derived from their own appointments).
        patientsToday:   new Set(todayActive.map(a => a.petId).filter(Boolean)).size,
      })
    })
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!nationalId.trim()) return
    setLoading(true); setError(null)
    try {
      const params = {}
      if (nationalId.trim()) params.nationalId = nationalId.trim()
      if (name.trim())       params.name       = name.trim()
      const { data } = await api.get('/api/pets', { params })
      setResults(data)
    } catch {
      setError(t('dashboard.searchFail'))
    } finally { setLoading(false) }
  }

  function clearSearch() { setResults(null); setNationalId(''); setName('') }

  const statCards = [
    { label: t('dashboard.statTodayAppts'),      value: stats.todayAppts,      icon: Calendar,      bg: 'bg-sky-50',     text: 'text-sky-700' },
    { label: t('dashboard.statPendingConsults'), value: stats.pendingConsults, icon: Video,         bg: 'bg-amber-50',   text: 'text-amber-700' },
    { label: t('dashboard.statUnreadMsgs'),      value: stats.unreadMsgs,      icon: MessageSquare, bg: 'bg-slate-100',  text: 'text-slate-700' },
    { label: t('dashboard.statPatientsToday'),   value: stats.patientsToday,   icon: Users,         bg: 'bg-accent-soft', text: 'text-accent-dark', path: '/patients' },
  ]

  return (
    <AppLayout subtitle={today}>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Hero greeting */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 shadow-md">
          <div className="absolute -top-10 -end-10 w-48 h-48 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="rtl:text-right">
              <h1 className="text-white text-3xl font-bold tracking-tight">
                {t('nav.greetingVet', { name: firstName })}
              </h1>
              <p className="text-white/80 text-sm mt-2 font-medium">{t('dashboard.vetHeroSub')}</p>
            </div>
            <div className="hidden sm:flex w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl items-center justify-center shrink-0 ring-1 ring-white/20">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(({ label, value, icon: Icon, bg, text, path }) => {
            const clickable = Boolean(path)
            return (
              <div
                key={label}
                onClick={clickable ? () => navigate(path) : undefined}
                className={`${bg} rounded-2xl border border-white p-4 shadow-sm ${clickable ? 'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 rtl:flex-row-reverse">
                  <Icon className={`w-5 h-5 ${text}`} />
                  <span className={`text-2xl font-bold ${text}`}>{value}</span>
                </div>
                <p className="text-xs text-slate-600 font-medium rtl:text-right">{label}</p>
              </div>
            )
          })}
        </div>

        {/* Search card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
          <div className="flex items-center gap-3 mb-6 rtl:flex-row-reverse rtl:text-right">
            <div className="w-11 h-11 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink">{t('dashboard.findPatient')}</h2>
              <p className="text-sm text-slate-400">{t('dashboard.findPatientSub')}</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('dashboard.ownerId')} <span className="text-red-400">*</span></label>
                <input
                  type="text" value={nationalId} onChange={e => setNationalId(e.target.value)}
                  inputMode="numeric" maxLength={9}
                  placeholder={t('dashboard.ownerIdPlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('dashboard.petName')}</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('dashboard.petNamePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !nationalId.trim()}
              className="w-full bg-accent hover:bg-accent-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? t('dashboard.searching') : t('dashboard.searchButton')}
            </button>
          </form>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm">{error}</div>
        )}

        {results !== null && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-700">
                {results.length === 0
                  ? t('dashboard.noResults')
                  : t('dashboard.results', { count: results.length })}
              </h3>
              <button onClick={clearSearch} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" /> {t('dashboard.clear')}
              </button>
            </div>
            {results.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-4xl mb-3">🐾</div>
                <p className="font-medium text-slate-600">{t('dashboard.noResultsTitle')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('dashboard.noResultsHint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map(pet => <PetCard key={pet._id} pet={pet} />)}
              </div>
            )}
          </div>
        )}

        {/* Quick links */}
        {results === null && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t('nav.schedule'),      icon: Calendar,       path: '/schedule',      iconBg: 'bg-brand-soft',  iconColor: 'text-brand-dark' },
              { label: t('nav.messages'),      icon: MessageSquare,  path: '/messages',      iconBg: 'bg-slate-100',   iconColor: 'text-slate-600' },
              { label: t('nav.consultations'), icon: Video,          path: '/consultations', iconBg: 'bg-amber-50',    iconColor: 'text-amber-700' },
            ].map(({ label, icon: Icon, path, iconBg, iconColor }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-slate-200 font-medium text-sm text-slate-700 transition-all hover:shadow-md hover:border-brand/40 hover:-translate-y-0.5"
              >
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function OwnerHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pets, setPets]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/pets')
      .then(r => setPets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rawName  = user?.name?.replace(/^Dr\.?\s+/i, '') ?? ''
  const firstName = rawName.split(' ')[0]

  return (
    <AppLayout subtitle={t('dashboard.ownerSubGreeting')}>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Hero greeting card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 shadow-md">
          <div className="absolute -top-10 -end-10 w-48 h-48 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="rtl:text-right">
              <h1 className="text-white text-3xl font-bold tracking-tight">
                {t(user?.role === 'owner' ? 'nav.greetingOwner' : 'nav.greetingVet', { name: firstName })}
              </h1>
              <p className="text-white/80 text-sm mt-2 font-medium">{t('dashboard.ownerSubGreeting')}</p>
            </div>
            <div className="hidden sm:block text-6xl shrink-0">🐾</div>
          </div>
        </div>

        {/* Service buttons */}
        <div className="space-y-3">
          {[
            { icon: Calendar,      label: t('dashboard.ownerActions.bookTitle'),    sub: t('dashboard.ownerActions.bookSub'),    path: '/book-appointment',  primary: true },
            { icon: PawPrint,      label: t('dashboard.ownerActions.petsTitle'),    sub: t('dashboard.ownerActions.petsSub'),    path: '/my-pets',           primary: false },
            { icon: Video,         label: t('dashboard.ownerActions.consultTitle'), sub: t('dashboard.ownerActions.consultSub'), path: '/consultations',     primary: false },
            { icon: MessageSquare, label: t('dashboard.ownerActions.messageTitle'), sub: t('dashboard.ownerActions.messageSub'), path: '/messages',          primary: false },
          ].map(({ icon: Icon, label, sub, path, primary }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={[
                'w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all shadow-sm text-start rtl:flex-row-reverse',
                primary
                  ? 'bg-accent hover:bg-accent-dark text-white shadow-md hover:shadow-lg'
                  : 'bg-white hover:bg-brand-tint text-slate-800 border border-slate-200 hover:border-brand/40',
              ].join(' ')}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${primary ? 'bg-white/20' : 'bg-brand-soft'}`}>
                <Icon className={`w-5 h-5 ${primary ? 'text-white' : 'text-brand-dark'}`} />
              </div>
              <div className="flex-1 min-w-0 rtl:text-right">
                <p className="font-semibold text-sm">{label}</p>
                <p className={`text-xs mt-0.5 ${primary ? 'text-white/80' : 'text-slate-400'}`}>{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* My pets preview */}
        {!loading && pets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-ink">{t('dashboard.yourPets')}</h2>
              <button onClick={() => navigate('/my-pets')} className="text-sm text-brand hover:text-brand-dark font-medium">{t('dashboard.viewAllArrow')}</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pets.slice(0, 3).map(pet => <PetCard key={pet._id} pet={pet} />)}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'owner') return <OwnerHome />
  return <VetDashboard />
}

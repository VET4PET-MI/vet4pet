import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
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

export default function Patients() {
  const { t }                       = useTranslation()
  const navigate                    = useNavigate()
  const [nationalId, setNationalId] = useState('')
  const [name, setName]             = useState('')
  const [results, setResults]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    // National ID is mandatory — patients can only be found via the owner's ID.
    if (!nationalId.trim()) return
    setLoading(true); setError(null)
    try {
      const params = { nationalId: nationalId.trim() }
      if (name.trim()) params.name = name.trim()
      const { data } = await api.get('/api/pets', { params })
      setResults(data)
    } catch {
      setError(t('dashboard.searchFail'))
    } finally { setLoading(false) }
  }

  function clearSearch() { setResults(null); setNationalId(''); setName('') }

  return (
    <AppLayout title={t('patientsList.title')} subtitle={t('patientsList.subtitle')}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition rtl:text-right"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('dashboard.petName')}</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={t('dashboard.petNamePlaceholder')}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition rtl:text-right"
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 text-sm">{error}</div>
        )}

        {/* Results */}
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
                {results.map(pet => {
                  const { icon, badge } = speciesMeta(pet.species)
                  return (
                    <div
                      key={pet._id}
                      onClick={() => navigate(`/pet/${pet._id}`)}
                      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-brand/40 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-3xl leading-none shadow-sm">{icon}</div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{localizeSpecies(pet.species, t) || '—'}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink group-hover:text-brand-dark transition-colors">{pet.name}</h3>
                        <p className="text-slate-400 text-sm mt-0.5">{localizeBreed(pet.breed, t) || '—'}{pet.age ? ` · ${pet.age} ${t('ownerMyPets.yearShort')}` : ''}</p>
                      </div>
                      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-brand font-semibold group-hover:text-brand-dark transition-colors">{t('dashboard.viewRecord')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Idle hint before first search */}
        {results === null && !error && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-sm">{t('patientsList.privacyHint')}</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

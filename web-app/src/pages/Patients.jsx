import { useState, useEffect, useMemo } from 'react'
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
  const { t }              = useTranslation()
  const navigate           = useNavigate()
  const [pets, setPets]    = useState([])
  const [loading, setLoad] = useState(true)
  const [query, setQuery]  = useState('')

  useEffect(() => {
    api.get('/api/pets')
      .then(r => setPets(r.data))
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pets
    return pets.filter(p => (p.name ?? '').toLowerCase().includes(q))
  }, [pets, query])

  return (
    <AppLayout title={t('patientsList.title')} subtitle={t('patientsList.subtitle')}>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Quick search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('patientsList.searchPlaceholder')}
            className="w-full ps-11 pe-10 py-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition shadow-sm rtl:text-right"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand" /></div>
        ) : pets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-brand/25">
            <div className="w-20 h-20 mx-auto mb-4 bg-brand-soft rounded-3xl flex items-center justify-center text-5xl">🐾</div>
            <p className="font-semibold text-slate-700">{t('patientsList.empty')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-4xl mb-3">🐾</div>
            <p className="font-medium text-slate-600">{t('patientsList.noMatch')}</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-400 rtl:text-right">{t('patientsList.count', { count: filtered.length })}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(pet => {
                const { icon, badge } = speciesMeta(pet.species)
                return (
                  <div
                    key={pet._id}
                    onClick={() => navigate(`/pet/${pet._id}`)}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-brand/40 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 bg-brand-soft rounded-2xl flex items-center justify-center text-3xl leading-none shadow-sm">
                        {icon}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{localizeSpecies(pet.species, t) || '—'}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink group-hover:text-brand-dark transition-colors">{pet.name}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">{localizeBreed(pet.breed, t) || '—'}{pet.age ? ` · ${pet.age} ${t('ownerMyPets.yearShort')}` : ''}</p>
                    </div>
                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />{t('ownerMyPets.active')}
                      </span>
                      <span className="text-xs text-brand font-semibold group-hover:text-brand-dark transition-colors">{t('ownerMyPets.viewRecords')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

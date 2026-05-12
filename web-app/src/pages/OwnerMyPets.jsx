import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import AppLayout from '../components/AppLayout'
import { localizeSpecies, localizeBreed } from '../utils/petLocale'

const SPECIES_META = {
  dog:    { icon: '🐕', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  cat:    { icon: '🐈', badge: 'bg-purple-50 border-purple-200 text-purple-700' },
  bird:   { icon: '🦜', badge: 'bg-sky-50 border-sky-200 text-sky-700' },
  rabbit: { icon: '🐇', badge: 'bg-pink-50 border-pink-200 text-pink-700' },
}
function speciesMeta(s = '') {
  return SPECIES_META[s.toLowerCase()] ?? { icon: '🐾', badge: 'bg-slate-100 border-slate-200 text-slate-600' }
}

const BLANK_PET = { name: '', species: '', breed: '', age: '', gender: '' }

function AddPetModal({ onClose, onAdded }) {
  const { t } = useTranslation()
  const [form, setForm]   = useState(BLANK_PET)
  const [saving, setSave] = useState(false)
  const [error, setError] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSave(true); setError(null)
    try {
      const payload = { ...form }
      if (payload.age) payload.age = Number(payload.age)
      await api.post('/api/pets', payload)
      onAdded()
    } catch (err) {
      setError(err.response?.data?.message ?? t('ownerMyPets.saveFail'))
    } finally { setSave(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{t('ownerMyPets.addPetTitle')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('ownerMyPets.petName')} <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('ownerMyPets.petNamePh')} required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('ownerMyPets.species')}</label>
              <select value={form.species} onChange={e => set('species', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('ownerMyPets.selectPlaceholder')}</option>
                <option value="Dog">{t('ownerMyPets.speciesDog')}</option>
                <option value="Cat">{t('ownerMyPets.speciesCat')}</option>
                <option value="Bird">{t('ownerMyPets.speciesBird')}</option>
                <option value="Rabbit">{t('ownerMyPets.speciesRabbit')}</option>
                <option value="Other">{t('ownerMyPets.speciesOther')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('ownerMyPets.gender')}</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">{t('ownerMyPets.selectPlaceholder')}</option>
                <option value="Male">{t('ownerMyPets.male')}</option>
                <option value="Female">{t('ownerMyPets.female')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('ownerMyPets.breed')}</label>
              <input value={form.breed} onChange={e => set('breed', e.target.value)} placeholder={t('ownerMyPets.breedPh')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('ownerMyPets.age')}</label>
              <input type="number" min="0" max="30" value={form.age} onChange={e => set('age', e.target.value)} placeholder={t('ownerMyPets.agePh')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">{t('ownerMyPets.cancel')}</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t('ownerMyPets.savePet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OwnerMyPets() {
  const { t }               = useTranslation()
  const navigate            = useNavigate()
  const [pets, setPets]     = useState([])
  const [loading, setLoad]  = useState(true)
  const [showAdd, setAdd]   = useState(false)

  useEffect(() => { fetchPets() }, [])

  async function fetchPets() {
    setLoad(true)
    try { const { data } = await api.get('/api/pets'); setPets(data) }
    catch {} finally { setLoad(false) }
  }

  return (
    <AppLayout
      title={t('ownerMyPets.title')}
      subtitle={t('ownerMyPets.subtitle')}
      actions={
        <button onClick={() => setAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm rtl:flex-row-reverse">
          <Plus className="w-4 h-4" /> {t('ownerMyPets.addPet')}
        </button>
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : pets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-5xl mb-4">🐾</div>
            <p className="font-semibold text-slate-600">{t('ownerMyPets.noPetsTitle')}</p>
            <p className="text-sm text-slate-400 mt-1 mb-6">{t('ownerMyPets.noPetsHint')}</p>
            <button onClick={() => setAdd(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
              {t('ownerMyPets.addFirstBtn')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map(pet => {
              const { icon, badge } = speciesMeta(pet.species)
              return (
                <div
                  key={pet._id}
                  onClick={() => navigate(`/pet/${pet._id}`)}
                  className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl leading-none">{icon}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{localizeSpecies(pet.species, t) || '—'}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{pet.name}</h3>
                    <p className="text-slate-400 text-sm mt-0.5">{localizeBreed(pet.breed, t) || '—'}{pet.age ? ` · ${pet.age} ${t('ownerMyPets.yearShort')}` : ''}</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />{t('ownerMyPets.active')}
                    </span>
                    <span className="text-xs text-indigo-600 font-medium">{t('ownerMyPets.viewRecords')}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPetModal
          onClose={() => setAdd(false)}
          onAdded={() => { setAdd(false); fetchPets() }}
        />
      )}
    </AppLayout>
  )
}

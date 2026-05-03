import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, X, Calendar, MessageSquare, Video } from 'lucide-react'
import { PawPrint } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'

// ─── Shared: Pet Card ─────────────────────────────────────────────────────────

const SPECIES_META = {
  dog:    { icon: '🐕', badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  cat:    { icon: '🐈', badge: 'bg-purple-50 border-purple-200 text-purple-700' },
  bird:   { icon: '🦜', badge: 'bg-sky-50 border-sky-200 text-sky-700' },
  rabbit: { icon: '🐇', badge: 'bg-pink-50 border-pink-200 text-pink-700' },
}
function speciesMeta(s = '') {
  return SPECIES_META[s.toLowerCase()] ?? { icon: '🐾', badge: 'bg-slate-100 border-slate-200 text-slate-600' }
}

function PetCard({ pet }) {
  const navigate = useNavigate()
  const { icon, badge } = speciesMeta(pet.species)
  return (
    <div
      onClick={() => navigate(`/pet/${pet._id ?? pet.id}`)}
      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <span className="text-3xl leading-none">{icon}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge}`}>{pet.species}</span>
      </div>
      <div>
        <h3 className="text-slate-800 font-semibold text-base group-hover:text-indigo-600 transition-colors leading-tight">{pet.name}</h3>
        <p className="text-slate-400 text-sm mt-0.5">{pet.breed || '—'}</p>
      </div>
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Active
        </span>
        <span className="text-xs text-indigo-600 font-medium group-hover:text-indigo-800 transition-colors">View Record →</span>
      </div>
    </div>
  )
}

// ─── Vet: Search-First Dashboard ──────────────────────────────────────────────

function VetDashboard() {
  const navigate              = useNavigate()
  const [ownerId, setOwnerId] = useState('')
  const [name, setName]       = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  async function handleSearch(e) {
    e.preventDefault()
    if (!ownerId.trim() && !name.trim()) return
    setLoading(true); setError(null)
    try {
      const params = {}
      if (ownerId.trim()) params.ownerId = ownerId.trim()
      if (name.trim())    params.name    = name.trim()
      const { data } = await api.get('/api/pets', { params })
      setResults(data)
    } catch {
      setError('Search failed. Make sure the backend is running.')
    } finally { setLoading(false) }
  }

  function clearSearch() { setResults(null); setOwnerId(''); setName('') }

  return (
    <AppLayout subtitle={today}>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Hero search */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Find a Patient</h2>
              <p className="text-sm text-slate-400">Search by owner ID or pet name</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Owner ID</label>
                <input
                  type="text" value={ownerId} onChange={e => setOwnerId(e.target.value)}
                  placeholder="e.g. user_1"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pet Name</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Buddy"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || (!ownerId.trim() && !name.trim())}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Searching…' : 'Search Patients'}
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
                {results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </h3>
              <button onClick={clearSearch} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" /> Clear
              </button>
            </div>
            {results.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="text-4xl mb-3">🐾</div>
                <p className="font-medium text-slate-600">No patients found</p>
                <p className="text-sm text-slate-400 mt-1">Try a different owner ID or pet name.</p>
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
              { label: 'Schedule',      icon: Calendar,       path: '/schedule',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Messages',      icon: MessageSquare,  path: '/messages',      color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { label: 'Consultations', icon: Video,          path: '/consultations', color: 'bg-purple-50 text-purple-700 border-purple-200' },
            ].map(({ label, icon: Icon, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-2 p-5 rounded-2xl border font-medium text-sm transition-all hover:shadow-md ${color}`}
              >
                <Icon className="w-6 h-6" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// ─── Owner: Home Dashboard ────────────────────────────────────────────────────

function OwnerHome() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [pets, setPets]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/pets')
      .then(r => setPets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <AppLayout title={`Hello, ${firstName} 👋`} subtitle="What would you like to do today?">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Service buttons */}
        <div className="space-y-3">
          {[
            { icon: Calendar,      label: 'Book an Appointment', sub: 'Schedule a visit with your vet',          path: '/book-appointment',  primary: true },
            { icon: PawPrint,      label: 'My Pets',             sub: 'View and manage your pets',               path: '/my-pets',           primary: false },
            { icon: Video,         label: 'Start Consultation',  sub: 'Request a live video consultation',       path: '/consultations',     primary: false },
            { icon: MessageSquare, label: 'Message Your Vet',    sub: 'Send a message to your clinic',           path: '/messages',          primary: false },
          ].map(({ icon: Icon, label, sub, path, primary }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={[
                'w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all shadow-sm text-left',
                primary
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-indigo-200',
              ].join(' ')}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${primary ? 'bg-white/20' : 'bg-indigo-50'}`}>
                <Icon className={`w-5 h-5 ${primary ? 'text-white' : 'text-indigo-600'}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className={`text-xs mt-0.5 ${primary ? 'text-indigo-200' : 'text-slate-400'}`}>{sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* My pets preview */}
        {!loading && pets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800">My Pets</h2>
              <button onClick={() => navigate('/my-pets')} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View all →</button>
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

// ─── Dashboard export: branches on role ───────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'owner') return <OwnerHome />
  return <VetDashboard />
}

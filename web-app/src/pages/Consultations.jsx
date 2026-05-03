import { useState, useEffect } from 'react'
import { Video, PhoneOff, PhoneCall, Clock, CheckCircle2, Plus, X, Loader2, ExternalLink } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ds) {
  return new Date(ds).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function jitsiUrl(id) {
  return `https://meet.jit.si/Vet4Pet-${id}`
}

const STATUS_META = {
  pending: { label: 'Waiting',  icon: PhoneCall,    color: 'text-amber-700 bg-amber-50 border-amber-200',  dot: 'bg-amber-500 animate-pulse' },
  active:  { label: 'Live',     icon: Video,        color: 'text-green-700 bg-green-50 border-green-200',   dot: 'bg-green-500 animate-pulse' },
  ended:   { label: 'Ended',    icon: CheckCircle2, color: 'text-slate-600 bg-slate-100 border-slate-200',  dot: 'bg-slate-400' },
}
function statusMeta(s) { return STATUS_META[s] ?? STATUS_META.ended }

// ─── Join Confirmation Modal (Vet) ────────────────────────────────────────────

function VetJoinModal({ consultation, onClose, onJoined, onDeclined }) {
  const [joining, setJoining] = useState(false)

  async function handleJoin() {
    setJoining(true)
    try {
      await api.patch(`/api/consultations/${consultation._id}/status`, { status: 'active' })
      window.open(jitsiUrl(consultation._id), '_blank', 'noopener,noreferrer')
      onJoined()
    } catch { setJoining(false) }
  }

  async function handleDecline() {
    try {
      await api.patch(`/api/consultations/${consultation._id}/status`, { status: 'ended' })
      onDeclined()
    } catch { onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white font-bold text-xl">Incoming Call</h2>
          <p className="text-indigo-200 mt-1 text-sm">
            {consultation.ownerName || 'Pet Owner'}
            {consultation.petName && ` — about ${consultation.petName}`}
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs text-slate-500 text-center mb-4">
            This will open a Jitsi Meet video call in a new tab.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDecline}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl transition-colors border border-red-200">
              <PhoneOff className="w-4 h-4" /> Decline
            </button>
            <button onClick={handleJoin} disabled={joining}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
              Join Call
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Owner: Request Consultation Modal ───────────────────────────────────────

function OwnerRequestModal({ user, onClose, onCreated }) {
  const [pets, setPets]         = useState([])
  const [petId, setPetId]       = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/pets')
      .then(r => { setPets(r.data); if (r.data.length > 0) setPetId(r.data[0]._id) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const selectedPet = pets.find(p => p._id === petId)
      await api.post('/api/consultations', {
        ownerName: user.name,
        petId:     selectedPet?._id,
        petName:   selectedPet?.name ?? '',
        notes:     notes.trim(),
      })
      onCreated()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to request consultation.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Request a Consultation</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pet</label>
            {loading ? (
              <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-indigo-400" /></div>
            ) : pets.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No pets registered. <a href="/my-pets" className="text-indigo-600">Add a pet first.</a></p>
            ) : (
              <select value={petId} onChange={e => setPetId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {pets.map(p => <option key={p._id} value={p._id}>{p.name} ({p.species})</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Describe your concern <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="e.g. Buddy has been limping since yesterday…"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-600 flex items-start gap-2">
            <Video className="w-4 h-4 shrink-0 mt-0.5" />
            <span>A unique Jitsi Meet video room will be created. The vet will join when they're ready.</span>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
            <button type="submit" disabled={saving || loading || (pets.length === 0)}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
              Request Call
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Vet: Simulate Call Modal (testing tool) ──────────────────────────────────

function SimulateModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ ownerName: '', ownerId: '', petName: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/consultations', form)
      onCreated()
    } catch { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Simulate Incoming Call</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {[
            { key: 'ownerName', label: 'Owner Name',  placeholder: 'John Smith',           required: true },
            { key: 'ownerId',   label: 'Owner ID',    placeholder: 'optional user id' },
            { key: 'petName',   label: 'Pet Name',    placeholder: 'Buddy' },
            { key: 'notes',     label: 'Notes',       placeholder: 'Concerns about…' },
          ].map(({ key, label, placeholder, required }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder} required={required}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
              Simulate
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Consultation Card ────────────────────────────────────────────────────────

function ConsultationCard({ c, isOwner, onJoin, onEnd }) {
  const meta = statusMeta(c.status)
  const Icon = meta.icon
  const url  = c.joinUrl || jitsiUrl(c._id)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800">
            {isOwner ? (c.petName || 'Consultation') : (c.ownerName || c.ownerId || 'Owner')}
          </p>
          {!isOwner && c.petName && <span className="text-slate-400 text-xs">— {c.petName}</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(c.createdAt)}</span>
          <span>{formatDate(c.createdAt)}</span>
          {c.notes && <span className="truncate max-w-[12rem]">· {c.notes}</span>}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {/* Vet actions */}
        {!isOwner && c.status === 'pending' && (
          <button onClick={() => onJoin(c)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
            <Video className="w-3.5 h-3.5" /> Join
          </button>
        )}
        {!isOwner && c.status === 'active' && (
          <>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-colors border border-indigo-200">
              <ExternalLink className="w-3.5 h-3.5" /> Rejoin
            </a>
            <button onClick={() => onEnd(c._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200">
              <PhoneOff className="w-3.5 h-3.5" /> End
            </button>
          </>
        )}

        {/* Owner actions */}
        {isOwner && c.status === 'active' && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
            <Video className="w-3.5 h-3.5" /> Join Call
          </a>
        )}
        {isOwner && c.status === 'pending' && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
            Waiting for vet…
          </span>
        )}

        {/* Ended */}
        {c.status === 'ended' && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Done
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Consultations Page ───────────────────────────────────────────────────────

export default function Consultations() {
  const { user }                        = useAuth()
  const isOwner                         = user?.role === 'owner'
  const [consultations, setConsultations] = useState([])
  const [pending, setPending]           = useState([])
  const [joinTarget, setJoinTarget]     = useState(null)
  const [showRequest, setRequest]       = useState(false)
  const [loading, setLoading]           = useState(true)

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    if (isOwner) return // owners don't need the pending-call poller
    const id = setInterval(fetchPending, 5000)
    return () => clearInterval(id)
  }, [isOwner])

  async function fetchAll() {
    setLoading(true)
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/api/consultations'),
        api.get('/api/consultations/pending'),
      ])
      setConsultations(cRes.data)
      setPending(pRes.data)
    } catch {} finally { setLoading(false) }
  }

  async function fetchPending() {
    try { const { data } = await api.get('/api/consultations/pending'); setPending(data) } catch {}
  }

  async function handleEnd(id) {
    try {
      await api.patch(`/api/consultations/${id}/status`, { status: 'ended' })
      fetchAll()
    } catch {}
  }

  const stats = [
    { label: 'Pending',   value: consultations.filter(c => c.status === 'pending').length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Active',    value: consultations.filter(c => c.status === 'active').length,  color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Completed', value: consultations.filter(c => c.status === 'ended').length,   color: 'bg-slate-100 text-slate-700 border-slate-200' },
  ]

  return (
    <AppLayout
      title={isOwner ? 'My Consultations' : 'Live Consultations'}
      subtitle={isOwner ? 'Video calls with your vet' : 'Video calls and online appointments'}
      actions={
        isOwner
          ? <button onClick={() => setRequest(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Request Consultation
            </button>
          : <button onClick={() => setRequest(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Simulate Call
            </button>
      }
    >
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Incoming call banner — vet only */}
        {!isOwner && pending.length > 0 && (
          <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                  <PhoneCall className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">
                    {pending.length === 1 ? 'Incoming Call' : `${pending.length} Incoming Calls`}
                  </p>
                  <p className="text-red-100 text-sm mt-0.5">
                    {pending[0].ownerName || 'Pet Owner'}
                    {pending[0].petName && ` — about ${pending[0].petName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setJoinTarget(pending[0])}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors shadow-sm">
                <Video className="w-4 h-4" /> Join Call
              </button>
            </div>
          </div>
        )}

        {/* Owner active call banner */}
        {isOwner && consultations.some(c => c.status === 'active') && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">Your vet is ready!</p>
                  <p className="text-green-100 text-sm mt-0.5">Click to join your video consultation.</p>
                </div>
              </div>
              {consultations.filter(c => c.status === 'active').map(c => (
                <a key={c._id}
                  href={c.joinUrl || jitsiUrl(c._id)}
                  target="_blank" rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-green-700 text-sm font-bold rounded-xl hover:bg-green-50 transition-colors shadow-sm">
                  <Video className="w-4 h-4" /> Join Call
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value, color }) => (
            <div key={label} className={`rounded-2xl border p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-1 opacity-75">{label}</p>
            </div>
          ))}
        </div>

        {/* Consultation list */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            {isOwner ? 'My Consultations' : 'All Consultations'}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Video className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <p className="font-semibold text-slate-600">No consultations yet</p>
              <p className="text-sm text-slate-400 mt-1">
                {isOwner ? 'Click "Request Consultation" to start a video call with your vet.' : 'Click "Simulate Call" to test the flow.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map(c => (
                <ConsultationCard
                  key={c._id}
                  c={c}
                  isOwner={isOwner}
                  onJoin={setJoinTarget}
                  onEnd={handleEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
          <ExternalLink className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-700">Powered by Jitsi Meet</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              Each consultation gets a private room at <span className="font-mono">meet.jit.si/Vet4Pet-[ID]</span>. No account needed — opens in a new tab.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {joinTarget && (
        <VetJoinModal
          consultation={joinTarget}
          onClose={() => setJoinTarget(null)}
          onJoined={() => { setJoinTarget(null); fetchAll() }}
          onDeclined={() => { setJoinTarget(null); fetchAll() }}
        />
      )}

      {showRequest && (
        isOwner
          ? <OwnerRequestModal user={user} onClose={() => setRequest(false)} onCreated={() => { setRequest(false); fetchAll() }} />
          : <SimulateModal onClose={() => setRequest(false)} onCreated={() => { setRequest(false); fetchAll() }} />
      )}
    </AppLayout>
  )
}

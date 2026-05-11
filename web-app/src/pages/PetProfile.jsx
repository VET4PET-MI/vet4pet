import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Upload, Download, ExternalLink,
  FileText, Loader2, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import api, { API_BASE } from '../api'
import { useAuth } from '../context/AuthContext'

// ─── Record type metadata ─────────────────────────────────────────────────────

const RECORD_TYPES = [
  { value: 'VISIT_SUMMARY', label: 'Visit Summary', icon: '🩺', color: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  { value: 'VACCINATION',   label: 'Vaccination',   icon: '💉', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  { value: 'LAB_RESULT',    label: 'Lab Result',    icon: '🧪', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'XRAY',          label: 'X-Ray',         icon: '🔬', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { value: 'BLOOD_TEST',    label: 'Blood Test',    icon: '🩸', color: 'bg-red-50 text-red-700 border-red-200',     dot: 'bg-red-500' },
  { value: 'OTHER',         label: 'Other',         icon: '📋', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
]

function typeMeta(value) {
  return RECORD_TYPES.find(t => t.value === value) ?? RECORD_TYPES[5]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isImage(url = '') {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
}

function formatDate(ds) {
  return new Date(ds).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatBytes(b) {
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

// ─── FileAttachment ───────────────────────────────────────────────────────────

function FileAttachment({ fileUrl, originalFileName }) {
  const href = /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_BASE}${fileUrl}`
  const name = originalFileName || fileUrl.split('/').pop()

  if (isImage(fileUrl)) {
    return (
      <div className="mt-4">
        <a href={href} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={href}
            alt={name}
            className="max-h-56 w-auto rounded-xl border border-slate-200 object-cover hover:opacity-90 transition-opacity"
          />
        </a>
        <div className="flex gap-4 mt-2">
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> View full size
          </a>
          <a href={href} download={name}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
        <FileText className="w-4.5 h-4.5 text-red-500" size={18} />
      </div>
      <span className="flex-1 min-w-0 text-sm text-slate-700 font-medium truncate">{name}</span>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium rounded-lg transition-colors">
        <ExternalLink className="w-3.5 h-3.5" /> View
      </a>
      <a href={href} download={name}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-lg transition-colors">
        <Download className="w-3.5 h-3.5" /> Download
      </a>
    </div>
  )
}

// ─── RecordCard ───────────────────────────────────────────────────────────────

function RecordCard({ record }) {
  const [expanded, setExpanded] = useState(false)
  const meta       = typeMeta(record.type)
  const isLong     = (record.findings?.length ?? 0) > 220

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <div className={`w-3 h-3 rounded-full ${meta.dot}`} />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Content card */}
      <div className="flex-1 pb-6 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
              <span>{meta.icon}</span>{meta.label}
            </span>
            <span className="text-xs text-slate-400 font-medium">{formatDate(record.date)}</span>
          </div>

          {/* Vet */}
          {record.vetName && (
            <p className="text-xs text-slate-400 mb-3">
              Recorded by <span className="text-slate-600 font-medium">{record.vetName}</span>
            </p>
          )}

          {/* Findings */}
          {record.findings && (
            <div>
              <p className={`text-sm text-slate-700 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {record.findings}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {expanded
                    ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> Show more</>}
                </button>
              )}
            </div>
          )}

          {/* Attachment */}
          {record.fileUrl && (
            <FileAttachment fileUrl={record.fileUrl} originalFileName={record.originalFileName} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ file, onFile, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  const previewUrl = file && isImage(file.name) ? URL.createObjectURL(file) : null

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-red-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer select-none transition-colors',
        dragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
      ].join(' ')}
    >
      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-slate-600">Drop a file or click to browse</p>
      <p className="text-xs text-slate-400 mt-1">PDF · JPG · PNG · up to 10 MB</p>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }}
      />
    </div>
  )
}

// ─── AddRecordModal ───────────────────────────────────────────────────────────

function AddRecordModal({ petId, user, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm]         = useState({ type: 'VISIT_SUMMARY', date: today, vetName: user?.name ?? '', findings: '' })
  const [file, setFile]         = useState(null)
  const [submitting, setSub]    = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState(null)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSub(true)
    setError(null)
    try {
      let fileUrl = null
      let originalFileName = null

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await api.post('/api/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: ev =>
            setProgress(ev.total ? Math.round(ev.loaded * 100 / ev.total) : 0),
        })
        fileUrl          = data.url
        originalFileName = data.originalName
      }

      await api.post('/api/records', {
        petId,
        date:     form.date || today,
        vetName:  form.vetName,
        type:     form.type,
        findings: form.findings,
        ...(fileUrl && { fileUrl, originalFileName }),
      })

      onSaved()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save record. Please try again.')
    } finally {
      setSub(false)
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Add Medical Record</h2>
            <p className="text-sm text-slate-400 mt-0.5">Document a visit, test, vaccination, or file</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body + sticky footer — all inside one <form> */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Type picker */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Record Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RECORD_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('type', t.value)}
                    className={[
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                      form.type === t.value
                        ? `${t.color} ring-2 ring-offset-1 ring-current`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{t.icon}</span>
                    <span className="truncate text-xs leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Vet */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vet Name</label>
                <input
                  type="text"
                  value={form.vetName}
                  onChange={e => set('vetName', e.target.value)}
                  placeholder="Dr. Smith"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Findings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Clinical Findings</label>
              <textarea
                value={form.findings}
                onChange={e => set('findings', e.target.value)}
                placeholder="Describe observations, diagnosis, treatment plan…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Attach Document
                <span className="text-slate-400 font-normal ml-1">(optional)</span>
              </label>
              <DropZone file={file} onFile={setFile} onRemove={() => setFile(null)} />
            </div>

            {/* Upload progress */}
            {submitting && file && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          {/* Sticky footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PetProfile Page ──────────────────────────────────────────────────────────

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇' }

export default function PetProfile({ readOnly = false }) {
  const { id }        = useParams()
  const navigate      = useNavigate()
  const { user }      = useAuth()
  const backPath  = readOnly ? '/my-pets' : '/'
  const backLabel = readOnly ? 'My Pets'  : 'All Patients'

  const [pet, setPet]         = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showModal, setModal] = useState(false)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [petRes, recRes] = await Promise.all([
        api.get(`/api/pets/${id}`),
        api.get(`/api/records/pet/${id}`),
      ])
      setPet(petRes.data)
      setRecords(recRes.data)
    } catch {
      setError('Could not load pet data.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaved() {
    setModal(false)
    const { data } = await api.get(`/api/records/pet/${id}`)
    setRecords(data)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-red-600 font-medium">{error ?? 'Pet not found.'}</p>
        <button onClick={() => navigate('/')} className="text-sm text-indigo-600 hover:underline">
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  const emoji = SPECIES_EMOJI[pet.species?.toLowerCase()] ?? '🐾'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Sticky top nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
          <span className="text-slate-300 select-none">/</span>
          <span className="text-slate-800 font-semibold text-sm truncate">{pet.name}</span>

          {!readOnly && (
            <button
              onClick={() => setModal(true)}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Pet Hero */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center gap-5">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-sm">
            {emoji}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-800">{pet.name}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
              {[
                ['Species', pet.species],
                ['Breed',   pet.breed],
                ['Age',     pet.age != null ? `${pet.age} yr` : null],
                ['Gender',  pet.gender],
                ['Owner',   pet.ownerId],
              ].map(([label, val]) => val ? (
                <span key={label} className="text-sm text-slate-500">
                  <span className="font-medium text-slate-700">{label}:</span> {val}
                </span>
              ) : null)}
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Active Patient
            </span>
            <span className="text-xs text-slate-400">
              {records.length} record{records.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Medical History</h2>

          {records.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="text-5xl mb-4">📋</div>
              <p className="font-semibold text-slate-600">No records yet</p>
              <p className="text-sm text-slate-400 mt-1 mb-5">
                Document the first visit, test, or vaccination.
              </p>
              {!readOnly && (
                <button
                  onClick={() => setModal(true)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add First Record
                </button>
              )}
            </div>
          ) : (
            <div>
              {records.map(record => (
                <RecordCard key={record._id} record={record} />
              ))}
              {/* End dot */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                </div>
                <p className="text-xs text-slate-400 pb-2">Beginning of records</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {!readOnly && showModal && (
        <AddRecordModal
          petId={pet._id}
          user={user}
          onClose={() => setModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

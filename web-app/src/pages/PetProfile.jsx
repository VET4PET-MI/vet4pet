import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Upload, Download, ExternalLink,
  FileText, Loader2, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api, { API_BASE } from '../api'
import { useAuth } from '../context/AuthContext'
import { localizeSpecies, localizeBreed, localizeGender } from '../utils/petLocale'

const RECORD_TYPE_DEFS = [
  { value: 'VISIT_SUMMARY', key: 'visitSummary', icon: '🩺', color: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
  { value: 'VACCINATION',   key: 'vaccination',  icon: '💉', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  { value: 'LAB_RESULT',    key: 'labResult',    icon: '🧪', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'XRAY',          key: 'xray',         icon: '🔬', color: 'bg-sky-50 text-sky-700 border-sky-200',     dot: 'bg-sky-500' },
  { value: 'BLOOD_TEST',    key: 'bloodTest',    icon: '🩸', color: 'bg-red-50 text-red-700 border-red-200',     dot: 'bg-red-500' },
  { value: 'CONSULTATION',  key: 'consultation', icon: '📹', color: 'bg-teal-50 text-teal-700 border-teal-200',  dot: 'bg-teal-500' },
  { value: 'PRESCRIPTION',  key: 'prescription', icon: '💊', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { value: 'OTHER',         key: 'other',        icon: '📋', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
]

const MEDICAL_TYPES = ['VISIT_SUMMARY', 'VACCINATION', 'LAB_RESULT', 'XRAY', 'BLOOD_TEST', 'CONSULTATION']
const DOCS_TYPES    = ['PRESCRIPTION', 'OTHER']

function isImage(url = '') {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
}

function formatBytes(b) {
  if (b < 1024)        return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function FileAttachment({ fileUrl, originalFileName }) {
  const { t } = useTranslation()
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
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> {t('petProfile.viewFullSize')}
          </a>
          <a href={href} download={name}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Download className="w-3.5 h-3.5" /> {t('petProfile.download')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 rtl:flex-row-reverse">
      <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
        <FileText className="w-4.5 h-4.5 text-red-500" size={18} />
      </div>
      <span className="flex-1 min-w-0 text-sm text-slate-700 font-medium truncate">{name}</span>
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-soft text-brand-dark hover:bg-brand-soft/70 text-xs font-medium rounded-lg transition-colors">
        <ExternalLink className="w-3.5 h-3.5" /> {t('petProfile.view')}
      </a>
      <a href={href} download={name}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-medium rounded-lg transition-colors">
        <Download className="w-3.5 h-3.5" /> {t('petProfile.download')}
      </a>
    </div>
  )
}

function RecordCard({ record }) {
  const { t, i18n } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const meta       = RECORD_TYPE_DEFS.find(x => x.value === record.type) ?? RECORD_TYPE_DEFS[5]
  const label      = t(`petProfile.types.${meta.key}`)
  const isLong     = (record.findings?.length ?? 0) > 220
  const locale     = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'
  const dateStr    = new Date(record.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex gap-4 rtl:flex-row-reverse">
      <div className="flex flex-col items-center pt-1.5 shrink-0">
        <div className={`w-3 h-3 rounded-full ${meta.dot}`} />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      <div className="flex-1 pb-6 min-w-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
              <span>{meta.icon}</span>{label}
            </span>
            <span className="text-xs text-slate-400 font-medium">{dateStr}</span>
          </div>

          {record.vetName && (
            <p className="text-xs text-slate-400 mb-3">
              {t('petProfile.recordedBy')} <span className="text-slate-600 font-medium">{record.vetName}</span>
            </p>
          )}

          {record.findings && (
            <div>
              <p className={`text-sm text-slate-700 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                {record.findings}
              </p>
              {isLong && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
                >
                  {expanded
                    ? <><ChevronUp className="w-3.5 h-3.5" /> {t('petProfile.showLess')}</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> {t('petProfile.showMore')}</>}
                </button>
              )}
            </div>
          )}

          {record.fileUrl && (
            <FileAttachment fileUrl={record.fileUrl} originalFileName={record.originalFileName} />
          )}
        </div>
      </div>
    </div>
  )
}

function DropZone({ file, onFile, onRemove }) {
  const { t } = useTranslation()
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
      <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl rtl:flex-row-reverse">
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
          ? 'border-brand bg-brand-soft'
          : 'border-slate-200 hover:border-brand/40 hover:bg-slate-50',
      ].join(' ')}
    >
      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-slate-600">{t('petProfile.dropFile')}</p>
      <p className="text-xs text-slate-400 mt-1">{t('petProfile.dropFileHint')}</p>
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

function AddRecordModal({ petId, user, defaultType = 'VISIT_SUMMARY', onClose, onSaved }) {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm]         = useState({ type: defaultType, date: today, vetName: user?.name ?? '', findings: '' })
  const [file, setFile]         = useState(null)
  const [submitting, setSub]    = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError]       = useState(null)

  const RECORD_TYPES = RECORD_TYPE_DEFS.map(x => ({ ...x, label: t(`petProfile.types.${x.key}`) }))

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
      setError(err.response?.data?.message ?? t('petProfile.saveFail'))
    } finally {
      setSub(false)
      setProgress(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">

        {/* Banner */}
        <div className="relative bg-brand-tint px-6 py-5 border-b border-brand/15 shrink-0">
          <div className="absolute -top-6 -end-6 w-24 h-24 rounded-full bg-brand-soft/60 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between rtl:flex-row-reverse">
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-md shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="rtl:text-right">
                <h2 className="text-lg font-bold text-brand-deep">{t('petProfile.addModalTitle')}</h2>
                <p className="text-xs text-ink-muted mt-0.5">{t('petProfile.addModalSub')}</p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="p-2 text-slate-500 hover:bg-white/60 rounded-xl transition shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('petProfile.recordType')}</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RECORD_TYPES.map(typ => (
                  <button
                    key={typ.value}
                    type="button"
                    onClick={() => set('type', typ.value)}
                    className={[
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-start rtl:flex-row-reverse',
                      form.type === typ.value
                        ? `${typ.color} ring-2 ring-offset-1 ring-current`
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{typ.icon}</span>
                    <span className="truncate text-xs leading-tight">{typ.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('petProfile.date')}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('petProfile.vetName')}</label>
                <input
                  type="text"
                  value={form.vetName}
                  onChange={e => set('vetName', e.target.value)}
                  placeholder={t('petProfile.vetNamePh')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('petProfile.findings')}</label>
              <textarea
                value={form.findings}
                onChange={e => set('findings', e.target.value)}
                placeholder={t('petProfile.findingsPh')}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand transition resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('petProfile.attachDocument')}
                <span className="text-slate-400 font-normal ms-1">{t('common.optional')}</span>
              </label>
              <DropZone file={file} onFile={setFile} onRemove={() => setFile(null)} />
            </div>

            {submitting && file && (
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{t('petProfile.uploading')}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t('petProfile.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('petProfile.saving')}</>
                : t('petProfile.saveRecord')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const SPECIES_EMOJI = { dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇' }

export default function PetProfile({ readOnly = false }) {
  const { t }     = useTranslation()
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const backPath  = readOnly ? '/my-pets' : '/'
  const backLabel = readOnly ? t('petProfile.backOwner') : t('petProfile.backVet')

  const PAGE_SIZE = 10
  const [pet, setPet]         = useState(null)
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]     = useState(null)
  const [showModal, setModal] = useState(false)
  const [tab, setTab] = useState('medical') // 'medical' | 'docs'

  useEffect(() => { fetchPet() }, [id])
  useEffect(() => { fetchRecords(true) }, [id, tab])

  async function fetchPet() {
    try {
      const { data } = await api.get(`/api/pets/${id}`)
      setPet(data)
    } catch {
      setError(t('petProfile.notFound'))
    }
  }

  async function fetchRecords(reset) {
    if (reset) setLoading(true)
    else       setLoadingMore(true)
    setError(null)
    try {
      const skip = reset ? 0 : records.length
      const { data } = await api.get(`/api/records/pet/${id}`, {
        params: { limit: PAGE_SIZE, skip, types: (tab === 'medical' ? MEDICAL_TYPES : DOCS_TYPES).join(',') },
      })
      if (reset) {
        setRecords(data.items)
      } else {
        setRecords(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setHasMore(data.hasMore)
    } catch {
      if (reset) setError(t('petProfile.notFound'))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMore() {
    if (loadingMore || !hasMore) return
    fetchRecords(false)
  }

  async function handleSaved() {
    setModal(false)
    fetchRecords(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    )
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-red-600 font-medium">{error ?? t('petProfile.petNotFound')}</p>
        <button onClick={() => navigate('/')} className="text-sm text-brand hover:underline">
          {t('petProfile.backDashboard')}
        </button>
      </div>
    )
  }

  const emoji = SPECIES_EMOJI[pet.species?.toLowerCase()] ?? '🐾'

  return (
    <div className="min-h-screen bg-bg">

      <div className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-brand-dark text-sm font-medium transition-colors shrink-0 rtl:flex-row-reverse"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {backLabel}
          </button>
          <span className="text-slate-300 select-none">/</span>
          <span className="text-slate-800 font-semibold text-sm truncate">{pet.name}</span>

          {!readOnly && (
            <button
              onClick={() => setModal(true)}
              className="ms-auto flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg shrink-0 rtl:flex-row-reverse"
            >
              <Plus className="w-4 h-4" /> {t('petProfile.addRecord')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-brand-tint p-7 shadow-sm ring-1 ring-brand/15">
          <div className="absolute -top-10 -end-10 w-48 h-48 rounded-full bg-brand-soft/60 blur-3xl pointer-events-none" />

          <div className="relative flex items-center gap-6 rtl:flex-row-reverse rtl:text-right">
            <div className="w-24 h-24 bg-white/70 backdrop-blur-sm rounded-3xl flex items-center justify-center text-5xl shrink-0 shadow-md ring-1 ring-brand/10">
              {emoji}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-brand-deep text-3xl font-bold tracking-tight">{pet.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  [t('petProfile.speciesLabel'), localizeSpecies(pet.species, t)],
                  [t('petProfile.breedLabel'),   localizeBreed(pet.breed, t)],
                  [t('petProfile.ageLabel'),     pet.age != null ? t('petProfile.ageValue', { n: pet.age }) : null],
                  [t('petProfile.genderLabel'),  localizeGender(pet.gender, t)],
                ].map(([label, val]) => val ? (
                  <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/80 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full ring-1 ring-brand/10">
                    <span className="text-brand-dark font-semibold">{label}:</span> {val}
                  </span>
                ) : null)}
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {t('petProfile.activePatient')}
              </span>
              <span className="text-xs text-ink-muted font-medium">
                {t('petProfile.recordsCount', { count: total })}
              </span>
            </div>
          </div>
        </div>

        <section>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-7 bg-brand rounded-full" />
              <h2 className="text-lg font-bold text-ink">
                {tab === 'medical' ? t('petProfile.medicalHistory') : t('petProfile.tabDocs')}
              </h2>
            </div>
            <div className="ms-auto flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => setTab('medical')}
                className={`px-3 py-1.5 transition-colors ${tab === 'medical' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t('petProfile.tabMedical')}
              </button>
              <button
                type="button"
                onClick={() => setTab('docs')}
                className={`px-3 py-1.5 transition-colors ${tab === 'docs' ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t('petProfile.tabDocs')}
              </button>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-brand/25">
              <div className="w-20 h-20 mx-auto mb-4 bg-brand-soft rounded-3xl flex items-center justify-center text-5xl">
                📋
              </div>
              <p className="font-semibold text-slate-700">{tab === 'medical' ? t('petProfile.noRecordsTitle') : t('petProfile.noDocsTitle')}</p>
              <p className="text-sm text-slate-400 mt-1 mb-5">
                {tab === 'medical' ? t('petProfile.noRecordsHint') : t('petProfile.noDocsHint')}
              </p>
              {!readOnly && (
                <button
                  onClick={() => setModal(true)}
                  className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  {tab === 'medical' ? t('petProfile.addFirstRecord') : t('petProfile.addFirstDoc')}
                </button>
              )}
            </div>
          ) : (
            <div>
              {records.map(record => (
                <RecordCard key={record._id} record={record} />
              ))}

              {hasMore && (
                <div className="flex justify-center my-4">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-brand/25 hover:bg-brand-soft hover:border-brand/40 text-brand-dark text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
                  >
                    {loadingMore
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('petProfile.loadingMore')}</>
                      : t('petProfile.loadMore', { remaining: total - records.length })}
                  </button>
                </div>
              )}

              {!hasMore && (
                <div className="flex gap-4 rtl:flex-row-reverse">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                  </div>
                  <p className="text-xs text-slate-400 pb-2">{t('petProfile.beginningOfRecords')}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {!readOnly && showModal && (
        <AddRecordModal
          petId={pet._id}
          user={user}
          defaultType={tab === 'docs' ? 'PRESCRIPTION' : 'VISIT_SUMMARY'}
          onClose={() => setModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

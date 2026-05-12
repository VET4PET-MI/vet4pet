import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare, Plus, X, Stethoscope } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'

function useFormatTime() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('he') ? 'he-IL' : 'en-US'
  return function formatTime(ds) {
    const d = new Date(ds)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return t('messages.yesterday')
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }
}

function Avatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold shrink-0`}>
      {(name?.[0] ?? '?').toUpperCase()}
    </div>
  )
}

function ComposeModal({ onClose, onSent }) {
  const { t } = useTranslation()
  const [toId, setToId]       = useState('')
  const [toName, setToName]   = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSend(e) {
    e.preventDefault()
    if (!toId.trim() || !content.trim()) return
    setSending(true); setError(null)
    try {
      await api.post('/api/messages', {
        receiverId:   toId.trim(),
        receiverName: toName.trim() || toId.trim(),
        content:      content.trim(),
      })
      onSent(toId.trim())
    } catch (err) {
      setError(err.response?.data?.message ?? t('messages.sendFail'))
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{t('messages.newMessage')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSend} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('messages.recipientId')}</label>
            <input value={toId} onChange={e => setToId(e.target.value)} placeholder={t('messages.recipientIdPh')} required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('messages.recipientName')} <span className="text-slate-400 font-normal">{t('common.optional')}</span></label>
            <input value={toName} onChange={e => setToName(e.target.value)} placeholder={t('messages.recipientNamePh')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('messages.message')}</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} required
              placeholder={t('messages.messagePh')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">{t('messages.cancel')}</button>
            <button type="submit" disabled={sending}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('messages.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MessageClinicModal({ onClose, onSent }) {
  const { t } = useTranslation()
  const [vets, setVets]       = useState([])
  const [vetId, setVetId]     = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/users/vets')
      .then(r => { setVets(r.data); if (r.data.length > 0) setVetId(r.data[0]._id) })
      .catch(() => setError(t('messages.couldNotLoad')))
      .finally(() => setLoading(false))
  }, [t])

  async function handleSend(e) {
    e.preventDefault()
    if (!vetId || !content.trim()) return
    setSending(true); setError(null)
    try {
      const vet = vets.find(v => v._id === vetId)
      await api.post('/api/messages', {
        receiverId:   vetId,
        receiverName: vet?.name ?? 'Clinic',
        content:      content.trim(),
      })
      onSent(vetId)
    } catch (err) {
      setError(err.response?.data?.message ?? t('messages.sendFail'))
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3 rtl:flex-row-reverse">
            <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">{t('messages.messageClinic')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSend} className="px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
          ) : vets.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('messages.vet')}</label>
              <select value={vetId} onChange={e => setVetId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                {vets.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
          ) : vets.length === 1 ? (
            <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl rtl:flex-row-reverse rtl:text-right">
              <Avatar name={vets[0].name} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{vets[0].name}</p>
                <p className="text-xs text-slate-500">{t('messages.yourVet')}</p>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('messages.yourMessage')}</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} required
              autoFocus
              placeholder={t('messages.ownerMessagePh')}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition">{t('messages.cancel')}</button>
            <button type="submit" disabled={sending || loading || !vetId}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('messages.sendMessage')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Messages() {
  const { t }                       = useTranslation()
  const formatTime                  = useFormatTime()
  const { user }                    = useAuth()
  const isOwner                     = user?.role === 'owner'
  const bottomRef                   = useRef(null)
  const [convos, setConvos]         = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [messages, setMessages]     = useState([])
  const [draft, setDraft]           = useState('')
  const [sending, setSending]       = useState(false)
  const [showCompose, setCompose]   = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  useEffect(() => { fetchConvos() }, [])
  useEffect(() => {
    if (!activeId) return
    fetchMessages(activeId)
    markRead(activeId)
    const id = setInterval(() => fetchMessages(activeId), 5000)
    return () => clearInterval(id)
  }, [activeId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchConvos() {
    try { const { data } = await api.get('/api/messages/conversations'); setConvos(data) } catch {}
  }

  async function fetchMessages(otherId) {
    setLoadingMsgs(true)
    try { const { data } = await api.get(`/api/messages?withUser=${otherId}`); setMessages(data) }
    catch {} finally { setLoadingMsgs(false) }
  }

  async function markRead(otherId) {
    try { await api.put(`/api/messages/conversation/${otherId}/read`) } catch {}
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    setSending(true)
    try {
      const conv = convos.find(c => c._id.split('::').find(p => p !== user?.id) === activeId)
      const receiverName = conv?.lastMessage?.senderId === activeId
        ? conv?.lastMessage?.senderName
        : conv?.lastMessage?.receiverName
      await api.post('/api/messages', { receiverId: activeId, receiverName, content: draft.trim() })
      setDraft('')
      await fetchMessages(activeId)
      await fetchConvos()
    } catch {} finally { setSending(false) }
  }

  function getPartner(conv) {
    const ids = conv._id.split('::')
    const partnerId = ids.find(id => id !== user?.id) ?? ids[0]
    const msg = conv.lastMessage
    const name = msg.senderId === partnerId ? msg.senderName : msg.receiverName
    return { id: partnerId, name: name || (isOwner ? t('messages.yourVet') : t('messages.client')) }
  }

  function handleComposeSent(toId) {
    setCompose(false)
    fetchConvos()
    setActiveId(toId)
  }

  const activeConv    = convos.find(c => c._id.includes(activeId))
  const activePartner = activeConv ? getPartner(activeConv) : null

  const emptyStateAction = isOwner
    ? <button onClick={() => setCompose(true)}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors rtl:flex-row-reverse">
        <Stethoscope className="w-4 h-4" /> {t('messages.messageClinic')}
      </button>
    : <button onClick={() => setCompose(true)}
        className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors rtl:flex-row-reverse">
        <Plus className="w-4 h-4" /> {t('messages.compose')}
      </button>

  return (
    <AppLayout
      title={isOwner ? t('messages.titleOwner') : t('messages.titleVet')}
      actions={
        isOwner
          ? <button onClick={() => setCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm rtl:flex-row-reverse">
              <Stethoscope className="w-4 h-4" /> {t('messages.messageClinic')}
            </button>
          : <button onClick={() => setCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm rtl:flex-row-reverse">
              <Plus className="w-4 h-4" /> {t('messages.compose')}
            </button>
      }
    >
      <div className="flex h-full overflow-hidden">

        {/* ── Conversation list ────────────────────────────────────────── */}
        <div className="w-72 shrink-0 border-e border-slate-200 bg-white overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('messages.conversations')}</p>
          </div>

          {convos.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">{t('messages.noMessagesYet')}</p>
              <p className="text-xs text-slate-400 mt-1">
                {isOwner ? t('messages.ownerEmptyHint') : t('messages.vetEmptyHint')}
              </p>
              {emptyStateAction}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {convos.map(conv => {
                const partner = getPartner(conv)
                return (
                  <li key={conv._id}>
                    <button
                      onClick={() => setActiveId(partner.id)}
                      className={[
                        'w-full text-start px-4 py-3.5 hover:bg-slate-50 transition-colors',
                        activeId === partner.id ? 'bg-violet-50 border-e-2 border-violet-500' : '',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2 rtl:flex-row-reverse">
                        <div className="flex items-center gap-2.5 min-w-0 rtl:flex-row-reverse">
                          <Avatar name={partner.name} size="sm" />
                          <div className="min-w-0 rtl:text-right">
                            <p className="text-sm font-semibold text-slate-800 truncate">{partner.name}</p>
                            <p className="text-xs text-slate-400 truncate">{conv.lastMessage?.content}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-xs text-slate-400">{formatTime(conv.lastMessage?.createdAt)}</p>
                          {conv.unread > 0 && (
                            <span className="inline-block mt-1 min-w-[1.25rem] text-center text-xs font-bold bg-violet-500 text-white rounded-full px-1.5 py-0.5">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Thread ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-violet-300" />
              </div>
              <p className="text-slate-600 font-semibold text-base">{t('messages.selectConvo')}</p>
              <p className="text-sm text-slate-400 mt-1">
                {isOwner ? t('messages.ownerSelectHint') : t('messages.vetSelectHint')}
              </p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3 rtl:flex-row-reverse rtl:text-right">
                  <Avatar name={activePartner?.name} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {activePartner?.name ?? (isOwner ? t('messages.yourVet') : t('messages.client'))}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isOwner ? t('messages.vetClinic') : t('messages.petOwner')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                {loadingMsgs && messages.length === 0 && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  </div>
                )}
                {messages.length === 0 && !loadingMsgs && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-slate-400">{t('messages.convoEmpty')}</p>
                    <p className="text-xs text-slate-300 mt-1">{t('messages.convoFirst')}</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.senderId === user?.id
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && <Avatar name={msg.senderName} size="sm" />}
                      <div className={[
                        'max-w-[68%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                        isMe
                          ? 'bg-violet-600 text-white rounded-br-sm ms-2'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm ms-2',
                      ].join(' ')}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-violet-200' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input bar */}
              <form onSubmit={handleSend} className="bg-white border-t border-slate-200 px-4 py-3 flex items-end gap-3 shrink-0">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                  placeholder={t('messages.inputPh')}
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 max-h-24"
                />
                <button type="submit" disabled={sending || !draft.trim()}
                  className="shrink-0 p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl transition-colors">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {showCompose && (
        isOwner
          ? <MessageClinicModal onClose={() => setCompose(false)} onSent={handleComposeSent} />
          : <ComposeModal onClose={() => setCompose(false)} onSent={handleComposeSent} />
      )}
    </AppLayout>
  )
}

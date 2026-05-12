import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'

function relativeTime(ds, t) {
  const diffMs = Date.now() - new Date(ds).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('notifications.justNow')
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('notifications.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('notifications.daysAgo', { count: days })
}

function renderText(n, t) {
  const params = { ...(n.params || {}) }
  params.petSuffix = params.petName ? t('notifications.petSuffix', { petName: params.petName }) : ''
  const key = `notifications.types.${n.type}`
  const translated = t(key, params)
  if (translated === key) return t('notifications.types.fallback')
  return translated
}

export default function NotificationBell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen]       = useState(false)
  const [items, setItems]     = useState([])
  const [count, setCount]     = useState(0)
  const popoverRef            = useRef(null)
  const buttonRef             = useRef(null)

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (!open) return
      if (popoverRef.current?.contains(e.target)) return
      if (buttonRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function fetchCount() {
    try {
      const { data } = await api.get('/api/notifications/unread-count')
      setCount(data.count ?? 0)
    } catch {}
  }

  async function fetchList() {
    try {
      const { data } = await api.get('/api/notifications')
      setItems(data)
    } catch {}
  }

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) fetchList()
  }

  async function handleClick(n) {
    if (!n.read) {
      try {
        await api.patch(`/api/notifications/${n._id}/read`)
        setItems(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x))
        setCount(c => Math.max(0, c - 1))
      } catch {}
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  async function handleMarkAllRead(e) {
    e.stopPropagation()
    try {
      await api.patch('/api/notifications/read-all')
      setItems(prev => prev.map(x => ({ ...x, read: true })))
      setCount(0)
    } catch {}
  }

  async function handleDelete(e, id) {
    e.stopPropagation()
    try {
      await api.delete(`/api/notifications/${id}`)
      setItems(prev => prev.filter(x => x._id !== id))
      fetchCount()
    } catch {}
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[1.1rem] h-[1.1rem] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute end-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">{t('notifications.title')}</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                {t('notifications.empty')}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map(n => (
                  <li key={n._id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={[
                        'w-full text-start px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 rtl:flex-row-reverse',
                        n.read ? '' : 'bg-indigo-50/40',
                      ].join(' ')}
                    >
                      <span className={[
                        'mt-1 w-2 h-2 rounded-full shrink-0',
                        n.read ? 'bg-transparent' : 'bg-indigo-500',
                      ].join(' ')} />
                      <div className="flex-1 min-w-0 rtl:text-right">
                        <p className={`text-sm leading-snug ${n.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                          {renderText(n, t)}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{relativeTime(n.createdAt, t)}</p>
                      </div>
                      <button
                        onClick={e => handleDelete(e, n._id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition shrink-0"
                        aria-label="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

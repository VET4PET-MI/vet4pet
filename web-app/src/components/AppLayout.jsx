import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  PawPrint, LayoutDashboard, Calendar, MessageSquare,
  Video, Settings, Menu, X, LogOut, Siren,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import NotificationBell from './NotificationBell'

export default function AppLayout({ title, subtitle, actions, children }) {
  const { t } = useTranslation()
  const { user, logout }    = useAuth()
  const navigate            = useNavigate()
  const { pathname }        = useLocation()
  const [open, setOpen]     = useState(false)
  const [unread, setUnread] = useState(0)
  const [live, setLive]     = useState(0)

  const isOwner = user?.role === 'owner'

  const VET_NAV = [
    { icon: LayoutDashboard, label: t('nav.dashboard'),     path: '/' },
    { icon: Calendar,        label: t('nav.schedule'),      path: '/schedule' },
    { icon: MessageSquare,   label: t('nav.messages'),      path: '/messages' },
    { icon: Video,           label: t('nav.consultations'), path: '/consultations' },
    { icon: Settings,        label: t('nav.settings'),      path: '/settings' },
  ]

  const OWNER_NAV = [
    { icon: LayoutDashboard, label: t('nav.home'),           path: '/' },
    { icon: PawPrint,        label: t('nav.myPets'),         path: '/my-pets' },
    { icon: Calendar,        label: t('nav.appointments'),   path: '/my-appointments' },
    { icon: MessageSquare,   label: t('nav.messages'),       path: '/messages' },
    { icon: Video,           label: t('nav.consultations'),  path: '/consultations' },
    { icon: Siren,           label: t('emergency.navLabel'), path: '/emergency' },
  ]

  const NAV = isOwner ? OWNER_NAV : VET_NAV

  useEffect(() => {
    function poll() {
      api.get('/api/messages/unread-count').then(r => setUnread(r.data.count ?? 0)).catch(() => {})
      api.get('/api/consultations/pending').then(r => setLive(r.data.length ?? 0)).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 10_000)
    return () => clearInterval(id)
  }, [])

  function isActive(path) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  function go(path) { navigate(path); setOpen(false) }
  function handleLogout() { logout(); navigate('/login') }

  const firstName = user?.name?.split(' ')[0]
    ?? (isOwner ? t('nav.fallbackOwnerName') : t('nav.fallbackVetName'))
  const portalLabel = isOwner ? t('nav.ownerPortal') : t('nav.vetPortal')
  const greeting = title ?? t(isOwner ? 'nav.greetingOwner' : 'nav.greetingVet', { name: firstName })

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className={[
        'fixed top-0 left-0 h-full w-64 bg-slate-900 z-30 flex flex-col transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:static lg:translate-x-0',
      ].join(' ')}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700 shrink-0 rtl:flex-row-reverse">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1 rtl:text-right">
            <p className="text-white font-bold text-sm tracking-wide">VET 4 PET</p>
            <p className="text-slate-400 text-xs">{portalLabel}</p>
          </div>
          <button onClick={() => setOpen(false)} className="ms-auto text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, path }) => {
            const badge = path === '/messages'      && unread > 0 ? unread
                        : path === '/consultations' && live > 0   ? '●'
                        : null

            return (
              <button
                key={path}
                onClick={() => go(path)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-start rtl:flex-row-reverse',
                  isActive(path)
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                ].join(' ')}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1 min-w-0 truncate">{label}</span>
                {badge !== null && (
                  <span className={[
                    'text-xs rounded-full font-bold shrink-0 leading-none',
                    path === '/consultations'
                      ? 'text-red-400 animate-pulse'
                      : 'bg-indigo-500 text-white px-1.5 py-0.5 min-w-[1.25rem] text-center',
                  ].join(' ')}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User badge + logout */}
        <div className="p-4 border-t border-slate-700 shrink-0 space-y-2">
          <div className="flex items-center gap-3 rtl:flex-row-reverse">
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'ME'}
            </div>
            <div className="min-w-0 flex-1 rtl:text-right">
              <p className="text-white text-sm font-semibold truncate">{user?.name ?? t('nav.fallbackUser')}</p>
              <p className="text-slate-400 text-xs">
                {user?.role === 'vet' ? t('nav.roleVet')
                  : user?.role === 'owner' ? t('nav.roleOwner')
                  : t('nav.fallbackRole')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors text-start rtl:flex-row-reverse"
          >
            <LogOut size={16} /> {t('auth.signOut')}
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
          <button onClick={() => setOpen(o => !o)} className="text-slate-500 hover:text-slate-800 lg:hidden">
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-800 truncate">{greeting}</h1>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

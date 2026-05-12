import { useNavigate } from 'react-router-dom'
import { User, Mail, Shield, Calendar, ChevronRight, LogOut, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'

export default function Settings() {
  const { t, i18n }      = useTranslation()
  const { user, logout } = useAuth()
  const navigate         = useNavigate()

  function handleLogout() { logout(); navigate('/login') }

  const isHe = i18n.language?.startsWith('he')
  const roleLabel = user?.role === 'vet' ? t('auth.vetTab') : t('auth.ownerTab')
  const roleColor = user?.role === 'vet'
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <AppLayout title={t('settings.title')}>
      <div className="max-w-xl mx-auto px-6 py-8 space-y-5">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 rtl:flex-row-reverse rtl:text-right">
            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'ME'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{user?.name ?? t('nav.fallbackUser')}</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColor}`}>
                <Shield className="w-3 h-3" /> {roleLabel}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl rtl:flex-row-reverse rtl:text-right">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1 rtl:text-right">
                <p className="text-xs text-slate-400 font-medium">{t('settings.fullName')}</p>
                <p className="text-sm text-slate-800 font-semibold truncate">{user?.name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl rtl:flex-row-reverse rtl:text-right">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1 rtl:text-right">
                <p className="text-xs text-slate-400 font-medium">{t('settings.email')}</p>
                <p className="text-sm text-slate-800 font-semibold truncate">{user?.email ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Language switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            {t('settings.language')}
          </p>
          <div className="px-5 py-4 flex items-center gap-3 rtl:flex-row-reverse rtl:text-right">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <Languages className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0 rtl:text-right">
              <p className="text-sm font-semibold text-slate-800">{t('settings.languageDesc')}</p>
            </div>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => i18n.changeLanguage('he')}
                className={`px-3 py-1.5 transition-colors ${isHe ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                עברית
              </button>
              <button
                type="button"
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-1.5 transition-colors ${!isHe ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* Vet-only: availability shortcut */}
        {user?.role === 'vet' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
              {t('settings.clinicSettings')}
            </p>
            <button
              onClick={() => navigate('/vet-schedule-settings')}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-start rtl:flex-row-reverse"
            >
              <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0 rtl:text-right">
                <p className="text-sm font-semibold text-slate-800">{t('settings.availability')}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('settings.availabilityDesc')}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
            {t('settings.account')}
          </p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-50 transition-colors text-start rtl:flex-row-reverse group"
          >
            <div className="w-9 h-9 bg-red-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center shrink-0 transition-colors">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-600">{t('settings.logoutButton')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t('settings.logoutDesc')}</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-slate-300">{t('settings.footer')}</p>
      </div>
    </AppLayout>
  )
}

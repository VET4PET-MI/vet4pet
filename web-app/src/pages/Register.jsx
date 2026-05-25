import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PawPrint, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Register() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]         = useState('owner')
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError(t('auth.errorPwMismatch'))
      return
    }
    if (form.password.length < 6) {
      setError(t('auth.errorPwShort'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/register', {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     tab,
      })
      login(data.user, data.token)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? t('auth.errorConnectFail'))
    } finally {
      setLoading(false)
    }
  }

  const isVet = tab === 'vet'

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -end-20 w-[28rem] h-[28rem] rounded-full bg-brand/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -start-20 w-[28rem] h-[28rem] rounded-full bg-brand/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">

        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher className="text-slate-500 hover:text-brand-dark" />
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 bg-white/70 border border-brand/15 rounded-3xl py-6 px-4 backdrop-blur-md shadow-sm">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-xl mb-4">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink tracking-wide">{t('common.appName')}</h1>
          <p className="text-ink-muted text-sm mt-1">{t('auth.createAccount')}</p>
        </div>

        {/* Role tab */}
        <p className="text-center text-slate-600 text-sm font-medium mb-2">
          {t('auth.iAmRegisteringAs')}
        </p>
        <div className="flex rounded-2xl border border-slate-200 overflow-hidden mb-6 bg-slate-100">
          {[
            { id: 'vet',   label: t('auth.vetTab') },
            { id: 'owner', label: t('auth.ownerTab') },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setError(null) }}
              className={[
                'flex-1 py-3 text-sm font-semibold transition-all',
                tab === id
                  ? 'bg-brand text-white shadow'
                  : 'text-slate-500 hover:text-brand-dark',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-ink mb-1">
            {isVet ? t('auth.joinAsVet') : t('auth.joinAsOwner')}
          </h2>
          <p className="text-slate-400 text-sm mb-7">
            {isVet ? t('auth.joinDescVet') : t('auth.joinDescOwner')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.fullNameLabel')}
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={isVet ? t('auth.fullNamePlaceholderVet') : t('auth.fullNamePlaceholderOwner')}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={isVet ? t('auth.emailPlaceholderVet') : t('auth.emailPlaceholderOwner')}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('auth.passwordPlaceholderMin')}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pe-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('auth.confirmPasswordLabel')}
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-brand hover:text-brand-dark font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

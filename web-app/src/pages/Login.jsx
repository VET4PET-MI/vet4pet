import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PawPrint, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [tab, setTab]         = useState('vet')
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await axios.post('http://localhost:5000/api/auth/login', form)
      if (data.user.role !== tab) {
        const expected = data.user.role === 'vet' ? t('auth.vetTab') : t('auth.ownerTab')
        setError(t('auth.errorWrongRole', { expected }))
        setLoading(false)
        return
      }
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
      <div className="absolute -bottom-20 -start-20 w-[28rem] h-[28rem] rounded-full bg-brand/15 blur-3xl pointer-events-none" />

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
          <p className="text-ink-muted text-sm mt-1">{t('auth.portalTagline')}</p>
        </div>

        {/* Role tab */}
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
            {isVet ? t('auth.welcomeBackDoctor') : t('auth.welcomeBack')}
          </h2>
          <p className="text-slate-400 text-sm mb-7">
            {isVet ? t('auth.loginDescVet') : t('auth.loginDescOwner')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  placeholder={t('auth.passwordPlaceholder')}
                  required
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
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-brand hover:text-brand-dark font-medium">
            {t('auth.signUp')}
          </Link>
        </p>

        <p className="text-center text-slate-400 text-xs mt-2">
          {isVet
            ? t('auth.vetAdminNote')
            : <>{t('auth.testCreds')} <span className="text-brand font-medium">owner@test.com / owner123</span></>}
        </p>
      </div>
    </div>
  )
}

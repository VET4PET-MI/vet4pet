import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const current  = i18n.language?.startsWith('he') ? 'he' : 'en'
  const other    = current === 'he' ? 'en' : 'he'
  const label    = other === 'he' ? 'עברית' : 'English'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(other)}
      className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${className}`}
      aria-label="Toggle language"
    >
      <Languages className="w-4 h-4" />
      {label}
    </button>
  )
}

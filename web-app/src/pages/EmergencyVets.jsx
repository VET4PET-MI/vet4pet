import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Phone, MessageSquare, Loader2, AlertTriangle, Stethoscope, RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import AppLayout from '../components/AppLayout'

function formatDistance(km, t) {
  if (!Number.isFinite(km)) return t('emergency.unknownDistance')
  if (km < 1) return t('emergency.distanceM', { distance: Math.round(km * 1000) })
  return t('emergency.distanceKm', { distance: km.toFixed(1) })
}

export default function EmergencyVets() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [coords, setCoords]       = useState(null)
  const [locating, setLocating]   = useState(false)
  const [locError, setLocError]   = useState(null)
  const [vets, setVets]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [onCallOnly, setOnCall]   = useState(false)

  const fetchVets = useCallback(async (c, onCall) => {
    setLoading(true)
    try {
      const params = {}
      if (c) { params.lat = c.lat; params.lng = c.lng }
      if (onCall) params.onCall = 'true'
      const { data } = await api.get('/api/users/vets/nearby', { params })
      setVets(data)
    } catch {
      setVets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial: load list without coords so the user sees something while geo prompt is pending
    fetchVets(null, onCallOnly)
  }, [fetchVets, onCallOnly])

  function locate() {
    if (!navigator.geolocation) {
      setLocError(t('emergency.locationError'))
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCoords(c)
        setLocating(false)
        fetchVets(c, onCallOnly)
      },
      () => {
        setLocError(t('emergency.locationError'))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <AppLayout title={t('emergency.title')} subtitle={t('emergency.subtitle')}>
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Emergency banner */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 rtl:flex-row-reverse rtl:text-right">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">{t('emergency.emergencyBanner')}</p>
        </div>

        {/* Locate + filter */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          {!coords ? (
            <div className="text-center space-y-3">
              <MapPin className="w-10 h-10 text-indigo-400 mx-auto" />
              <p className="text-sm text-slate-600">{t('emergency.noLocation')}</p>
              <p className="text-xs text-slate-400">{t('emergency.useMyLocationHint')}</p>
              <button
                onClick={locate}
                disabled={locating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors rtl:flex-row-reverse"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {locating ? t('emergency.locating') : t('emergency.findMyLocation')}
              </button>
              {locError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">{locError}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rtl:flex-row-reverse rtl:text-right">
              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
                  <p className="text-xs text-slate-400">{t('emergency.findMyLocation')}</p>
                </div>
              </div>
              <button
                onClick={locate}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none rtl:flex-row-reverse">
            <input
              type="checkbox"
              checked={onCallOnly}
              onChange={e => setOnCall(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">{t('emergency.onCallOnly')}</span>
          </label>
        </div>

        {/* Vet list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : vets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="font-semibold text-slate-600">{t('emergency.noResults')}</p>
            <p className="text-sm text-slate-400 mt-1">{t('emergency.noResultsHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vets.map(v => (
              <div
                key={v._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4 rtl:flex-row-reverse rtl:text-right">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Stethoscope className="w-6 h-6 text-indigo-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">
                        {v.clinicName || v.name || '—'}
                      </p>
                      {v.isOnCall ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          ● {t('emergency.onCallNow')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          {t('emergency.offDuty')}
                        </span>
                      )}
                    </div>

                    {v.address && (
                      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {v.address}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistance(v.distanceKm, t)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                  {v.phone && (
                    <a
                      href={`tel:${v.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors rtl:flex-row-reverse"
                    >
                      <Phone className="w-4 h-4" /> {t('emergency.callBtn')}
                    </a>
                  )}
                  <button
                    onClick={() => navigate('/messages')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-xl transition-colors border border-indigo-200 rtl:flex-row-reverse"
                  >
                    <MessageSquare className="w-4 h-4" /> {t('emergency.messageBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

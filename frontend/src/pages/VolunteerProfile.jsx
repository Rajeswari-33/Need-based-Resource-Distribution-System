import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { ShieldCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function VolunteerProfile() {
  const { t } = usePreferences()
  const { currentUser, updateUser } = useAuth()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    availability: currentUser.availability || '',
    serviceArea: currentUser.serviceArea || '',
    vehicle: currentUser.vehicle || '',
    volunteerTypes: currentUser.volunteerTypes?.length ? currentUser.volunteerTypes : ['verification', 'delivery'],
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleVolunteerType(type) {
    setForm((previous) => ({
      ...previous,
      volunteerTypes: previous.volunteerTypes.includes(type)
        ? previous.volunteerTypes.filter((item) => item !== type)
        : [...previous.volunteerTypes, type],
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.volunteerTypes.length) {
      showToast('Choose at least one Setu field-team assignment type.', 'error')
      return
    }
    const result = await updateUser(currentUser.id, form)
    showToast(result ? 'Availability settings saved.' : 'Unable to save availability settings.', result ? 'success' : 'error')
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Setu Field Team Employee Profile')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Keep your availability current so nearby tasks find you.')}</p>
      </div>

      <div className="card mb-6 max-w-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-ink/70"><ShieldCheck size={16} className="text-ink/40" /> {t('Verification status')}</span>
          <StatusBadge status={currentUser.verified ? 'verified' : (currentUser.verificationStatus || 'unverified')}>{t(currentUser.verified ? 'Verified' : currentUser.verificationStatus === 'pending' ? 'Pending review' : currentUser.verificationStatus === 'rejected' ? 'Rejected' : 'Unverified')}</StatusBadge>
        </div>
        {!currentUser.verified && (
          <p className="mt-2 text-xs text-ink/50">
            {t('You need an admin-verified ID document before you can accept tasks.')} <Link to="/profile" className="font-semibold text-banyan-dark hover:underline">{t('Submit it from Profile')}</Link>.
          </p>
        )}
        {currentUser.verified && (
          <p className="mt-2 text-xs text-ink/50">
            {t('You are a Setu platform employee. Use the task board to view and manage your assignments.')}
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="card max-w-xl space-y-4 p-6">
        <h2 className="font-display text-sm font-semibold text-ink">{t('Availability settings')}</h2>
        <fieldset className="space-y-2">
          <legend className="label">{t('Setu team assignment types')}</legend>
          {[
            { value: 'verification', label: 'Field verification' },
            { value: 'delivery', label: 'Pickup and delivery' },
          ].map((type) => (
            <label key={type.value} className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={form.volunteerTypes.includes(type.value)}
                onChange={() => toggleVolunteerType(type.value)}
              />
              {t(type.label)}
            </label>
          ))}
        </fieldset>
        <div>
          <label className="label" htmlFor="availability">{t('When are you available?')}</label>
          <input id="availability" className="input" value={form.availability} onChange={(e) => update('availability', e.target.value)} placeholder={t('e.g. Weekday evenings, weekends')} />
        </div>
        <div>
          <label className="label" htmlFor="serviceArea">{t('Service area')}</label>
          <input id="serviceArea" className="input" value={form.serviceArea} onChange={(e) => update('serviceArea', e.target.value)} placeholder={t('e.g. Kovilpatti & nearby (10 km)')} />
        </div>
        <div>
          <label className="label" htmlFor="vehicle">{t('Mode of transport')}</label>
          <input id="vehicle" className="input" value={form.vehicle} onChange={(e) => update('vehicle', e.target.value)} placeholder={t('e.g. Two-wheeler, on foot, car')} />
        </div>
        <button type="submit" className="btn-accent w-full">{t('Save availability')}</button>
      </form>
    </DashboardLayout>
  )
}

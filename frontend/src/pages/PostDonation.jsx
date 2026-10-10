import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { CATEGORIES, CATEGORY_ICON } from '../data/seed.js'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

const CONDITIONS = ['New, unused', 'Like new', 'Good', 'Gently used', 'Fair — tested working']

export default function PostDonation() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { addResource, centers, MAX_DONATION_VALUE } = useData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const approvedCenters = centers.filter((c) => c.approved)

  const [form, setForm] = useState({
    title: '', titleTamil: '', category: CATEGORIES[0], condition: CONDITIONS[0], quantity: 1,
    description: '', location: currentUser.city || '',
    audience: 'individual', centerScope: 'open', centerId: approvedCenters[0]?.id || '',
    value: '', isBundle: false, bundleItems: '',
  })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const overCap = Number(form.value) > MAX_DONATION_VALUE

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return
    if (form.audience === 'center' && form.centerScope === 'specific' && !form.centerId) return
    const result = addResource({
      donorId: currentUser.id,
      title: form.title,
      titleTamil: form.titleTamil.trim(),
      category: form.category,
      condition: form.condition,
      quantity: Number(form.quantity) || 1,
      description: form.description.trim(),
      location: form.location,
      audience: form.audience,
      centerScope: form.audience === 'center' ? form.centerScope : null,
      centerId: form.audience === 'center' && form.centerScope === 'specific' ? form.centerId : null,
      value: Number(form.value) || 0,
      isBundle: form.isBundle,
      bundleItems: form.isBundle ? form.bundleItems.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      photo: CATEGORY_ICON[form.category],
    })
    if (!result.ok) {
      setError(result.error)
      showToast(result.error, 'error')
      return
    }
    setSuccess(true)
    showToast('Resource posted successfully.', 'success')
    setTimeout(() => navigate('/donor/donations'), 1200)
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md py-24 text-center">
          <CheckCircle2 size={40} className="mx-auto text-banyan" />
          <h1 className="mt-4 text-xl font-semibold">{t('Resource posted')}</h1>
          <p className="mt-1.5 text-sm text-ink/55">{t('Taking you to Manage Donations…')}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold tracking-tight">{t('Post a resource')}</h1>
      <p className="mt-1.5 text-sm text-ink/55">{t('Fill in the details below — recipients search by category and locality. Photo upload is optional in this demo; an icon is auto-assigned by category.')}</p>

      <form onSubmit={handleSubmit} className="card mt-6 max-w-2xl space-y-5 p-6">
        <div>
          <label className="label" htmlFor="title">{t('Title')}</label>
          <input id="title" className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder={t('e.g. Boys school uniform set (Age 10–12)')} required />
        </div>

        <div>
          <label className="label" htmlFor="titleTamil">{t('Tamil item name (optional)')}</label>
          <input id="titleTamil" className="input" value={form.titleTamil} onChange={(e) => update('titleTamil', e.target.value)} placeholder={t('Enter the item name in Tamil')} lang="ta" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">{t('Category')}</label>
            <select id="category" className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">{t('Condition')}</label>
            <select id="condition" className="input" value={form.condition} onChange={(e) => update('condition', e.target.value)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{t(c)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="quantity">{t('Quantity')}</label>
            <input id="quantity" type="number" min="1" className="input" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="value">{t('Estimated value (₹)')}</label>
            <input
              id="value" type="number" min="0" max={MAX_DONATION_VALUE}
              className={`input ${overCap ? 'border-clay' : ''}`}
              value={form.value} onChange={(e) => update('value', e.target.value)}
              placeholder={t('e.g. 750')}
            />
            <p className={`mt-1 text-xs ${overCap ? 'text-clay' : 'text-ink/45'}`}>
              {t(`Capped at ₹${MAX_DONATION_VALUE.toLocaleString('en-IN')} per posting — keeps the platform focused on everyday items.`)}
            </p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">{t('Description')}</label>
          <textarea id="description" className="input min-h-[90px]" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder={t('Any details a recipient should know — wear/tear, sizing, what\'s included, why you\'re donating it, etc.')} />
        </div>

        <div>
          <label className="label" htmlFor="location">{t('Location')}</label>
          <input id="location" className="input" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder={t('e.g. Kovilpatti, TN')} required />
        </div>

        <div>
          <label className="label">{t('Who is this donation for?')}</label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => update('audience', 'individual')} className={`rounded-md border px-3 py-2.5 text-sm font-medium ${form.audience === 'individual' ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
              {t('Individual recipients')}
            </button>
            <button type="button" onClick={() => update('audience', 'center')} className={`rounded-md border px-3 py-2.5 text-sm font-medium ${form.audience === 'center' ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
              {t('Recipient centers')}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink/45">
            {form.audience === 'individual'
              ? t('Open for any individual recipient to claim. Registered centers (orphanages, old-age homes, NGOs) cannot claim this.')
              : t('Only registered recipient centers can claim this — not individual recipients.')}
          </p>
        </div>

        {form.audience === 'center' && (
          <div>
            <label className="label">{t('Which centers?')}</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => update('centerScope', 'specific')} className={`rounded-md border px-3 py-2.5 text-sm font-medium ${form.centerScope === 'specific' ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
                {t('One specific center')}
              </button>
              <button type="button" onClick={() => update('centerScope', 'open')} className={`rounded-md border px-3 py-2.5 text-sm font-medium ${form.centerScope === 'open' ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/70 hover:border-ink/40'}`}>
                {t('Open to any center')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ink/45">
              {form.centerScope === 'specific'
                ? t("You choose the exact institution below. It shows up in their Incoming Donations right away — they don't need to request it.")
                : t('Any admin-verified center can see and claim this, first come first served — same as an individual claiming a resource.')}
            </p>
          </div>
        )}

        {form.audience === 'center' && form.centerScope === 'specific' && (
          <div>
            <label className="label" htmlFor="center">{t('Registered center')}</label>
            <select id="center" className="input" value={form.centerId} onChange={(e) => update('centerId', e.target.value)} required>
              {approvedCenters.length === 0 && <option value="">{t('No verified centers yet')}</option>}
              {approvedCenters.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.centerType}) — {c.location}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <input id="bundle" type="checkbox" checked={form.isBundle} onChange={(e) => update('isBundle', e.target.checked)} className="h-4 w-4 rounded border-ink/30" />
          <label htmlFor="bundle" className="text-sm text-ink/70">{t('This is a multi-item bundle (posted & claimed as one unit)')}</label>
        </div>
        {form.isBundle && (
          <div>
            <label className="label" htmlFor="bundleItems">{t('Bundle contents (comma-separated)')}</label>
            <input id="bundleItems" className="input" value={form.bundleItems} onChange={(e) => update('bundleItems', e.target.value)} placeholder={t('e.g. Science textbook, Maths textbook, Notebooks')} />
          </div>
        )}

        {error && (
          <p className="flex items-start gap-1.5 rounded-md border border-clay/30 bg-clay/10 px-3 py-2.5 text-sm text-clay">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {t(error)}
          </p>
        )}
        <button type="submit" disabled={overCap} className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-50">{t('Post resource')}</button>
      </form>
    </DashboardLayout>
  )
}

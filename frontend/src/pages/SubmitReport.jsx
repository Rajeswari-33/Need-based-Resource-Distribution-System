import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { MessageSquareWarning, CheckCircle2, Info } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const CATEGORIES = [
  { value: 'item-mismatch', label: 'Item not as described', when: 'What you received (or were shown) doesn\'t match the listing — wrong condition, quantity, or item entirely.' },
  { value: 'no-show', label: 'Non-delivery / no-show', when: 'A donor, recipient, Setu field team employee, or center agreed to a handover and then went silent or didn\'t show up.' },
  { value: 'suspicious', label: 'Suspicious or fraudulent activity', when: 'A listing, request, or account looks fake, is being used to scam people, or is clearly misusing the platform.' },
  { value: 'conduct', label: 'Harassment or inappropriate conduct', when: 'Someone was rude, threatening, inappropriate, or made you uncomfortable during a handover or in messages.' },
  { value: 'decision', label: 'Disagree with an admin decision', when: 'Your claim, verification, or account action was rejected/restricted and you believe it was a mistake.' },
  { value: 'technical', label: 'Technical issue / bug', when: 'Something on the platform itself isn\'t working as expected.' },
  { value: 'other', label: 'Something else', when: 'Anything not covered above.' },
]

export default function SubmitReport() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { reports, addReport } = useData()
  const { showToast } = useToast()

  const [form, setForm] = useState({ category: CATEGORIES[0].value, subject: '', details: '', reference: '' })
  const [submitted, setSubmitted] = useState(false)

  const myReports = reports
    .filter((r) => r.reporterId === currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const selectedCategory = CATEGORIES.find((c) => c.value === form.category)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.details.trim()) return
    addReport({
      reporterId: currentUser.id,
      reporterRole: currentUser.role,
      category: selectedCategory.label,
      subject: form.subject.trim(),
      details: form.details.trim() + (form.reference.trim() ? `\n\nReference: ${form.reference.trim()}` : ''),
    })
    setSubmitted(true)
    showToast('Report submitted to the admin team.', 'success')
    setForm({ category: CATEGORIES[0].value, subject: '', details: '', reference: '' })
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><MessageSquareWarning size={22} className="text-clay" /> {t('Reports & disputes')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Raise something directly with the admin team — outside the normal claim/approval flow.')}</p>
      </div>

      {/* ---- When and why, spelled out up front so people aren't guessing whether this is
           the right tool for their situation. ---- */}
      <div className="mb-8 rounded-md border border-ink/10 bg-paper-dim p-5">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink/50"><Info size={13} /> {t('When should you use this?')}</p>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {CATEGORIES.filter((c) => c.value !== 'other').map((c) => (
            <li key={c.value} className="text-xs text-ink/60"><strong className="text-ink/80">{t(c.label)}:</strong> {t(c.when)}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink/45">
          <strong className="text-ink/60">{t('Why it matters:')}</strong> {t('reports go straight to an admin, separately from your regular notifications, so genuine disputes and misuse get looked at directly rather than getting lost. This isn\'t for routine things like a claim simply being rejected or an item already being taken — those are normal outcomes, not disputes.')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 p-5 lg:col-span-3">
          <div>
            <label className="label" htmlFor="category">{t('What kind of issue is this?')}</label>
            <select id="category" className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.label)}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-ink/45">{t(selectedCategory.when)}</p>
          </div>
          <div>
            <label className="label" htmlFor="subject">{t('Short summary')}</label>
            <input id="subject" className="input" value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder={t('e.g. Donor didn\'t hand over the item as agreed')} />
          </div>
          <div>
            <label className="label" htmlFor="details">{t('What happened?')}</label>
            <textarea id="details" className="input min-h-[110px]" value={form.details} onChange={(e) => update('details', e.target.value)} placeholder={t('Include dates, names, and anything else that helps admin understand the situation.')} />
          </div>
          <div>
            <label className="label" htmlFor="reference">{t('Related item, request, or task (optional)')}</label>
            <input id="reference" className="input" value={form.reference} onChange={(e) => update('reference', e.target.value)} placeholder={t('e.g. the item title, or a request/task ID if you have one')} />
          </div>
          <button type="submit" className="btn-accent w-full">{t('Submit to admin')}</button>
          {submitted && (
            <p className="flex items-center gap-1.5 text-xs text-banyan-dark"><CheckCircle2 size={13} /> {t('Submitted — you can track its status below.')}</p>
          )}
        </form>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Your reports')}</h2>
          {myReports.length === 0 ? (
            <EmptyState icon="🗂️" title={t('Nothing submitted yet')} description={t('Reports you raise will show up here with their status.')} />
          ) : (
            <div className="space-y-3">
              {myReports.map((r) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink/40">{r.category}</p>
                      <p className="mt-0.5 text-sm font-semibold text-ink">{r.subject}</p>
                    </div>
                    <StatusBadge status={r.status === 'resolved' ? 'completed' : 'pending'}>{t(r.status === 'resolved' ? 'Resolved' : 'Open')}</StatusBadge>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-xs text-ink/55">{r.details}</p>
                  {r.status === 'resolved' && r.resolution && (
                    <p className="mt-2 rounded-md bg-banyan/10 px-3 py-2 text-xs text-banyan-dark">{t('Admin response')}: {r.resolution}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

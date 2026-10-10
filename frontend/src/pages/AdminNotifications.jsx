import React, { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import { Megaphone } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'donor', label: 'Donors' },
  { value: 'recipient', label: 'Recipients' },
  { value: 'volunteer', label: 'Setu Field Team Employees' },
  { value: 'center', label: 'Center coordinators' },
]

export default function AdminNotifications() {
  const { t } = usePreferences()
  const { broadcast, notifications } = useData()
  const { showToast } = useToast()
  const [audience, setAudience] = useState('all')
  const [message, setMessage] = useState('')

  const sentBroadcasts = notifications.filter((n) => n.userId === '__broadcast__').slice(0, 8)

  function handleSend(e) {
    e.preventDefault()
    if (!message.trim()) return
    broadcast(message.trim(), audience)
    showToast('System notification sent.', 'success')
    setMessage('')
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Megaphone size={22} /> {t('System notifications')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Broadcast a message to everyone, or a specific role.')}</p>
      </div>

      <form onSubmit={handleSend} className="card mb-8 max-w-xl space-y-4 p-6">
        <div>
          <label className="label">{t('Audience')}</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${audience === a.value ? 'border-ink bg-ink text-paper' : 'border-ink/20 text-ink/60 hover:border-ink/40'}`}
              >
                {t(a.label)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="message">{t('Message')}</label>
          <textarea id="message" className="input min-h-[90px]" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('e.g. Scheduled maintenance this Sunday 2–4 AM.')} />
        </div>
        <button type="submit" className="btn-accent w-full">{t('Send notification')}</button>
      </form>

      <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Recently sent')}</h2>
      {sentBroadcasts.length === 0 ? (
        <p className="text-sm text-ink/50">{t('No broadcasts sent yet.')}</p>
      ) : (
        <div className="space-y-2">
          {sentBroadcasts.map((n) => (
            <div key={n.id} className="card px-4 py-3 text-sm text-ink/70">
              <span className="mr-2 rounded-full bg-paper-dim px-2 py-0.5 font-mono text-[10px] uppercase text-ink/45">{t(AUDIENCES.find((a) => a.value === n.role)?.label || n.role)}</span>
              {n.message}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

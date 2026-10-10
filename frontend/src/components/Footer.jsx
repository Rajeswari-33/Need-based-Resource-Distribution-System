import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Mail, ShieldCheck, Heart } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const COLUMNS = [
  {
    title: 'Give',
    links: [
      { to: '/register', label: 'Become a donor' },
      { to: '/centers', label: 'Find a recipient center' },
      { to: '/login', label: 'Manage my donations' },
    ],
  },
  {
    title: 'Receive',
    links: [
      { to: '/browse', label: 'Browse donations' },
      { to: '/register', label: 'Request support' },
      { to: '/login', label: 'Track my requests' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { to: '/register', label: 'Join as a volunteer' },
      { to: '/register', label: 'Register a recipient center' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/login', label: 'Reports & disputes' },
      { to: '/login', label: 'Notifications' },
      { to: '/login', label: 'Account verification help' },
    ],
  },
]

export default function Footer() {
  const year = new Date().getFullYear()
  const { t } = usePreferences()
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper/70">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-marigold text-ink">
                <ArrowRightLeft size={14} strokeWidth={2.5} />
              </span>
              <span className="font-display text-base font-semibold text-paper">Setu</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed">
              {t('A verified bridge between what you no longer need and someone who genuinely does — one honest, traceable handover at a time.')}
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-paper/50">
              <ShieldCheck size={14} className="text-banyan-light" /> {t('Every account is admin-verified before it can give, request, or deliver.')}
            </div>
            <a href="mailto:support@setu.org" className="mt-4 flex items-center gap-2 text-xs text-paper/50 hover:text-marigold">
              <Mail size={13} /> support@setu.org
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-paper/40">{t(col.title)}</h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}><Link to={l.to} className="text-paper/70 transition-colors hover:text-marigold">{t(l.label)}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-paper/40 sm:flex-row sm:px-6">
          <p>© {year} Setu — {t('Need-Based Resource Distribution System.')}</p>
          <p className="flex items-center gap-1.5">{t('Built with')} <Heart size={12} className="text-clay" fill="currentColor" /> {t('for community-driven giving.')}</p>
        </div>
      </div>
    </footer>
  )
}

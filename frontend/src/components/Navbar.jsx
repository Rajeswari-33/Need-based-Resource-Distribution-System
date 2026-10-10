import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { Menu, X, Bell, LogOut, ArrowRightLeft, LayoutDashboard, Mail, Sun, Moon, Languages, Palette } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

const DASHBOARD_HOME = {
  donor: '/donor',
  recipient: '/browse',
  volunteer: '/volunteer',
  center: '/center',
  admin: '/admin',
}

const PUBLIC_LINKS = [
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/#contact', label: 'Contact' },
]

function linkClasses({ isActive }) {
  return `text-sm font-medium transition-colors ${isActive ? 'text-ink' : 'text-ink/55 hover:text-ink'}`
}

export default function Navbar() {
  const { currentUser, logout } = useAuth()
  const { notificationsFor } = useData()
  const { showToast } = useToast()
  const { language, setLanguage, theme, setTheme, accentColor, setAccentColor, t } = usePreferences()
  const [open, setOpen] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const navigate = useNavigate()

  // Keep the bell badge in sync with what the Notifications page actually shows: for
  // operational roles that's admin announcements only (item-level updates now live next to
  // each item instead), for admin it's their full inbox.
  const unreadCount = currentUser
    ? notificationsFor(currentUser).filter((n) => !n.read && (currentUser.role === 'admin' || n.userId === '__broadcast__')).length
    : 0

  function handleLogout() {
    logout()
    setOpen(false)
    setConfirmingLogout(false)
    showToast(t('You\'ve been logged out.'), 'info')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ink text-marigold">
            <ArrowRightLeft size={16} strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Setu</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {currentUser ? (
            <NavLink to={DASHBOARD_HOME[currentUser.role]} className={linkClasses}>
              <span className="flex items-center gap-1.5"><LayoutDashboard size={14} /> {t('Dashboard')}</span>
            </NavLink>
          ) : (
            PUBLIC_LINKS.map((l) => (
              <a key={l.to} href={l.to} className="text-sm font-medium text-ink/55 transition-colors hover:text-ink">{t(l.label)}</a>
            ))
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {currentUser ? (
            <>
              <Link to="/messages" className="rounded-md p-2 text-ink/70 hover:bg-ink/5 hover:text-ink" aria-label={t('Messages')}>
                <Mail size={18} />
              </Link>
              <Link to="/notifications" aria-label={t('Notifications')} className="relative rounded-md p-2 text-ink/70 hover:bg-ink/5 hover:text-ink">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-ink/5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-banyan/15 font-mono text-xs font-semibold text-banyan-dark">
                  {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </span>
                <span className="text-sm font-medium">{currentUser.name.split(' ')[0]}</span>
              </Link>
              <button onClick={() => setConfirmingLogout(true)} className="btn-ghost" aria-label={t('Log out')}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">{t('Log in')}</Link>
              <Link to="/register" className="btn-accent">{t('Join Setu')}</Link>
            </>
          )}
          <label className="flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-2 text-ink/70" title={t('Language')}>
            <Languages size={15} />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              aria-label={t('Language')}
              className="w-[4.5rem] bg-transparent text-xs font-semibold text-ink outline-none"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-ink/10 px-2 text-ink/70" title={t('Choose any color')}>
            <Palette size={16} aria-hidden="true" />
            <input
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
              aria-label={t('Choose any color')}
              className="color-picker-swatch"
            />
          </label>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="btn-ghost h-9 w-9 px-0"
            aria-label={t(theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme')}
            title={t(theme === 'light' ? 'Dark theme' : 'Light theme')}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>

        <button className="p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label={t('Toggle menu')}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-ink/10 bg-paper px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {currentUser ? (
              <>
                <NavLink to={DASHBOARD_HOME[currentUser.role]} onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink/70">{t('Dashboard')}</NavLink>
                <NavLink to="/messages" onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink/60">{t('Messages')}</NavLink>
                <NavLink to="/notifications" onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink/60">
                  {t('Notifications')} {unreadCount > 0 && `(${unreadCount})`}
                </NavLink>
                <NavLink to="/profile" onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink/60">{t('Profile')}</NavLink>
              </>
            ) : (
              PUBLIC_LINKS.map((l) => (
                <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="rounded-md px-2 py-2.5 text-sm font-medium text-ink/60">{t(l.label)}</a>
              ))
            )}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <Languages size={16} />
              <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('Language')} className="bg-transparent font-medium text-ink">
                <option value="en">English</option>
                <option value="ta">தமிழ்</option>
              </select>
            </label>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="btn-ghost" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              {t(theme === 'light' ? 'Dark theme' : 'Light theme')}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-3 border-t border-ink/10 pt-3 text-sm text-ink/70">
            <Palette size={16} aria-hidden="true" />
            {t('Color')}
            <input
              type="color"
              value={accentColor}
              onChange={(event) => setAccentColor(event.target.value)}
              aria-label={t('Choose any color')}
              className="color-picker-swatch"
            />
          </label>
          <div className="mt-3 flex gap-2 border-t border-ink/10 pt-3">
            {currentUser ? (
              <button onClick={() => setConfirmingLogout(true)} className="btn-outline w-full">{t('Log out')}</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-outline w-full">{t('Log in')}</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-accent w-full">{t('Join Setu')}</Link>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title={t('Log out of Setu?')}
        description={t('You\'ll need to log in again to access your dashboard.')}
        confirmLabel={t('Log out')}
        tone="danger"
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </header>
  )
}

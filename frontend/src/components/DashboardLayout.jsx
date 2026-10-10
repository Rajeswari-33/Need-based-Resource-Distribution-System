import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'
import {
  LayoutGrid, PackagePlus, Package, ClipboardCheck, History, TrendingUp, Award,
  Search, ListChecks, UserCog, Truck, Building2, MapPinned, AlertCircle, BarChart3,
  ShieldCheck, Tags, Flag, MessageSquareWarning, Users, Megaphone, Menu, X, HandHeart, PackageCheck,
} from 'lucide-react'

const NAV = {
  donor: [
    { to: '/donor', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/donor/post', label: 'Post New Donation', icon: PackagePlus },
    { to: '/donor/donations', label: 'Manage Donations', icon: Package },
    { to: '/donor/requests', label: 'Approve / Reject Requests', icon: ClipboardCheck },
    { to: '/donor/history', label: 'Donation History', icon: History },
    { to: '/donor/impact', label: 'Impact Tracker', icon: TrendingUp },
    { to: '/donor/certificates', label: 'Certificates & Receipts', icon: Award },
    { to: '/reports', label: 'Reports & Disputes', icon: MessageSquareWarning },
  ],
  recipient: [
    { to: '/browse', label: 'Browse Donations', icon: Search },
    { to: '/recipient/request-resource', label: 'Request Resource', icon: HandHeart },
    { to: '/recipient/active', label: 'Active Requests', icon: ListChecks },
    { to: '/recipient/requests', label: 'Request History', icon: History },
    { to: '/recipient/received', label: 'Received Donations', icon: PackageCheck },
    { to: '/reports', label: 'Reports & Disputes', icon: MessageSquareWarning },
  ],
  volunteer: [
    { to: '/volunteer', label: 'Setu Field Team Tasks', icon: Truck, end: true },
    { to: '/volunteer/profile', label: 'Profile & Availability', icon: UserCog },
    { to: '/reports', label: 'Reports & Disputes', icon: MessageSquareWarning },
  ],
  center: [
    { to: '/center', label: 'Incoming Donations', icon: Package, end: true },
    { to: '/browse', label: 'Browse All Donations', icon: Search },
    { to: '/recipient/request-resource', label: 'Request Resource', icon: HandHeart },
    { to: '/recipient/active', label: 'Active Requests', icon: ListChecks },
    { to: '/recipient/requests', label: 'Request History', icon: History },
    { to: '/recipient/received', label: 'Received Donations', icon: PackageCheck },
    { to: '/center/profile', label: 'Center Profile', icon: Building2 },
    { to: '/center/urgent-needs', label: 'Urgent Needs', icon: AlertCircle },
    { to: '/center/statistics', label: 'Donation Statistics', icon: BarChart3 },
    { to: '/reports', label: 'Reports & Disputes', icon: MessageSquareWarning },
  ],
  admin: [
    { to: '/admin', label: 'Platform Overview', icon: BarChart3, end: true },
    { to: '/admin/centers', label: 'Verify Centers', icon: ShieldCheck },
    { to: '/admin/categories', label: 'Manage Categories', icon: Tags },
    { to: '/admin/moderation', label: 'Moderate Listings', icon: Flag },
    { to: '/admin/reports', label: 'Reports & Disputes', icon: MessageSquareWarning },
    { to: '/admin/users', label: 'Manage Users', icon: Users },
    { to: '/admin/notifications', label: 'System Notifications', icon: Megaphone },
  ],
}

export default function DashboardLayout({ children }) {
  const { currentUser } = useAuth()
  const { notifications } = useData()
  const { t } = usePreferences()
  const [open, setOpen] = useState(false)
  if (!currentUser) return children

  const items = NAV[currentUser.role] || []
  const flaggedForAdmin = currentUser.role === 'admin'

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
      <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper shadow-card md:hidden">
        <Menu size={18} />
      </button>

      <aside className={`fixed inset-0 z-40 flex md:relative md:z-auto ${open ? '' : 'pointer-events-none md:pointer-events-auto'}`}>
        <div
          className={`absolute inset-0 bg-ink/40 transition-opacity md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          onClick={() => setOpen(false)}
        />
        <nav
          className={`relative z-10 flex h-full w-64 shrink-0 flex-col gap-1 border-r border-ink/10 bg-paper p-3 transition-transform md:h-fit md:translate-x-0 md:rounded-lg md:border md:p-3 md:shadow-card ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          <div className="mb-2 flex items-center justify-between px-2 py-1.5 md:hidden">
            <span className="text-xs font-semibold uppercase tracking-widest text-ink/45">{t('Menu')}</span>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
          <p className="mb-1 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-ink/40">
            {t(currentUser.role === 'center' ? 'Center Coordinator' : currentUser.role === 'volunteer' ? 'Setu Field Team Employee' : currentUser.role)} {t('menu')}
          </p>
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-ink text-paper' : 'text-ink/65 hover:bg-ink/5'}`}
            >
              <Icon size={16} className="shrink-0" /> <span>{t(label)}</span>
              {label === 'Reports & Disputes' && flaggedForAdmin && (
                <span className="ml-auto rounded-full bg-clay/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-clay">
                  {notifications.filter((n) => n.userId === 'u-admin-1' && !n.read).length || ''}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from './DashboardLayout.jsx'
import { ShieldAlert, Clock3, XCircle, FileText, Lock } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

// Blocks access to an entire role dashboard until the account is admin-verified — used for
// donor, volunteer, and center routes. Unlike the recipient flow (where browsing stays open
// and only the final claim step is gated), these roles get no access to their dashboard at
// all until verified. Submitting the ID document itself still happens on /profile (or, for
// centers, /center/profile), which this gate does not wrap.
const STATUS_COPY = {
  pending: { Icon: Clock3, wrapClass: 'bg-marigold/10 text-marigold-dark', title: 'Verification pending' },
  rejected: { Icon: XCircle, wrapClass: 'bg-clay/10 text-clay', title: 'Verification rejected' },
  unverified: { Icon: ShieldAlert, wrapClass: 'bg-marigold/10 text-marigold-dark', title: 'Verify your account to continue' },
}

function BlockedScreen({ status, title, body, linkTo, linkLabel, extra }) {
  const { t } = usePreferences()
  const { Icon, wrapClass } = STATUS_COPY[status] || STATUS_COPY.unverified
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-lg py-20 text-center">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${wrapClass}`}>
          <Icon size={26} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-ink">{t(title)}</h1>
        <p className="mt-2 text-sm text-ink/60">{t(body)}</p>
        {extra}
        <Link to={linkTo} className="btn-accent mt-6 inline-flex">{t(linkLabel)}</Link>
      </div>
    </DashboardLayout>
  )
}

export default function VerificationGate({ children, roleLabel }) {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { centers } = useData()
  if (!currentUser) return children

  // Centers go through two sequential, mandatory steps — both required for system access.
  if (currentUser.role === 'center') {
    const center = centers.find((c) => c.id === currentUser.centerId)
    const centerStatus = center?.verificationStatus || (center?.approved ? 'verified' : 'unverified')
    const coordStatus = currentUser.verificationStatus || (currentUser.verified ? 'verified' : 'unverified')
    if (centerStatus === 'verified' && coordStatus === 'verified') return children

    // Step 1 not done yet — coordinator can't even see step 2.
    if (centerStatus !== 'verified') {
      const body = centerStatus === 'pending'
        ? `${center?.name || 'Your institution'}'s registration document is submitted and awaiting admin review. Step 2 (your own verification) unlocks once this is approved.`
        : centerStatus === 'rejected'
        ? `${center?.name || 'Your institution'}'s last submission was rejected${center?.verificationNote ? `: "${center.verificationNote}"` : '.'} Please resubmit from Center Profile.`
        : `Step 1 of 2: submit ${center?.name || 'your institution'}'s registration document before anything else is unlocked.`
      return (
        <BlockedScreen
          status={centerStatus === 'pending' ? 'pending' : centerStatus === 'rejected' ? 'rejected' : 'unverified'}
          title={t('Step 1 of 2 — Institution verification')}
          body={body}
          linkTo="/center/profile"
          linkLabel="Go to Center Profile"
          extra={
            <div className="mt-5 flex items-center gap-2.5 rounded-md border border-ink/10 bg-paper-dim px-4 py-3 text-left text-xs text-ink/50">
              <Lock size={15} className="shrink-0" /> {t('Step 2 (coordinator verification) is locked until this step is approved.')}
            </div>
          }
        />
      )
    }

    // Step 1 done, step 2 pending/unverified/rejected.
    const body = coordStatus === 'pending'
      ? 'Your affiliation document is submitted and awaiting admin review.'
      : coordStatus === 'rejected'
      ? `Your last submission was rejected${currentUser.verificationNote ? `: "${currentUser.verificationNote}"` : '.'} Please resubmit from Center Profile.`
      : 'Step 1 is done — now submit proof that you personally are authorized to represent this institution.'
    return (
      <BlockedScreen
        status={coordStatus === 'pending' ? 'pending' : coordStatus === 'rejected' ? 'rejected' : 'unverified'}
        title={t('Step 2 of 2 — Coordinator verification')}
        body={body}
        linkTo="/center/profile"
        linkLabel="Go to Center Profile"
      />
    )
  }

  if (currentUser.verificationStatus === 'verified') return children

  const status = currentUser.verificationStatus || 'unverified'
  const body = status === 'pending'
    ? `Your ${currentUser.verificationDoc?.docType || 'ID document'} is submitted and waiting for admin review. You'll get full ${roleLabel} access as soon as it's approved.`
    : status === 'rejected'
    ? `Your last submission was rejected${currentUser.verificationNote ? `: "${currentUser.verificationNote}"` : '.'} Please resubmit a valid document.`
    : `As a ${roleLabel} on Setu, you need an admin-approved ID document before you can use the rest of the platform.`

  return (
    <BlockedScreen
      status={status}
      title={STATUS_COPY[status]?.title || STATUS_COPY.unverified.title}
      body={body}
      linkTo="/profile"
      linkLabel="Go to Profile"
      extra={
        <div className="mt-5 rounded-md border border-ink/10 p-4 text-left text-xs text-ink/60">
          <p className="mb-2 flex items-center gap-1.5 font-semibold text-ink/70"><FileText size={13} /> {t('How verification works')}</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>{t('Submit an ID document from your Profile page.')}</li>
            <li>{t('An admin reviews it — this shows as "Pending review" until then.')}</li>
            <li>{t('Approved unlocks full access; rejected shows a reason so you can resubmit.')}</li>
          </ol>
        </div>
      }
    />
  )
}

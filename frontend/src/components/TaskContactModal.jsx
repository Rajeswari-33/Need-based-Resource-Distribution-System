import React, { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { X, Phone, Mail, MapPin, User, ShieldCheck, PackageCheck, Truck, Layers } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import WhatsAppButton from './WhatsAppButton.jsx'
import { usePreferences } from '../context/PreferencesContext.jsx'

// Small contact card used for both the donor and the receiving party (recipient or
// center coordinator) inside the task modal.
function ContactCard({ role, person, extraLine }) {
  const { t } = usePreferences()
  if (!person) {
    return (
      <div className="rounded-md border border-dashed border-ink/15 p-3.5 text-xs text-ink/45">
        {t(role)}: {t('details unavailable.')}
      </div>
    )
  }
  const location = [person.address, person.city].filter(Boolean).join(', ')
  return (
    <div className="rounded-md border border-ink/10 bg-paper-dim p-3.5">
      <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
        {role}
      </p>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <User size={13} /> {person.name}
        {person.verified && <ShieldCheck size={13} className="text-banyan-dark" />}
      </p>
      {extraLine && <p className="mt-0.5 text-xs text-ink/55">{extraLine}</p>}
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 border-t border-ink/10 pt-2.5 text-xs">
        <dt className="flex items-center gap-1.5 text-ink/45"><Phone size={12} /> {t('Phone')}</dt>
        <dd className="flex items-center justify-between gap-1.5 break-words text-ink/75">
          <span>{person.phone || t('details unavailable.')}</span>
          {person.phone && (
            <WhatsAppButton
              phone={person.phone}
              message={`Hello ${person.name}, I am your assigned Setu delivery coordinator. Let's coordinate!`}
              label="WhatsApp"
              variant="compact"
              size="xs"
            />
          )}
        </dd>
        <dt className="flex items-center gap-1.5 text-ink/45"><Mail size={12} /> {t('Email')}</dt>
        <dd className="break-words text-ink/75">{person.email || t('details unavailable.')}</dd>
        <dt className="flex items-center gap-1.5 text-ink/45"><MapPin size={12} /> {t('Location')}</dt>
        <dd className="break-words text-ink/75">{location || t('details unavailable.')}</dd>
      </dl>
    </div>
  )
}

// task: the assignment being viewed. mode: 'accept' (unassigned — shows assignment button)
// or 'manage' (assigned to the current Setu platform employee — shows delivery actions).
export default function TaskContactModal({ task, mode, onAccept, onMarkDelivered, onSubmitVerification, onClose }) {
  const { resources, centers } = useData()
  const { t } = usePreferences()
  const [outcome, setOutcome] = useState('verified')
  const [report, setReport] = useState('')
  if (!task) return null

  const isFieldVerification = task.type === 'field-verification'
  const resource = task.resourceDetails || resources.find((r) => r.id === task.resourceId)
  const donor = task.donorContact || null
  const center = task.centerId
    ? centers.find((c) => c.id === task.centerId)
    : resource?.centerId ? centers.find((c) => c.id === resource.centerId) : null
  const recipient = task.recipientContact || null
  const recipientNeedsContactInfo = recipient && (!recipient.phone || (!recipient.address && !recipient.city))
  const donorNeedsContactInfo = donor && (!donor.phone || (!donor.address && !donor.city))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-paper-dim text-2xl">{resource?.photo || '📦'}</span>
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">{resource?.title || t(isFieldVerification ? 'Donation field verification' : 'Donation assignment')}</h2>
              <p className="text-xs text-ink/45">{t(isFieldVerification ? 'Field verification' : 'Pickup and delivery')} {t('assignment')} · <StatusBadge status={task.status} /></p>
              {resource?.isBundle && resource.bundleItems?.length > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50"><Layers size={12} /> {t('Bundle')}: {resource.bundleItems.map((item) => t(item)).join(', ')}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-ink/30 hover:text-ink/60" aria-label={t('Close')}><X size={18} /></button>
        </div>

        <div className="mb-4 rounded-md border border-banyan/20 bg-banyan/5 px-3.5 py-2.5 text-xs text-banyan-dark">
          {t('This assignment is carried out by a Setu platform employee as part of Setu’s field team.')}
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink/40">{t('Who\'s involved')}</p>
        {mode === 'accept' ? (
          <div className="rounded-md border border-ink/10 bg-paper-dim p-3.5 text-xs text-ink/60">
            {t('Participant phone numbers and addresses are shared with you after you accept this assignment.')}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ContactCard role={t('Donor')} person={donor} />
              <ContactCard role={t(center ? 'Center Coordinator' : 'Recipient')} person={recipient} extraLine={recipient?.centerName} />
            </div>
            {(donorNeedsContactInfo || recipientNeedsContactInfo) && (
              <p className="mt-3 rounded-md bg-marigold/10 px-3.5 py-2.5 text-xs text-marigold-dark">
                {t('Some participants have not added a phone number or location. Ask them to complete Contact details in Profile before arranging the visit.')}
              </p>
            )}
          </>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-md bg-marigold/10 px-3.5 py-2.5 text-xs text-marigold-dark">
          <Truck size={14} className="mt-0.5 shrink-0" />
          <span>{t('Route')}: <strong>{t(task.fromLabel || donor?.name || 'Donor')}</strong> → <strong>{t(task.toLabel || recipient?.centerName || recipient?.name || 'Recipient')}</strong></span>
        </div>

        {isFieldVerification && (
          <div className="mt-4 space-y-2 rounded-md border border-ink/10 bg-paper-dim p-3.5 text-xs text-ink/65">
            <p className="font-semibold text-ink">{t('Visit the recipient in person and:')}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('Meet the recipient and inspect their identity documents in person; do not record ID numbers in this report.')}</li>
              <li>{t('Confirm the stated requirement and intended beneficiary.')}</li>
              <li>{t('Assess whether the need appears genuine and describe your observations.')}</li>
            </ul>
            {task.verificationNeed && (
              <div className="border-t border-ink/10 pt-2">
                <p><strong>{t('Requested for')}:</strong> {t(task.verificationNeed.beneficiary)}</p>
                <p><strong>{t('Recipient\'s stated need')}:</strong> {t(task.verificationNeed.reason)}</p>
                <p><strong>{t('Quantity / urgency')}:</strong> {task.verificationNeed.quantity} · {t(task.verificationNeed.urgency)}</p>
              </div>
            )}
          </div>
        )}

        {isFieldVerification && task.status === 'completed' && (
          <div className="mt-4 rounded-md border border-ink/10 p-3.5 text-sm">
            <p className="font-semibold text-ink">
              {t('Outcome')}: {t(({
                verified: 'Verified',
                rejected: 'Rejected',
                needs_more_information: 'Needs More Information',
              })[task.verificationOutcome] || 'Report submitted')}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-xs text-ink/65">{task.verificationReport}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4">
          {mode === 'accept' && (
            <>
              <button onClick={onClose} className="btn-outline px-3.5 py-2 text-sm">{t('Cancel')}</button>
              <button onClick={onAccept} className="btn-accent px-3.5 py-2 text-sm">{t(isFieldVerification ? 'Take field visit assignment' : 'Take delivery assignment')}</button>
            </>
          )}
          {mode === 'manage' && isFieldVerification && task.status === 'accepted' && (
            <form
              className="w-full space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitVerification(outcome, report)
              }}
            >
              <label className="block">
                <span className="label">{t('Assessment result')}</span>
                <select className="input" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                  <option value="verified">{t('Verified')}</option>
                  <option value="rejected">{t('Rejected')}</option>
                  <option value="needs_more_information">{t('Needs More Information')}</option>
                </select>
              </label>
              <label className="block">
                <span className="label">{t('Verification report')}</span>
                <textarea
                  className="input min-h-28"
                  minLength={20}
                  maxLength={5000}
                  required
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  placeholder={t('Describe who you met, which identity documents you inspected (do not enter ID numbers), what you confirmed about the need, and your observations.')}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-outline px-3.5 py-2 text-sm">{t('Close')}</button>
                <button type="submit" className="btn-accent px-3.5 py-2 text-sm"><PackageCheck size={15} /> {t('Submit verification report')}</button>
              </div>
            </form>
          )}
          {mode === 'manage' && task.status === 'accepted' && !isFieldVerification && (
            <>
              <button onClick={onClose} className="btn-outline px-3.5 py-2 text-sm">{t('Close')}</button>
              {task.donorConfirmed ? (
                <button onClick={onMarkDelivered} className="btn-accent px-3.5 py-2 text-sm"><PackageCheck size={15} /> {t('Mark as delivered')}</button>
              ) : (
                <span className="self-center text-xs text-marigold-dark">{t('Waiting for the donor to confirm handoff to you as the assigned Setu employee.')}</span>
              )}
            </>
          )}
          {mode === 'manage' && task.status === 'delivered' && (
            <div className="flex w-full items-center justify-between gap-3 rounded-md bg-ink/5 px-3.5 py-2.5 text-xs text-ink/60">
              <span>{t(center ? 'Waiting for the center coordinator to confirm receipt — this is what verifies the delivery.' : 'Waiting for the recipient to confirm receipt — this is what verifies the delivery.')}</span>
              <button onClick={onClose} className="btn-outline shrink-0 px-3 py-1.5 text-xs">{t('Close')}</button>
            </div>
          )}
          {mode === 'manage' && task.status === 'completed' && !isFieldVerification && (
            <div className="flex w-full items-center justify-between gap-3 rounded-md bg-banyan/10 px-3.5 py-2.5 text-xs text-banyan-dark">
              <span>{t('Confirmed received. Assignment complete.')}</span>
              <button onClick={onClose} className="btn-outline shrink-0 px-3 py-1.5 text-xs">{t('Close')}</button>
            </div>
          )}
          {mode === 'manage' && task.status === 'completed' && isFieldVerification && (
            <button onClick={onClose} className="btn-outline px-3.5 py-2 text-sm">{t('Close')}</button>
          )}
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useState } from 'react'
import { Award, CheckCircle2, Download, Eye, ShieldCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

function formatDate(value, language, t) {
  if (!value) return t('Not recorded')
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('Not recorded')
  return date.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function Detail({ label, children }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-ink/45">{label}</dt>
      <dd className="mt-0.5 break-words text-xs text-ink/80">{children}</dd>
    </div>
  )
}

export default function DonationCertificate({
  resource,
  request,
  donor,
  recipient,
  deliveryVolunteer,
  deliveryTask,
  verificationTasks = [],
}) {
  const { language, t, itemName } = usePreferences()
  const certificateRef = useRef(null)
  const [pdfAction, setPdfAction] = useState('')
  const [pdfError, setPdfError] = useState('')
  if (!resource) return null

  const completionTime = request?.completedAt || deliveryTask?.confirmedAt || deliveryTask?.completedAt
  const deliveryMethod = request?.deliveryMode || (deliveryTask ? 'volunteer' : 'hand-to-hand')
  const requestValue = request?.value
  const resourceValue = resource.value
  const certificateId = request?.id || resource.id
  const verificationRecords = verificationTasks.map((task) => ({
    task,
    volunteerName: task.volunteer?.name || t('Assigned Setu field team employee'),
  }))

  async function createPdf(viewInBrowser) {
    if (pdfAction) return
    setPdfAction(viewInBrowser ? 'view' : 'download')
    setPdfError('')
    let pdfWindow = null
    try {
      if (!certificateRef.current) throw new Error(t('The donation certificate is not available to export.'))
      if (viewInBrowser) {
        pdfWindow = window.open('', '_blank')
        if (!pdfWindow) throw new Error(t('Allow pop-ups to view the certificate PDF.'))
        pdfWindow.document.title = t('Donation certificate')
        pdfWindow.document.body.textContent = t('Preparing certificate PDF…')
      }

      const { default: html2pdf } = await import('html2pdf.js')
      const blob = await html2pdf()
        .set({
          margin: 10,
          filename: `setu-donation-certificate-${certificateId}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            onclone: (clonedDocument) => {
              clonedDocument.documentElement.removeAttribute('data-custom-palette')
              const clonedCertificate = clonedDocument.querySelector('[data-pdf-certificate]')
              if (clonedCertificate) {
                clonedCertificate.style.position = 'relative'
                clonedCertificate.style.display = 'block'
                clonedCertificate.style.visibility = 'visible'
                clonedCertificate.style.opacity = '1'
                clonedCertificate.style.maxWidth = '100%'
                clonedCertificate.style.width = '100%'
                clonedCertificate.style.height = 'auto'
              }
            },
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(certificateRef.current)
        .outputPdf('blob')

      if (!blob.size) throw new Error(t('The generated certificate PDF is empty. Please try again.'))
      const pdfUrl = URL.createObjectURL(blob)
      if (viewInBrowser) {
        pdfWindow.location.href = pdfUrl
      } else {
        const link = document.createElement('a')
        link.href = pdfUrl
        link.download = `setu-donation-certificate-${certificateId}.pdf`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000)
    } catch (error) {
      console.error('Unable to generate the donation certificate PDF.', error)
      pdfWindow?.close()
      setPdfError(error.message || t('Unable to generate the certificate PDF. Please try again.'))
    } finally {
      setPdfAction('')
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => createPdf(true)} disabled={!!pdfAction} className="btn-outline px-3 py-1.5 text-xs disabled:cursor-wait disabled:opacity-60">
          <Eye size={14} /> {pdfAction === 'view' ? t('Preparing PDF…') : t('View PDF')}
        </button>
        <button type="button" onClick={() => createPdf(false)} disabled={!!pdfAction} className="btn-accent px-3 py-1.5 text-xs disabled:cursor-wait disabled:opacity-60">
          <Download size={14} /> {pdfAction === 'download' ? t('Preparing PDF…') : t('Download PDF')}
        </button>
      </div>
      {pdfError && <p role="alert" className="mb-2 text-xs text-clay">{pdfError}</p>}

      <article ref={certificateRef} data-pdf-certificate="true" aria-label={t('Completed donation certificate')} className="overflow-hidden rounded-xl border-2 border-banyan/25 bg-gradient-to-br from-banyan/5 via-paper to-marigold/5 shadow-card">
      <header className="flex items-center justify-between border-b border-dashed border-ink/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <Award size={17} className="text-banyan-dark" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/60">{t('Donation completion certificate')}</span>
        </div>
        <ShieldCheck size={15} className="text-banyan-dark" />
      </header>

      <div className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-banyan/10 text-2xl">{resource.photo || '📦'}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-semibold text-ink">{itemName(resource.title, resource.titleTamil)}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-banyan-dark">
              <CheckCircle2 size={13} /> {t('Donation completed')}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-5 gap-y-3 border-t border-ink/10 pt-3 sm:grid-cols-2">
          <Detail label={t('Certificate ID')}>{certificateId}</Detail>
          <Detail label={t('Donation ID')}>{resource.id}</Detail>
          <Detail label={t('Donor')}>{donor?.name}</Detail>
          <Detail label={t('Recipient')}>{recipient?.name}</Detail>
          <Detail label={t('Category')}>{t(resource.category)}</Detail>
          <Detail label={t('Condition')}>{t(resource.condition)}</Detail>
          <Detail label={t('Total quantity listed')}>{resource.quantity}</Detail>
          <Detail label={t('Quantity received')}>{request?.quantity ?? resource.quantity}</Detail>
          <Detail label={t('Estimated donation value')}>
            {resourceValue != null ? `₹${Number(resourceValue).toLocaleString('en-IN')}` : t('Not provided')}
          </Detail>
          {request && (
            <Detail label={t('Value of this donation')}>
              {requestValue != null ? `₹${Number(requestValue).toLocaleString('en-IN')}` : t('Not provided')}
            </Detail>
          )}
          <Detail label={t('Donation location')}>{resource.location}</Detail>
          <Detail label={t('Delivery method')}>{t(deliveryMethod === 'volunteer' ? 'Setu field team delivery' : 'Hand-to-hand')}</Detail>
          {request?.beneficiary && <Detail label={t('Beneficiary')}>{request.beneficiary}</Detail>}
          {request?.reason && <Detail label={t('Request reason')}>{request.reason}</Detail>}
          {request?.urgency && <Detail label={t('Urgency')}>{t(request.urgency)}</Detail>}
          {request?.isBundle && request.bundleItems?.length > 0 && (
            <Detail label={t('Bundle items')}>{request.bundleItems.join(', ')}</Detail>
          )}
        </dl>

        {resource.description && (
          <div className="border-t border-ink/10 pt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">{t('Donation description')}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/75">{resource.description}</p>
          </div>
        )}

        {(deliveryMethod === 'volunteer' || verificationRecords.length > 0) && (
          <div className="space-y-3 border-t border-ink/10 pt-3">
            {deliveryMethod === 'volunteer' && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">{t('Delivery volunteer')}</p>
                <p className="mt-1 text-xs text-ink/80">{deliveryVolunteer?.name || t('Assigned Setu field team employee')}</p>
              </div>
            )}
            {verificationRecords.map(({ task, volunteerName }) => (
              <div key={task.id}>
                <p className="text-[10px] font-medium uppercase tracking-wide text-ink/45">{t('Field verification volunteer')}</p>
                <p className="mt-1 text-xs text-ink/80">{volunteerName}</p>
                <p className="mt-1 text-xs text-ink/65">
                  {t('Verification outcome')}: {t({
                    verified: 'Verified',
                    rejected: 'Rejected',
                    needs_more_information: 'Needs More Information',
                  }[task.verificationOutcome] || task.status)}
                </p>
                {task.verificationReport && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/65">{task.verificationReport}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-ink/10 pt-3">
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink/45">{t('Donation timeline')}</h4>
          <dl className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            <Detail label={t('Donation posted')}>{formatDate(resource.createdAt, language, t)}</Detail>
            {request && <Detail label={t('Request submitted')}>{formatDate(request.createdAt, language, t)}</Detail>}
            {request?.approvedAt && <Detail label={t('Request approved')}>{formatDate(request.approvedAt, language, t)}</Detail>}
            {verificationRecords.map(({ task }) => (
              <React.Fragment key={task.id}>
                {task.acceptedAt && (
                  <Detail label={t('Verification volunteer accepted assignment')}>
                    {formatDate(task.acceptedAt, language, t)}
                  </Detail>
                )}
                <Detail label={t('Field verification completed')}>
                  {formatDate(task.completedAt || task.verificationSubmittedAt, language, t)}
                </Detail>
              </React.Fragment>
            ))}
            {deliveryMethod === 'volunteer' && deliveryTask?.acceptedAt && (
              <Detail label={t('Employee accepted assignment')}>{formatDate(deliveryTask.acceptedAt, language, t)}</Detail>
            )}
            {deliveryMethod === 'volunteer' && (
              <>
                <Detail label={t('Donor handoff to employee')}>{deliveryTask?.donorConfirmedAt ? formatDate(deliveryTask.donorConfirmedAt, language, t) : t('Not recorded')}</Detail>
                <Detail label={t('Employee marked delivered')}>{deliveryTask?.deliveredAt ? formatDate(deliveryTask.deliveredAt, language, t) : t('Not recorded')}</Detail>
                <Detail label={t('Recipient confirmed receipt')}>{deliveryTask?.confirmedAt ? formatDate(deliveryTask.confirmedAt, language, t) : t('Not recorded')}</Detail>
              </>
            )}
            {deliveryMethod !== 'volunteer' && (
              <>
                <Detail label={t('Donor confirmed handover')}>{request?.donorConfirmedAt ? formatDate(request.donorConfirmedAt, language, t) : t('Not recorded')}</Detail>
                <Detail label={t('Recipient confirmed receipt')}>{request?.recipientConfirmedAt ? formatDate(request.recipientConfirmedAt, language, t) : t('Not recorded')}</Detail>
              </>
            )}
            <Detail label={t('Completed on')}>{formatDate(completionTime, language, t)}</Detail>
          </dl>
        </div>
      </div>

      <footer className="border-t border-dashed border-ink/15 px-4 py-2 text-center font-mono text-[10px] text-ink/40">
        {t('Verified completion record')} · #{String(certificateId).toUpperCase()}
      </footer>
      </article>
    </div>
  )
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import TaskContactModal from '../components/TaskContactModal.jsx'
import ItemNotifications from '../components/ItemNotifications.jsx'
import { Truck, PackageCheck, Info, Layers } from 'lucide-react'
import { getGreeting } from '../utils/greeting.js'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function VolunteerDashboard() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { tasks, resources, acceptTask, markTaskDelivered, submitFieldVerification } = useData()
  const { showToast } = useToast()
  // { task, mode: 'accept' | 'manage' }
  const [viewing, setViewing] = useState(null)

  const volunteerTypes = currentUser.volunteerTypes?.length ? currentUser.volunteerTypes : ['verification', 'delivery']
  const openVerificationTasks = tasks.filter((task) => task.status === 'open' && task.type === 'field-verification')
  const openTasks = tasks.filter((task) => task.status === 'open' &&
    volunteerTypes.includes(task.type === 'field-verification' ? 'verification' : 'delivery'))
  const verificationOptInRequired = openVerificationTasks.length > 0 && !volunteerTypes.includes('verification')
  const myTasks = tasks.filter((t) => t.volunteerId === currentUser.id && t.status !== 'completed')
  const myCompleted = tasks.filter((t) => t.volunteerId === currentUser.id && t.status === 'completed')

  function taskResource(t) {
    return resources.find((r) => r.id === t.resourceId)
  }

  async function handleAcceptConfirmed() {
    const result = await acceptTask(viewing.task.id, currentUser.id)
    if (!result.ok) {
      showToast(result.error, 'error')
      return
    }
    showToast('Assignment accepted — it now shows under My Tasks.', 'success')
    setViewing(null)
  }

  function handleMarkDelivered() {
    const result = markTaskDelivered(viewing.task.id)
    showToast(result.ok ? 'Marked as delivered. The recipient / center coordinator will confirm receipt.' : result.error, result.ok ? 'success' : 'error')
    if (result.ok) setViewing(null)
  }

  function handleSubmitVerification(outcome, report) {
    const result = submitFieldVerification(viewing.task.id, outcome, report)
    showToast(result.ok ? 'Verification report submitted to the donor.' : result.error, result.ok ? 'success' : 'error')
    if (result.ok) setViewing(null)
  }

  // Re-read the live task each render so the modal reflects status changes made elsewhere.
  const liveViewingTask = viewing ? tasks.find((t) => t.id === viewing.task.id) : null

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t(getGreeting())}, {currentUser.name.split(' ')[0]}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('You are a Setu platform employee. Complete field verification and delivery assignments on behalf of Setu based on your selected service areas.')}</p>
      </div>

      <div className="mb-6 flex items-start gap-2.5 rounded-md border border-ink/10 bg-paper-dim px-4 py-3 text-xs text-ink/60">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>
          {t('As a Setu field team employee, you handle assigned delivery and field verification on the platform’s behalf. Delivery requires donor handoff, your delivery confirmation, and recipient or center receipt confirmation. Verification requires an in-person review and a written report for the donor.')}
        </span>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><Truck size={15} /> {t('Open Setu team assignments')}</h2>
          {openTasks.length === 0 ? (
            verificationOptInRequired ? (
              <div className="card space-y-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{t('Field verification tasks are available')}</p>
                  <p className="mt-1 text-sm text-ink/55">
                    {t('Enable Field verification in your Profile & Availability settings to view and accept these assignments.')}
                  </p>
                </div>
                {openVerificationTasks.map((taskItem) => {
                  const res = taskResource(taskItem)
                  return (
                    <div key={taskItem.id} className="rounded-md border border-ink/10 bg-paper-dim p-3">
                      <p className="text-sm font-semibold text-ink">{t(res?.title || 'Donation field verification')}</p>
                      <p className="mt-1 text-xs text-ink/55">
                        {t(taskItem.verificationNeed?.reason || 'Visit the recipient to verify identity and need.')}
                      </p>
                    </div>
                  )
                })}
                <Link to="/volunteer/profile" className="btn-accent inline-flex w-fit px-3 py-1.5 text-xs">
                  {t('Enable field verification')}
                </Link>
              </div>
            ) : (
              <EmptyState icon="🚚" title={t('No open tasks right now')} description={t('Check back soon — new pickup and delivery tasks appear here.')} />
            )
          ) : (
            <div className="space-y-3">
              {openTasks.map((taskItem) => {
                const res = taskItem.resourceDetails || taskResource(taskItem)
                return (
                  <div key={taskItem.id} className="card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-paper-dim text-2xl">{res?.photo || '📦'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-ink">{t(res?.title || taskItem.title || (taskItem.type === 'field-verification' ? 'Donation field verification' : 'Donation assignment'))}</p>
                            <span className="rounded-full bg-banyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-banyan-dark">
                              {t(taskItem.type === 'field-verification' ? 'Field verification visit' : 'Pickup and delivery')}
                            </span>
                          </div>
                          <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">
                            <div>
                              <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Donor')}</dt>
                              <dd className="mt-0.5 text-ink/70">{taskItem.fromLabel || 'Donor'}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Recipient')}</dt>
                              <dd className="mt-0.5 text-ink/70">{taskItem.toLabel || 'Recipient'}</dd>
                            </div>
                            <div>
                              <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Location')}</dt>
                              <dd className="mt-0.5 text-ink/70">{taskItem.type === 'field-verification'
                                ? t('Shared after accepting the assignment')
                                : res?.location || t('Shared after accepting the assignment')}</dd>
                            </div>
                            {taskItem.type === 'field-verification' && (
                              <>
                                <div>
                                  <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Recipient\'s stated need')}</dt>
                                  <dd className="mt-0.5 text-ink/70">{t(taskItem.verificationNeed?.reason || 'Visit the recipient to verify identity and need.')}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Requested for')}</dt>
                                  <dd className="mt-0.5 text-ink/70">{t(taskItem.verificationNeed?.beneficiary || 'Not specified')}</dd>
                                </div>
                                <div>
                                  <dt className="font-semibold uppercase tracking-wide text-ink/40">{t('Quantity / urgency')}</dt>
                                  <dd className="mt-0.5 text-ink/70">{taskItem.verificationNeed?.quantity || '—'} · {t(taskItem.verificationNeed?.urgency || 'Not specified')}</dd>
                                </div>
                              </>
                            )}
                          </dl>
                          {res?.isBundle && res.bundleItems?.length > 0 && (
                            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/50"><Layers size={11} /> {t('Bundle')}: {res.bundleItems.map((item) => t(item)).join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setViewing({ task: taskItem, mode: 'accept' })} className="btn-accent shrink-0 px-3 py-1.5 text-xs">{t('Take assignment')}</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-ink"><PackageCheck size={15} /> {t('My tasks')}</h2>
          {myTasks.length === 0 ? (
            <p className="text-sm text-ink/50">{t('You haven\'t accepted any tasks yet.')}</p>
          ) : (
            <div className="space-y-3">
              {myTasks.map((taskItem) => {
                const res = taskItem.resourceDetails || taskResource(taskItem)
                return (
                  <div key={taskItem.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-paper-dim text-2xl">{res?.photo || '📦'}</span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{t(res?.title || taskItem.title || (taskItem.type === 'field-verification' ? 'Donation field verification' : 'Donation assignment'))}</p>
                          <p className="text-xs text-ink/45">{taskItem.fromLabel} → {taskItem.toLabel}</p>
                          {res?.isBundle && res.bundleItems?.length > 0 && (
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50"><Layers size={11} /> Bundle: {res.bundleItems.join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={taskItem.status}>{taskItem.status === 'completed' && taskItem.verificationOutcome
                          ? t(({ verified: 'Verified', rejected: 'Rejected', needs_more_information: 'Needs More Information' })[taskItem.verificationOutcome])
                          : undefined}</StatusBadge>
                        <button onClick={() => setViewing({ task: taskItem, mode: 'manage' })} className="btn-outline px-3 py-1.5 text-xs">
                          {t(taskItem.type === 'field-verification' && taskItem.status === 'accepted'
                            ? 'Visit details & submit report'
                            : taskItem.type !== 'field-verification' && taskItem.status === 'accepted'
                              ? taskItem.donorConfirmed ? 'View details & mark delivered' : 'Waiting for donor handoff'
                              : 'View status')}
                        </button>
                      </div>
                    </div>
                    <ItemNotifications type={taskItem.requestId ? 'request' : 'task'} id={taskItem.requestId || taskItem.id} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {myCompleted.length > 0 && (
          <div>
            <h2 className="mb-3 font-display text-sm font-semibold text-ink">{t('Recently completed')}</h2>
            <div className="space-y-2">
              {myCompleted.slice(0, 5).map((taskItem) => {
                const res = taskItem.resourceDetails || taskResource(taskItem)
                return (
                  <div key={taskItem.id} className="rounded-md bg-paper-dim px-3.5 py-2.5 text-sm text-ink/60">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{res?.photo || '📦'}</span>
                        {t(res?.title || taskItem.title || (taskItem.type === 'field-verification' ? 'Donation field verification' : 'Donation assignment'))}
                      </span>
                      <span className="flex items-center gap-2">
                        {taskItem.type === 'field-verification' ? (
                          <span className="text-xs text-ink/55">{t(({ verified: 'Verified', rejected: 'Rejected', needs_more_information: 'Needs More Information' })[taskItem.verificationOutcome])}</span>
                        ) : (
                          <span className="text-xs text-ink/40">{t('Confirmed by donor and recipient/center')}</span>
                        )}
                        <StatusBadge status="completed">{t(taskItem.type === 'field-verification' ? 'Report submitted' : 'Verified complete')}</StatusBadge>
                      </span>
                    </div>
                    <ItemNotifications type={taskItem.requestId ? 'request' : 'task'} id={taskItem.requestId || taskItem.id} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {viewing && liveViewingTask && (
        <TaskContactModal
          task={liveViewingTask}
          mode={viewing.mode}
          onAccept={handleAcceptConfirmed}
          onMarkDelivered={handleMarkDelivered}
          onSubmitVerification={handleSubmitVerification}
          onClose={() => setViewing(null)}
        />
      )}
    </DashboardLayout>
  )
}

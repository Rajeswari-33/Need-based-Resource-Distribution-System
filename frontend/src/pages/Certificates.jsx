import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import DonationCertificate from '../components/DonationCertificate.jsx'
import { getImpactBadge, getNextImpactBadge } from '../utils/impact.js'
import { Medal } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function Certificates() {
  const { t } = usePreferences()
  const { currentUser } = useAuth()
  const { resources, requests, tasks, users } = useData()

  const completedRequests = requests
    .filter((request) => request.status === 'completed')
    .map((request) => ({
      request,
      resource: resources.find((resource) => resource.id === request.resourceId),
    }))
    .filter(({ request, resource }) =>
      resource && (request.donorId || resource.donorId) === currentUser.id,
    )
  const completedResourceIds = new Set(completedRequests.map(({ resource }) => resource.id))
  const completed = [
    ...completedRequests,
    ...resources
      .filter((resource) =>
        resource.donorId === currentUser.id &&
        resource.status === 'completed' &&
        !completedResourceIds.has(resource.id),
      )
      .map((resource) => ({ resource, request: null })),
  ].sort((a, b) => new Date(b.request?.completedAt || b.resource.createdAt) - new Date(a.request?.completedAt || a.resource.createdAt))

  const points = currentUser.impactPoints || 0
  const badge = getImpactBadge(points)
  const upcoming = getNextImpactBadge(points)

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Certificates & badges')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('A recognition badge for every completed donation — each is self-contained, meant to be viewed or screenshotted on its own.')}</p>
      </div>

      <div className="card mb-6 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-banyan/15 text-banyan-dark"><Medal size={20} /></span>
          <div>
            <p className="font-display text-base font-semibold text-ink">{badge ? `${t(badge.name)} ${t('Donor')}` : t('No badge yet')}</p>
            <p className="text-xs text-ink/50">{t(badge?.reward || 'Reach 5 impact points to unlock Bronze.')}</p>
          </div>
        </div>
        {upcoming && (
          <p className="mt-3 text-xs text-ink/45">
            {upcoming.minPoints - points} {t('more impact points to reach')} <strong>{t(upcoming.name)} {t('Donor')}</strong> — {t(upcoming.reward)}
          </p>
        )}
      </div>

      {completed.length === 0 ? (
        <EmptyState icon="🏅" title={t('No certificates yet')} description={t('Complete your first donation to earn an impact badge.')} />
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {completed.map(({ resource, request }) => {
            const recipient = request ? users.find((u) => u.id === request.recipientId) : null
            const deliveryTask = request && tasks.find((task) =>
              task.type !== 'field-verification' &&
              (task.requestId === request.id || (task.resourceId === resource.id && task.recipientId === request.recipientId)),
            )
            const deliveryVolunteer = deliveryTask?.volunteerId
              ? users.find((user) => user.id === deliveryTask.volunteerId)
              : null
            const verificationTasks = request
              ? tasks
                .filter((task) => task.requestId === request.id && task.type === 'field-verification')
                .map((task) => ({
                  ...task,
                  volunteer: users.find((user) => user.id === task.volunteerId),
                }))
              : []
            return (
              <DonationCertificate
                key={request?.id || resource.id}
                resource={resource}
                request={request}
                donor={currentUser}
                recipient={recipient}
                deliveryVolunteer={deliveryVolunteer}
                deliveryTask={deliveryTask}
                verificationTasks={verificationTasks}
              />
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

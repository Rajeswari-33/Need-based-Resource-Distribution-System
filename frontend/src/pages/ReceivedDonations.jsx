import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import RequestCard from '../components/RequestCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import DonationCertificate from '../components/DonationCertificate.jsx'
import { RatingForm } from '../components/RequestActions.jsx'
import { User, IndianRupee, Calendar } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function ReceivedDonations() {
  const { language, t } = usePreferences()
  const { currentUser } = useAuth()
  const { requests, resources, users, tasks, addRating } = useData()

  const received = requests
    .filter((r) => r.recipientId === currentUser.id && r.status === 'completed')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Received donations')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Your full receiving history — who each item came from, when, and its value.')}</p>
      </div>

      {received.length === 0 ? (
        <EmptyState icon="📦" title={t('Nothing received yet')} description={t('Once a claim or request is confirmed complete, it\'ll show up here.')} action={<Link to="/browse" className="btn-accent">{t('Browse resources')}</Link>} />
      ) : (
        <div className="space-y-4">
          {received.map((req) => {
            const resource = resources.find((r) => r.id === req.resourceId)
            const donor = resource ? users.find((u) => u.id === resource.donorId) : null
            const deliveryTask = resource && tasks.find((task) =>
              task.type !== 'field-verification' &&
              (task.requestId === req.id || (task.resourceId === resource.id && task.recipientId === req.recipientId)),
            )
            const deliveryVolunteer = deliveryTask?.volunteerId
              ? users.find((user) => user.id === deliveryTask.volunteerId)
              : null
            const verificationTasks = tasks
              .filter((task) => task.requestId === req.id && task.type === 'field-verification')
              .map((task) => ({
                ...task,
                volunteer: users.find((user) => user.id === task.volunteerId),
              }))
            return (
              <RequestCard
                key={req.id}
                request={req}
                resource={resource}
                extra={
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md bg-paper-dim px-3.5 py-2.5 text-xs text-ink/60">
                      <span className="flex items-center gap-1.5"><User size={12} /> {t('From')} {donor?.name || t('a donor')}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(req.createdAt).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {!!req.value && <span className="flex items-center gap-1"><IndianRupee size={12} /> {req.value.toLocaleString('en-IN')}</span>}
                    </div>
                    <div className="mt-4">
                      <DonationCertificate
                        resource={resource}
                        request={req}
                        donor={donor}
                        recipient={currentUser}
                        deliveryVolunteer={deliveryVolunteer}
                        deliveryTask={deliveryTask}
                        verificationTasks={verificationTasks}
                      />
                    </div>
                  </>
                }
              >
                <RatingForm request={req} onSubmit={(rating, note) => addRating(req.id, rating, note)} />
              </RequestCard>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}

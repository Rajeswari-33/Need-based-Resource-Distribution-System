import { sendExternalNotification } from './notificationService.js'
import { id, now } from './utils.js'

export async function deliverSystemNotifications(db, notifications, subject = 'Setu Donation Notification') {
  const recipients = new Map()
  const personalNotifications = notifications.filter((record) =>
    record.userId !== '__broadcast__' && record.userId &&
    typeof record.message === 'string' && record.message.trim(),
  )

  if (personalNotifications.length) {
    const users = await db.collection('users')
      .find({ id: { $in: [...new Set(personalNotifications.map((record) => record.userId))] } })
      .toArray()
    users.forEach((user) => recipients.set(user.id, user))
  }

  const broadcasts = notifications.filter((record) =>
    record.userId === '__broadcast__' &&
    typeof record.message === 'string' && record.message.trim(),
  )
  for (const broadcast of broadcasts) {
    const query = broadcast.role && broadcast.role !== 'all'
      ? { role: broadcast.role }
      : {}
    const users = await db.collection('users').find(query).toArray()
    users.forEach((user) => {
      recipients.set(`${broadcast.id}:${user.id}`, {
        user,
        message: broadcast.message,
        notificationId: broadcast.id,
      })
    })
  }

  const deliveries = [
    ...personalNotifications.map((record) => {
      const user = recipients.get(record.userId)
      return user
        ? { user, message: record.message, notificationId: record.id }
        : null
    }),
    ...[...recipients.values()].filter((entry) => entry.user),
  ].filter(Boolean)

  const uniqueDeliveries = new Map()
  for (const delivery of deliveries) {
    uniqueDeliveries.set(`${delivery.notificationId}:${delivery.user.id}`, delivery)
  }
  const results = await Promise.allSettled([...uniqueDeliveries.values()].map(({ user, message }) =>
    sendExternalNotification({ user, subject, message }),
  ))
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('System notification delivery failed unexpectedly:', result.reason?.message || result.reason)
    }
  })
}

export async function notifyDonationParticipants(db, {
  notifications,
  relatedType,
  relatedId,
  subject = 'Setu Donation Notification',
}) {
  const uniqueNotifications = new Map()
  for (const notification of notifications) {
    if (notification?.userId && typeof notification.message === 'string' && notification.message.trim()) {
      uniqueNotifications.set(notification.userId, notification)
    }
  }
  if (uniqueNotifications.size === 0) return

  const createdAt = now()
  const records = [...uniqueNotifications.values()].map((notification) => ({
    id: id('n'),
    userId: notification.userId,
    message: notification.message,
    link: notification.link || null,
    read: false,
    relatedType,
    relatedId,
    createdAt,
  }))
  await db.collection('notifications').insertMany(records)

  await deliverSystemNotifications(db, records, subject)
}

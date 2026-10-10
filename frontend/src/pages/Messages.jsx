import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Send, Trash2, X, Search, MessageSquarePlus, ShieldCheck } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

function initialsOf(name) {
  return (name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export default function Messages() {
  const { currentUser, users } = useAuth()
  const { language, t } = usePreferences()
  const {
    conversationsFor, messagesBetween, sendMessage, deleteMessage, deleteConversation,
    notificationsForItem, markNotificationRead,
  } = useData()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeId, setActiveId] = useState(searchParams.get('with') || null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [deletingMessage, setDeletingMessage] = useState(null)
  const [deletingConvo, setDeletingConvo] = useState(false)

  const conversations = conversationsFor(currentUser.id)
  const otherUsers = users.filter((u) => u.id !== currentUser.id)
  const filteredOthers = otherUsers.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))

  const activeUser = activeId ? users.find((u) => u.id === activeId) : null
  const thread = activeId ? messagesBetween(currentUser.id, activeId) : []

  // Unread count PER conversation — kept next to that specific person's row instead of just
  // one lump "you have unread messages" signal, same reasoning as ItemNotifications elsewhere.
  function unreadCountFor(otherId) {
    return notificationsForItem(currentUser, 'message', otherId).filter((n) => !n.read).length
  }

  function openConversation(userId) {
    setActiveId(userId)
    setComposerOpen(false)
    setSearchParams({ with: userId })
    // Clear this conversation's unread badge — the messages themselves are now visible.
    notificationsForItem(currentUser, 'message', userId).forEach((n) => !n.read && markNotificationRead(n.id))
  }

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !activeId) return
    sendMessage(currentUser.id, activeId, draft.trim())
    setDraft('')
  }

  function handleDeleteMessage() {
    deleteMessage(deletingMessage.id, currentUser.id)
    setDeletingMessage(null)
  }

  function handleDeleteConvo() {
    deleteConversation(currentUser.id, activeId)
    setDeletingConvo(false)
    setActiveId(null)
    setSearchParams({})
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Messages')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('Message any donor, recipient, Setu field team employee, center coordinator, or admin directly.')}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <div className={`${activeId || composerOpen ? 'hidden md:block' : ''}`}>
          <button onClick={() => { setComposerOpen(true); setActiveId(null) }} className="btn-accent mb-3 w-full text-sm"><MessageSquarePlus size={15} /> {t('New message')}</button>
          {conversations.length === 0 ? (
            <p className="px-1 text-sm text-ink/45">{t('No conversations yet.')}</p>
          ) : (
            <div className="space-y-1">
              {conversations.map(({ otherId, lastMessage }) => {
                const other = users.find((u) => u.id === otherId)
                const mine = lastMessage.fromId === currentUser.id
                const unread = unreadCountFor(otherId)
                return (
                  <button
                    key={otherId}
                    onClick={() => openConversation(otherId)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-ink/5 ${activeId === otherId ? 'bg-ink/5' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-banyan/15 font-mono text-xs font-semibold text-banyan-dark">
                      {other ? initialsOf(other.name) : '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`truncate text-sm ${unread > 0 ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{other ? other.name : 'Deleted account'}</span>
                          {other?.role === 'admin' && <ShieldCheck size={12} className="shrink-0 text-banyan-dark" />}
                        </span>
                        {unread > 0 && <span className="shrink-0 rounded-full bg-marigold px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
                      </span>
                      <span className="block truncate text-xs text-ink/50">{mine ? `${t('You')}: ` : ''}{lastMessage.body}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {composerOpen ? (
          <div className="card flex h-[520px] flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-ink">{t('New message')}</h2>
              <button onClick={() => setComposerOpen(false)} className="rounded-md p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"><X size={16} /></button>
            </div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
              <input className="input pl-9 text-sm" placeholder={t('Search people or admin…')} value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {filteredOthers.length === 0 ? (
                <p className="px-1 text-sm text-ink/45">{t(`No one matches "${search}".`)}</p>
              ) : filteredOthers.map((u) => (
                <button key={u.id} onClick={() => openConversation(u.id)} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-ink/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-banyan/15 font-mono text-xs font-semibold text-banyan-dark">{initialsOf(u.name)}</span>
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">{u.name} {u.role === 'admin' && <ShieldCheck size={12} className="text-banyan-dark" />}</span>
                    <span className="block text-xs capitalize text-ink/45">{t(u.role)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : !activeId ? (
          <div className="hidden md:block">
            <EmptyState icon="💬" title={t('Select a conversation')} description={t('Pick someone from the list, or start a new message.')} />
          </div>
        ) : (
          <div className="card flex h-[520px] flex-col">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <button onClick={() => { setActiveId(null); setSearchParams({}) }} className="rounded-md p-1 text-ink/40 hover:bg-ink/5 hover:text-ink md:hidden"><X size={16} /></button>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-banyan/15 font-mono text-xs font-semibold text-banyan-dark">{activeUser ? initialsOf(activeUser.name) : '?'}</span>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">{activeUser ? activeUser.name : t('Deleted account')} {activeUser?.role === 'admin' && <ShieldCheck size={12} className="text-banyan-dark" />}</p>
                  {activeUser && <p className="text-xs capitalize text-ink/45">{t(activeUser.role)}</p>}
                </div>
              </div>
              {thread.length > 0 && <button onClick={() => setDeletingConvo(true)} className="btn-outline px-2.5 py-1.5 text-xs"><Trash2 size={13} /> {t('Delete conversation')}</button>}
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              {thread.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink/40">{t('Say hello — no messages yet.')}</p>
              ) : thread.map((m) => {
                const mine = m.fromId === currentUser.id
                return (
                  <div key={m.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[75%] items-end gap-1.5 ${mine ? 'flex-row-reverse' : ''}`}>
                      <div className={`rounded-lg px-3.5 py-2 text-sm ${mine ? 'bg-ink text-paper' : 'bg-paper-dim text-ink'}`}>
                        {m.body}
                        <span className={`mt-1 block text-[10px] ${mine ? 'text-paper/50' : 'text-ink/40'}`}>{new Date(m.createdAt).toLocaleTimeString(language === 'ta' ? 'ta-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <button onClick={() => setDeletingMessage(m)} className="rounded-md p-1 text-ink/25 opacity-0 hover:bg-ink/5 hover:text-clay group-hover:opacity-100" aria-label={t('Delete message')}><Trash2 size={12} /></button>
                    </div>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink/10 p-3">
              <input className="input flex-1 text-sm" placeholder={t('Write a message…')} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <button type="submit" disabled={!draft.trim()} className="btn-accent px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /></button>
            </form>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingMessage}
        title={t('Delete this message?')}
        description={t('It\'s removed from your view only — the other person will still see their copy.')}
        confirmLabel={t('Delete')}
        tone="danger"
        onConfirm={handleDeleteMessage}
        onCancel={() => setDeletingMessage(null)}
      />
      <ConfirmDialog
        open={deletingConvo}
        title={t('Delete this conversation?')}
        description={t('It\'s removed from your inbox only — this doesn\'t delete it for the other person.')}
        confirmLabel={t('Delete conversation')}
        tone="danger"
        onConfirm={handleDeleteConvo}
        onCancel={() => setDeletingConvo(false)}
      />
    </DashboardLayout>
  )
}

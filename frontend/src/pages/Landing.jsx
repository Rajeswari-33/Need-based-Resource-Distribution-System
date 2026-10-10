import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { CATEGORY_ICON } from '../data/seed.js'
import { usePreferences } from '../context/PreferencesContext.jsx'
import { backendApi } from '../lib/api.js'
import {
  ArrowRight, ShieldCheck, Users, Truck, Building2, BadgeCheck, Sparkles,
  ChevronDown, Mail, Phone, MapPin, LockKeyhole, Trophy,
} from 'lucide-react'

const LIFECYCLE = [
  { n: '01', label: 'Donor posts a resource', detail: 'Title, category, condition, quantity, photo & location.' },
  { n: '02', label: 'Recipient or center selected', detail: 'Direct handoff, or drop-off at a registered center.' },
  { n: '03', label: 'Verification & request checks', detail: 'Mobile/email verified, request limits, high-value review.' },
  { n: '04', label: 'Donor approves / center confirms', detail: 'Admin reviews flagged or high-value requests.' },
  { n: '05', label: 'Setu field team support if needed', detail: 'Setu employees coordinate field verification, pickup, and delivery.' },
  { n: '06', label: 'Handover or receipt confirmed', detail: 'Both sides confirm the resource changed hands.' },
  { n: '07', label: 'History, ratings & certificates', detail: 'Impact tracker, thank-you notes, and receipts update.' },
]

const ROLES = [
  { icon: Users, title: 'Donors', body: 'Post clothes, books, electronics, furniture or toys — direct to a recipient or dropped at a center — and watch your impact add up.' },
  { icon: BadgeCheck, title: 'Recipients', body: 'Browse by category and locality, and request what you need with a short, honest explanation. No cost, no catch.' },
  { icon: Truck, title: 'Setu Field Team', body: 'Setu platform team members handle recipient field verification and donation pickup and delivery assignments.' },
  { icon: Building2, title: 'Center Coordinators', body: 'Run a registered drop-off point — manage intake, publish urgent needs, and confirm resources as they arrive.' },
  { icon: ShieldCheck, title: 'Admins', body: 'Keep the platform trustworthy — verify centers, review flagged activity, and resolve disputes.' },
]

const FAQS = [
  { q: 'What can I donate on Setu?', a: 'Clothes & textiles, books & stationery, electronics & gadgets, furniture & household items, and toys & children\'s items. Strictly no food, medicines, or cash donations are accepted on the platform.' },
  { q: 'Is Setu free to use?', a: 'Yes. Setu is a free community platform — donors give at no cost, and recipients never pay for a listed resource.' },
  { q: 'How does Setu prevent misuse of donations?', a: 'Recipients verify their mobile number and email, are capped at 3 active requests at a time, and high-value requests need supporting documentation reviewed by an admin. Unusual activity like repeated high-value requests or excessive cancellations is automatically flagged.' },
  { q: 'Do I need to meet the donor in person?', a: 'Not necessarily. You can arrange a direct handover, drop off or collect at a registered donation center, or request pickup and delivery by a Setu field team employee.' },
  { q: 'How do donation centers get listed?', a: 'A center coordinator registers the center\'s details, and it goes live once an admin verifies and approves it.' },
  { q: 'What happens after a donation is completed?', a: 'It\'s added to the donor\'s history and impact tracker, an impact certificate or receipt is generated, and the recipient can leave a rating and thank-you note.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold text-ink">{q}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="border-t border-ink/10 px-5 py-4 text-sm leading-relaxed text-ink/60">{a}</p>}
    </div>
  )
}

export default function Landing() {
  const { resources } = useData()
  const { t } = usePreferences()
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [leaderboardError, setLeaderboardError] = useState(false)

  useEffect(() => {
    let active = true
    backendApi.donorLeaderboard()
      .then(({ donors }) => {
        if (!active) return
        setLeaderboard(donors)
        setLeaderboardError(false)
      })
      .catch((error) => {
        console.error('Unable to load the public donor leaderboard.', error)
        if (active) setLeaderboardError(true)
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink/10 bg-paper">
        <div className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow"><Sparkles size={12} /> {t('Need-based, not first-come')}</span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              {t('A bridge between what you no longer need, and someone who genuinely does.')}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink/65">
              {t('Setu connects donors, recipients, registered donation centers, and its field team in one transparent, verified giving lifecycle — from the first post to confirmed delivery.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-accent">{t('Join Setu')} <ArrowRight size={16} /></Link>
              <Link to="/login" className="btn-outline">{t('Log in')}</Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-ink/45">
              <LockKeyhole size={13} /> {t('A free account keeps every donation traceable, honest, and safe.')}
            </p>
          </div>

          <div className="relative">
            <div className="card p-5">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-widest text-ink/45">{t('Live category snapshot')}</p>
              <ul className="space-y-3">
                {Object.entries(CATEGORY_ICON).map(([name, icon]) => {
                  const count = resources.filter((r) => r.category === name && r.status === 'available').length
                  return (
                    <li key={name} className="flex items-center justify-between rounded-md bg-paper-dim px-3 py-2.5">
                      <span className="flex items-center gap-2.5 text-sm font-medium text-ink/80">
                        <span className="text-lg">{icon}</span> {t(name)}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs font-semibold text-banyan-dark">{count} {t('open')}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-md border border-ink/10 bg-white px-4 py-2.5 shadow-card sm:flex sm:items-center sm:gap-2">
              <ShieldCheck size={16} className="text-banyan" />
              <span className="text-xs font-semibold text-ink/70">{t('Verified requests only')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Public donor leaderboard */}
      <section className="border-b border-ink/10 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow"><Trophy size={13} /> {t('Community recognition')}</span>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t('Donor leaderboard')}</h2>
              <p className="mt-2 text-sm text-ink/55">{t('Celebrating verified donors by completed donations.')}</p>
            </div>
            <Link to="/register" className="btn-outline">{t('Join the community')} <ArrowRight size={15} /></Link>
          </div>

          <div className="card overflow-hidden">
            {leaderboardLoading ? (
              <p className="px-5 py-8 text-center text-sm text-ink/55">{t('Loading donor leaderboard…')}</p>
            ) : leaderboardError ? (
              <p role="status" className="px-5 py-8 text-center text-sm text-clay">
                {t('Unable to load the donor leaderboard. Please try again later.')}
              </p>
            ) : leaderboard.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink/55">{t('No completed donations yet. Be the first to make an impact.')}</p>
            ) : (
              <ol aria-label={t('Top donors')} className="divide-y divide-ink/10">
                {leaderboard.map((donor, index) => (
                  <li key={`${donor.name}-${index}`} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${index === 0 ? 'bg-marigold/20 text-marigold-dark' : 'bg-paper-dim text-ink/65'}`}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{donor.name}</span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-semibold text-banyan-dark">{donor.donationsCompleted}</span>
                      <span className="text-xs text-ink/50">{t('completed donations')}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section id="categories" className="border-b border-ink/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('What people are donating')}</h2>
          <p className="mt-2 max-w-xl text-sm text-ink/55">{t('Five categories, carefully scoped — strictly no food, medicines, or money. Just everyday things that still have plenty of life left in them.')}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {Object.entries(CATEGORY_ICON).map(([name, icon]) => {
              const count = resources.filter((r) => r.category === name && r.status === 'available').length
              return (
                <Link key={name} to="/browse" className="card flex flex-col items-center gap-2 p-5 text-center transition-shadow hover:shadow-lg">
                  <span className="text-4xl">{icon}</span>
                  <span className="text-sm font-semibold text-ink">{t(name)}</span>
                  <span className="font-mono text-xs text-banyan-dark">{count} {t('available')}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works / Lifecycle */}
      <section id="how-it-works" className="border-b border-ink/10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('How Setu works')}</h2>
          <p className="mt-2 max-w-xl text-sm text-ink/55">{t('Every resource on Setu moves through the same seven verified checkpoints — so donors and recipients always know exactly where a request stands, end to end.')}</p>

          <div className="relative mt-12">
            <div className="absolute left-0 right-0 top-5 hidden h-px bg-[repeating-linear-gradient(to_right,#1F2A44_0_6px,transparent_6px_12px)] opacity-25 md:block" />
            <ol className="grid gap-x-6 gap-y-8 md:grid-cols-4 lg:grid-cols-7">
              {LIFECYCLE.map((step) => (
                <li key={step.n} className="relative">
                  <div className="relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-paper font-mono text-xs font-bold text-ink">
                    {step.n}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug text-ink">{t(step.label)}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink/50">{t(step.detail)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Why Setu — replaces raw activity counters, which look empty on a freshly-launched
          platform with no seed data. These are structural guarantees, true from day one. */}
      <section className="border-b border-ink/10 bg-ink py-14 text-paper">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-8 text-center font-mono text-[11px] uppercase tracking-widest text-paper/40 md:text-left">{t('Built in from day one')}</p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: 'Every account is verified', body: 'Real ID documents, admin-reviewed — for individuals and institutions alike — before anyone can give, request, or deliver.' },
              { icon: BadgeCheck, title: 'Need-based, not first-come', body: 'Request limits and value caps keep donations flowing to genuine need, not whoever clicks fastest.' },
              { icon: Truck, title: 'Full delivery accountability', body: 'Setu employee handovers are confirmed by the receiving side, not just claimed — so nothing closes out unverified.' },
            ].map((f) => (
              <div key={f.title} className="text-center sm:text-left">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-marigold/15 text-marigold sm:mx-0">
                  <f.icon size={20} />
                </span>
                <p className="mt-4 font-display text-base font-semibold">{t(f.title)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-paper/55">{t(f.body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Five roles, one lifecycle')}</h2>
          <p className="mt-2 max-w-xl text-sm text-ink/55">{t('Every account on Setu is one of five verified roles — each with a dashboard built around exactly what that role needs to do.')}</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {ROLES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-5">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-ink text-marigold">
                  <Icon size={18} />
                </span>
                <h3 className="font-display text-base font-semibold text-ink">{t(title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{t(body)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-ink/10 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Frequently asked questions')}</h2>
          <p className="mt-2 text-sm text-ink/55">{t('Everything you need to know before you register, post, or request.')}</p>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => <FaqItem key={f.q} q={t(f.q)} a={t(f.a)} />)}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-ink/10 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Get in touch')}</h2>
            <p className="mt-2 max-w-sm text-sm text-ink/55">{t('Questions about a donation, a center, or partnering with Setu? Reach out and the team will get back to you.')}</p>
            <div className="mt-6 space-y-3 text-sm text-ink/70">
              <p className="flex items-center gap-2.5"><Mail size={15} className="text-ink/40" /> support@setu-donations.example</p>
              <p className="flex items-center gap-2.5"><Phone size={15} className="text-ink/40" /> +91 90000 12345</p>
              <p className="flex items-center gap-2.5"><MapPin size={15} className="text-ink/40" /> Kovilpatti, Tamil Nadu, India</p>
            </div>
          </div>
          <form className="card space-y-3 p-5" onSubmit={(e) => e.preventDefault()}>
            <input className="input" placeholder={t('Your name')} />
            <input className="input" type="email" placeholder={t('Your email')} />
            <textarea className="input min-h-[100px]" placeholder={t('How can we help?')} />
            <button type="submit" className="btn-accent w-full">{t('Send message')}</button>
          </form>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink/10 bg-ink py-16 text-paper sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Ready to cross the bridge?')}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-paper/60">{t('Register in under a minute as a donor, recipient, Setu Field Team employee, or center coordinator — there\'s a dashboard built for exactly what you do on Setu.')}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-accent">{t('Create your free account')}</Link>
            <Link to="/login" className="btn-outline border-paper/25 text-paper hover:bg-paper/10 hover:border-paper/40">{t('Log in')}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

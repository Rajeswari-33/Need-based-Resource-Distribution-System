import React, { useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import DashboardLayout from '../components/DashboardLayout.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Plus, X } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

export default function AdminCategories() {
  const { t } = usePreferences()
  const { categories, resources, addCategory, removeCategory } = useData()
  const { showToast } = useToast()
  const [newCategory, setNewCategory] = useState('')
  const [removing, setRemoving] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    if (!newCategory.trim()) return
    addCategory(newCategory.trim())
    showToast('Category added to the master list.', 'success')
    setNewCategory('')
  }

  function handleRemove() {
    removeCategory(removing)
    showToast(`"${removing}" removed from the master list.`, 'info')
    setRemoving(null)
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Manage categories')}</h1>
        <p className="mt-1.5 text-sm text-ink/55">{t('The master category list used across posting and browsing.')}</p>
      </div>

      <div className="card max-w-xl p-5">
        <ul className="mb-4 space-y-1.5">
          {categories.map((c) => {
            const count = resources.filter((r) => r.category === c).length
            return (
              <li key={c} className="flex items-center justify-between rounded-md bg-paper-dim px-3.5 py-2.5 text-sm">
                <span className="text-ink/75">{t(c)}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink/40">{count} {t(count === 1 ? 'listing' : 'listings')}</span>
                  <button onClick={() => setRemoving(c)} aria-label={`${t('Remove')} ${t(c)}`} className="text-ink/35 hover:text-clay"><X size={14} /></button>
                </span>
              </li>
            )
          })}
        </ul>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input className="input" placeholder={t('Add a new category…')} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <button type="submit" className="btn-outline shrink-0 px-3"><Plus size={14} /></button>
        </form>
      </div>

      <ConfirmDialog
        open={!!removing}
        title={t(`Remove "${removing}"?`)}
        description={t('Existing listings in this category will keep their category label, but it won\'t be selectable for new posts.')}
        confirmLabel={t('Remove')}
        tone="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </DashboardLayout>
  )
}

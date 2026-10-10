import React from 'react'
import { UploadCloud } from 'lucide-react'
import { usePreferences } from '../context/PreferencesContext.jsx'

// A document-submission control styled as a file upload (icon, dashed dropzone) but — since
// this demo has no real file storage — it actually just takes a document number. The visual
// framing still communicates "you're providing proof of a real document", and the small note
// makes the demo shortcut explicit rather than confusing.
export default function DocUploadField({ label, value, onChange, placeholder, hint, id }) {
  const { t } = usePreferences()
  return (
    <div className="rounded-md border-2 border-dashed border-ink/20 bg-paper-dim p-4 text-center">
      <UploadCloud size={22} className="mx-auto text-ink/35" />
      <p className="mt-1.5 text-xs font-semibold text-ink/60">{t('Upload')} {t(label)}</p>
      <p className="mt-0.5 text-[11px] text-ink/40">{t('Demo mode — no file storage yet; enter the document number below instead of attaching a scan')}</p>
      <input
        id={id}
        className="input mt-3 text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1.5 text-[11px] text-ink/45">{t(hint)}</p>}
    </div>
  )
}

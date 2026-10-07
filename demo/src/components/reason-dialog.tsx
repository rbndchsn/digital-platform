/**
 * Dialog for actions that need a mandatory reason (manager overrides, deactivation, suspension, break-glass;
 * PRD §6.13/6.14). Optionally also requires a typed phrase for destructive actions (PRD §7.3).
 */
import { useState, type ReactNode } from 'react'
import { OVERRIDE_REASON_MIN_LENGTH } from '@/domain/enums'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = 'Reason',
  placeholder,
  phrase,
  confirmLabel = 'Confirm',
  danger = false,
  children,
  note,
  confirmDisabled = false,
  size = 'sm',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: ReactNode
  description?: ReactNode
  reasonLabel?: string
  placeholder?: string
  /** When set, the user must also type this word (destructive actions). */
  phrase?: string
  confirmLabel?: string
  danger?: boolean
  children?: ReactNode
  /** Shown above the footer, e.g. who is notified. */
  note?: ReactNode
  /** Extra condition from the parent (e.g. a blocked competence check). */
  confirmDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  onConfirm: (reason: string) => Promise<unknown> | unknown
}) {
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const reasonOk = reason.trim().length >= OVERRIDE_REASON_MIN_LENGTH
  const phraseOk = !phrase || typed.trim() === phrase
  function close(o: boolean) {
    onOpenChange(o)
    if (!o) {
      setReason('')
      setTyped('')
    }
  }
  async function go() {
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      close(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={title} description={description} size={size}>
        {children}
        <Field label={reasonLabel} required hint={reasonOk ? 'Written to the audit log and shown to the people affected.' : `At least ${OVERRIDE_REASON_MIN_LENGTH} characters; it is written to the audit log.`} className={children ? 'mt-3' : undefined}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
        </Field>
        {phrase ? (
          <Field label={`Type "${phrase}" to continue`} className="mt-3">
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={phrase} />
          </Field>
        ) : null}
        {note ? (
          <Alert tone="info" className="mt-3">
            {note}
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => close(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'default'} onClick={go} disabled={!reasonOk || !phraseOk || confirmDisabled} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

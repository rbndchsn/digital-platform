import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'

/** Destructive confirmation: the user types a phrase (PRD §7.3). */
export function ConfirmTyped({ open, onOpenChange, title, description, phrase, confirmLabel = 'Confirm', onConfirm, danger = true }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; phrase: string; confirmLabel?: string; onConfirm: () => Promise<unknown> | unknown; danger?: boolean }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
      setTyped('')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTyped('') }}>
      <DialogContent title={title} description={description} size="sm">
        <Field label={`Type "${phrase}" to continue`}>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder={phrase} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'default'} onClick={go} disabled={typed.trim() !== phrase} loading={busy}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * "Show, don't do" dialog (plan_v1 §2.2): a realistic dialog for an external action (file picker, download,
 * e-mail, signature, API call). The real controls are shown but inert; "Simulate" records the outcome in
 * the session, "Back to demo" closes. Every such dialog in the app is built on this.
 */
import { Info } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { DialogContent, DialogFooter, Dialog } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/misc'

export interface ShowDontDoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** What the real platform would do, shown as bullets in the "Demo" note. */
  wouldDo: string[]
  children?: ReactNode
  simulateLabel?: string
  onSimulate?: () => Promise<unknown> | unknown
  simulateDisabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Hide the Simulate button (pure "look" dialogs such as a PDF preview). */
  noSimulate?: boolean
}

export function ShowDontDoDialog({ open, onOpenChange, title, description, wouldDo, children, simulateLabel = 'Simulate', onSimulate, simulateDisabled, size = 'md', noSimulate }: ShowDontDoProps) {
  const [busy, setBusy] = useState(false)
  async function simulate() {
    if (!onSimulate) return onOpenChange(false)
    setBusy(true)
    try {
      await onSimulate()
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} size={size}>
        {children}
        <Alert tone="info" icon={<Info />} className="mt-4" title="Demo">
          <p>In the real platform this would:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {wouldDo.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Alert>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Back to demo
          </Button>
          {!noSimulate ? (
            <Button onClick={simulate} loading={busy} disabled={simulateDisabled}>
              {simulateLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Inert control: looks clickable, explains itself on click via the parent dialog. */
export function InertButton({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick} className={className}>
      {children}
    </Button>
  )
}

/** Animated issuance (PRD §8.6): each workflow step visibly completes, then the statement appears. */
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, Circle, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { iterations } from '@/api'
import type { StatementView } from '@/api/iterations'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { describeError } from '@/lib/query'

type Phase = 'confirm' | 'running' | 'done' | 'error'

export function IssuanceDialog({ open, onOpenChange, serviceId, iterationId, iterationNo }: { open: boolean; onOpenChange: (o: boolean) => void; serviceId: string; iterationId: string; iterationNo: number }) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<Phase>('confirm')
  const [doneKeys, setDoneKeys] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [statement, setStatement] = useState<StatementView | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setPhase('running')
    setDoneKeys([])
    setError(null)
    try {
      const st = await iterations.issue(serviceId, iterationId, async (key) => {
        setCurrent(key)
        await new Promise((r) => setTimeout(r, 650))
        setDoneKeys((k) => [...k, key])
      })
      setStatement(st)
      setPhase('done')
      await qc.invalidateQueries()
    } catch (e) {
      setError(describeError(e))
      setPhase('error')
      await qc.invalidateQueries()
    }
  }

  function close(o: boolean) {
    if (phase === 'running') return
    onOpenChange(o)
    if (!o) {
      setPhase('confirm')
      setDoneKeys([])
      setCurrent(null)
      setStatement(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={phase === 'done' ? 'Opinion issued' : `Issue the opinion — iteration ${iterationNo}`} description={phase === 'confirm' ? 'This locks the iteration documents, computes their hashes, renders the statement, writes verified figures to the client records and notifies everyone. It cannot be undone.' : undefined} size="md" hideClose={phase === 'running'}>
        {phase === 'confirm' ? (
          <Alert tone="info" title="Before you issue">
            Manager approval is recorded, no blocking findings are open, and the independent review is complete. You re-authenticated a moment ago (demo: skipped).
          </Alert>
        ) : null}
        {phase !== 'confirm' ? (
          <ol className="space-y-2">
            {iterations.ISSUANCE_STEPS.map((s) => {
              const done = doneKeys.includes(s.key)
              const active = current === s.key && !done && phase === 'running'
              return (
                <li key={s.key} className={cn('flex items-center gap-3 text-sm', done ? 'text-fg' : active ? 'text-fg' : 'text-fg-subtle')}>
                  {done ? <Check className="text-success size-4" strokeWidth={3} /> : active ? <Loader2 className="text-primary size-4 animate-spin" /> : <Circle className="size-4 opacity-40" />}
                  {s.label}
                </li>
              )
            })}
          </ol>
        ) : null}
        {phase === 'done' && statement ? (
          <div className="bg-success-soft text-success mt-4 rounded-card px-4 py-3">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-5" /> {statement.opinion_type.replace('_', ' ')} opinion · {statement.level_of_assurance} assurance
            </div>
            <div className="mt-1 text-sm">
              Public verification code <code className="font-mono font-bold">{statement.public_code}</code> · {statement.hashes_json.length} documents locked and hashed.
            </div>
          </div>
        ) : null}
        {phase === 'error' ? <Alert tone="danger" title="Issuance stopped" className="mt-4">{error}</Alert> : null}
        <DialogFooter>
          {phase === 'confirm' ? (
            <>
              <Button variant="secondary" onClick={() => close(false)}>
                Back to demo
              </Button>
              <Button onClick={run}>
                <ShieldCheck /> Issue opinion
              </Button>
            </>
          ) : phase === 'done' && statement ? (
            <>
              <Button variant="secondary" onClick={() => close(false)}>
                Close
              </Button>
              <Button asChild>
                <Link to="/verify/$code" params={{ code: statement.public_code }} target="_blank" rel="noreferrer">
                  Open public statement
                </Link>
              </Button>
            </>
          ) : phase === 'error' ? (
            <Button variant="secondary" onClick={() => close(false)}>
              Close
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

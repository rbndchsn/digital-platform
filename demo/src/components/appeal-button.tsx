/**
 * "Appeal this decision" (PRD v0.3 FR-92): client entry point on a declined request, a rejected document version,
 * a closed finding and an issued opinion. Creates an appeal case linked to the decision; an appeal never suspends
 * the decision appealed against.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Scale } from 'lucide-react'
import { useState } from 'react'
import { cases } from '@/api'
import type { CaseDecisionEntityType } from '@/domain/enums'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { useAppMutation } from '@/lib/query'

export function AppealButton({ serviceId, decisionEntityType, decisionEntityId, subject, size = 'sm', variant = 'secondary', className }: { serviceId: string | null; decisionEntityType: CaseDecisionEntityType; decisionEntityId: string; subject: string; size?: 'sm' | 'md'; variant?: 'secondary' | 'ghost' | 'outline'; className?: string }) {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const canAppeal = me.org.type === 'client' && me.role !== 'client_viewer'
  const mine = useQuery({ queryKey: ['cases', 'mine'], queryFn: cases.listMine, enabled: canAppeal })
  if (!canAppeal) return null
  const existing = mine.data?.find((c) => c.kind === 'appeal' && c.decision_entity_id === decisionEntityId && c.status !== 'withdrawn_by_complainant')
  if (existing) {
    return (
      <Button size={size} variant="ghost" className={className} asChild>
        <Link to="/organisation" search={{ tab: 'cases' }}>
          <Scale /> Appeal {existing.status.replace(/_/g, ' ')}
        </Link>
      </Button>
    )
  }
  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <Scale /> Appeal this decision
      </Button>
      {open ? <AppealDialog serviceId={serviceId} decisionEntityType={decisionEntityType} decisionEntityId={decisionEntityId} subject={subject} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function AppealDialog({ serviceId, decisionEntityType, decisionEntityId, subject: initial, onClose }: { serviceId: string | null; decisionEntityType: CaseDecisionEntityType; decisionEntityId: string; subject: string; onClose: () => void }) {
  const [subject, setSubject] = useState(initial)
  const [description, setDescription] = useState('')
  const m = useAppMutation(() => cases.create({ kind: 'appeal', subject, description, serviceId, decisionEntityType, decisionEntityId }), {
    successMessage: (c) => `Appeal received (${c.subject}). VERIFASSUR acknowledges by ${c.acknowledge_target_at.slice(0, 10)}; follow it under Organisation › Complaints and appeals.`,
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Appeal this decision" description="A manager outside the involved set of the decision handles the appeal. You will see each stage and the outcome summary; investigation notes stay internal." size="md">
        <Field label="Subject" required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Why the decision should be reconsidered" required className="mt-3">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Facts, documents and the outcome you ask for." />
        </Field>
        <Alert tone="info" className="mt-3">
          An appeal does not suspend the decision appealed against. Acknowledgement and decision targets come from the service's template and are shown on the case.
        </Alert>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!subject.trim() || !description.trim()}>
            <Scale /> Submit appeal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

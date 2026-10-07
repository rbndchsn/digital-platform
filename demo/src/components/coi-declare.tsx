/** Conflict-of-interest declaration shown to a nominated team member before they can open the service (PRD FR-16). */
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { team } from '@/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, Textarea } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export function CoiDeclareCard({ serviceId, coi }: { serviceId: string; coi: NonNullable<ReturnType<typeof team.myCoiSync>> }) {
  const [declaration, setDeclaration] = useState<'clear' | 'potential_conflict'>('clear')
  const [details, setDetails] = useState('')
  const [resubmitted, setResubmitted] = useState(false)
  const m = useAppMutation(() => team.declareCoi(serviceId, coi.id, declaration, details), { successMessage: coi.reconfirmation ? 'Declaration re-confirmed for the revision. The manager will approve it again.' : 'Declaration submitted. The manager will review it.', onSuccess: () => setResubmitted(true) })
  // PRD v0.3 FR-89: a revision sets every declaration back to `declared`; the member re-confirms it before the chain runs again.
  const showForm = coi.status !== 'declared' || (coi.reconfirmation && !resubmitted)
  return (
    <Card className="mx-auto max-w-2xl" data-testid="coi-card">
      <CardHeader title={<span className="inline-flex items-center gap-2"><ShieldAlert className="text-blocking size-5" /> {coi.reconfirmation ? 'Re-confirm your conflict-of-interest declaration' : 'Conflict-of-interest declaration required'}</span>} description={coi.reconfirmation ? `A revision of the issued opinion is opening on ${coi.serviceReference} — ${coi.serviceName} for ${coi.clientName}. Every team member re-confirms their declaration and the manager approves it again before the chain runs (PRD FR-89).` : `You were nominated as ${roleLabel(coi.role)} on ${coi.serviceReference} — ${coi.serviceName} for ${coi.clientName}. Declare any conflicts before the service opens for you.`} />
      <CardContent className="space-y-4">
        {coi.status === 'declared' && !showForm ? (
          <Alert tone="info" title={coi.reconfirmation ? 'Declaration re-confirmed' : 'Declaration submitted'}>Waiting for the manager to approve it. You will be notified.</Alert>
        ) : coi.status === 'rejected' ? (
          <Alert tone="danger" title="Declaration rejected">The manager rejected your declaration. {coi.details ? `Note: ${coi.details}` : ''} Submit a new one.</Alert>
        ) : null}
        {showForm ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['clear', 'No conflict', 'I have had no consultancy, financial, employment or personal relationship with the client or its advisers in the last three years.'],
                  ['potential_conflict', 'Potential conflict', 'There is a relationship the manager should assess before I take this role.'],
                ] as const
              ).map(([v, title, text]) => (
                <button key={v} type="button" onClick={() => setDeclaration(v)} className={cn('rounded-card border p-3 text-left', declaration === v ? 'border-primary bg-primary-soft/40' : 'border-border hover:bg-surface-muted')}>
                  <div className="text-fg text-sm font-semibold">{title}</div>
                  <div className="text-fg-muted mt-1 text-xs">{text}</div>
                </button>
              ))}
            </div>
            <Field label={declaration === 'clear' ? 'Statement (optional)' : 'Describe the relationship'} required={declaration === 'potential_conflict'}>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder={declaration === 'clear' ? 'e.g. No relationship with Atlas Foods Group.' : 'e.g. I audited a supplier of this client in 2024.'} />
            </Field>
            <Button onClick={() => m.mutate()} loading={m.isPending} disabled={declaration === 'potential_conflict' && !details.trim()}>
              {coi.reconfirmation ? 'Re-confirm declaration' : 'Submit declaration'}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

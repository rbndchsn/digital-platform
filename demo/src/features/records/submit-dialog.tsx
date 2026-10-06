/** "Submit for verification": attach a record to an ongoing engagement or create a new request (PRD FR-42, FR-52). */
import { useQuery } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { projects, services } from '@/api'
import type { ServiceType } from '@/domain/enums'
import { SERVICE_TYPE_LABELS } from '@/domain/enums'
import type { SubmitTarget } from '@/api/records'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect } from '@/components/ui/input'
import { Alert } from '@/components/ui/misc'
import { cn } from '@/lib/cn'

export function SubmitForVerificationDialog({ open, onOpenChange, serviceType, defaultName, onSubmit, pending, blockers }: { open: boolean; onOpenChange: (o: boolean) => void; serviceType: ServiceType; defaultName: string; onSubmit: (target: SubmitTarget) => Promise<unknown>; pending: boolean; blockers?: string[] }) {
  const ongoing = useQuery({ queryKey: ['services', 'ongoing', serviceType], queryFn: () => services.list({ status: 'ongoing', type: serviceType }), enabled: open })
  const projs = useQuery({ queryKey: ['projects'], queryFn: () => projects.list(), enabled: open })
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [serviceId, setServiceId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [name, setName] = useState(defaultName)
  const candidates = (ongoing.data ?? []).filter((s) => ['requested', 'contracting', 'planning', 'execution'].includes(s.status))
  const effectiveMode = candidates.length === 0 ? 'new' : mode
  const ok = effectiveMode === 'existing' ? Boolean(serviceId) : Boolean(projectId && name.trim())
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Submit for verification" description={`Declared values are frozen and VERIFASSUR verifies them under a ${SERVICE_TYPE_LABELS[serviceType]} engagement.`} size="md">
        {blockers?.length ? (
          <Alert tone="warning" title="Fix before submitting" className="mb-3">
            <ul className="list-disc pl-4">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {candidates.length ? (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {(['existing', 'new'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-card border p-3 text-left text-sm', effectiveMode === m ? 'border-primary bg-primary-soft/40' : 'border-border hover:bg-surface-muted')}>
                <div className="text-fg font-semibold">{m === 'existing' ? 'Attach to an ongoing engagement' : 'Create a new request'}</div>
                <div className="text-fg-muted text-xs">{m === 'existing' ? 'The record joins the engagement already running.' : 'A new request goes to the VERIFASSUR triage queue.'}</div>
              </button>
            ))}
          </div>
        ) : null}
        {effectiveMode === 'existing' ? (
          <Field label="Engagement" required>
            <NativeSelect value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Choose…</option>
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.reference} · {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <div className="space-y-3">
            <Field label="Project" required>
              <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Choose…</option>
                {projs.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Engagement name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(effectiveMode === 'existing' ? { serviceId } : { newRequest: { projectId, name } }).then(() => onOpenChange(false)).catch(() => undefined)} disabled={!ok || Boolean(blockers?.length)} loading={pending}>
            <Send /> Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

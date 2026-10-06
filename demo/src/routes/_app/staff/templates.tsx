/** Workflow templates (PRD FR-10): phases, steps, slots, approvals and checklists per service type. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Layers, Pencil } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { staff } from '@/api'
import type { WorkflowTemplate } from '@/domain/workflow/template.schema'
import { PageHeader } from '@/components/page-header'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/cn'
import { roleLabel } from '@/lib/format'

export const Route = createFileRoute('/_app/staff/templates')({
  component: Templates,
})

function Templates() {
  const q = useQuery({ queryKey: ['staff', 'templates'], queryFn: staff.templates })
  const [selected, setSelected] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  if (!q.data) return <Skeleton className="h-64" />
  const t: WorkflowTemplate = q.data.find((x) => x.id === selected) ?? q.data[0]
  return (
    <>
      <PageHeader title="Workflow templates" description="Templates are data: phases, steps, owner roles, planned durations, document slots, approvals and checklists per service type. New services copy the active version; running services are never changed by edits." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader title="Service types" />
          <ul className="divide-border divide-y">
            {q.data.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSelected(x.id)} className={cn('flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm', x.id === t.id ? 'bg-primary-soft/40 text-primary-strong font-semibold' : 'hover:bg-surface-muted')}>
                  <Layers className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{x.name}</span>
                  <Badge tone="outline">v{x.version}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title={t.name} description={`${t.standard} · version ${t.version} · ${t.is_active ? 'active' : 'inactive'}`} actions={<Button variant="secondary" size="sm" onClick={() => setEdit(true)}><Pencil /> Edit template</Button>} />
          <CardContent className="space-y-5">
            {t.phases.map((p) => (
              <div key={p.key}>
                <h4 className="text-fg mb-2 text-sm font-semibold">
                  {p.name} <span className="text-fg-subtle font-normal">· {p.steps.reduce((a, s) => a + s.planned_duration_days, 0)} planned days</span>
                </h4>
                <ol className="border-border divide-border divide-y rounded-md border">
                  {p.steps.map((s) => (
                    <li key={s.key} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{s.name}</span>
                        <Badge tone="outline">{roleLabel(s.owner_role)}</Badge>
                        <span className="text-fg-subtle text-xs">{s.planned_duration_days} days</span>
                        {s.parallel_allowed ? <Badge tone="info">parallel</Badge> : null}
                        {s.is_opinion_step ? <Badge tone="primary">opinion iterations</Badge> : null}
                      </div>
                      {s.description ? <div className="text-fg-muted text-xs">{s.description}</div> : null}
                      {s.slots.length || s.approvals.length ? (
                        <div className="text-fg-subtle mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          {s.slots.map((sl) => (
                            <span key={sl.key}>
                              📄 {sl.name} {sl.required ? <span className="text-danger">(required)</span> : '(optional)'} · {sl.uploader_party}
                            </span>
                          ))}
                          {s.approvals.map((a) => (
                            <span key={a.kind}>✅ {a.label}</span>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-fg mb-1 text-sm font-semibold">Independent review checklist</h4>
                <ul className="text-fg-muted list-disc pl-4 text-xs">
                  {t.ir_checklist.map((c) => (
                    <li key={c.key}>{c.label}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-fg mb-1 text-sm font-semibold">Manager checklist</h4>
                <ul className="text-fg-muted list-disc pl-4 text-xs">
                  {t.manager_checklist.map((c) => (
                    <li key={c.key}>{c.label}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <ShowDontDoDialog open={edit} onOpenChange={setEdit} title={`Edit template — ${t.name}`} description="Templates are edited as structured data with schema validation; saving creates a new version." wouldDo={['Open a structured editor for phases, steps, slots, approvals and checklists', 'Validate the template against the schema', 'Save it as version ' + (t.version + 1) + ' and make it the active version for new services']} simulateLabel="Simulate save as new version" onSimulate={() => toast.success(`Template saved as version ${t.version + 1} (simulated).`)} />
    </>
  )
}

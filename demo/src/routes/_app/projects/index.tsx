/** Projects list with a functional "New project" dialog (PRD FR-8). */
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { FolderKanban, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { projects } from '@/api'
import type { Programme } from '@/domain/enums'
import { PROGRAMMES, PROGRAMME_LABELS } from '@/domain/enums'
import { EmptyState } from '@/components/empty-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { useMe } from '@/lib/auth'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/projects/')({
  component: Projects,
})

function Projects() {
  const me = useMe()
  const q = useQuery({ queryKey: ['projects'], queryFn: () => projects.list() })
  const [open, setOpen] = useState(false)
  const canCreate = me.org.type === 'client' && (me.role === 'client_admin' || me.role === 'client_owner')
  return (
    <>
      <PageHeader
        title="Projects"
        description="A project groups engagements that share a boundary: a corporate inventory, a product range, a carbon project or an insetting programme."
        actions={canCreate ? <Button onClick={() => setOpen(true)}><Plus /> New project</Button> : null}
      />
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : q.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col pt-5">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="primary">{PROGRAMME_LABELS[p.programme]}</Badge>
                  <span className="text-fg-subtle inline-flex items-center gap-1 text-xs">
                    <MapPin className="size-3" /> {p.country}
                    {p.region ? ` · ${p.region}` : ''}
                  </span>
                </div>
                <Link to="/projects/$projectId" params={{ projectId: p.id }} className="text-fg text-base font-semibold hover:underline">
                  {p.name}
                </Link>
                <p className="text-fg-muted mt-1 line-clamp-3 flex-1 text-sm">{p.description}</p>
                <div className="text-fg-subtle mt-3 flex items-center justify-between text-xs">
                  <span>
                    {p.serviceCount} engagement{p.serviceCount === 1 ? '' : 's'} · {p.ongoingCount} ongoing
                  </span>
                  <span>Owner: {p.ownerName}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<FolderKanban />} title="No projects yet" description="Create a project to group your engagements." action={canCreate ? <Button onClick={() => setOpen(true)}>New project</Button> : null} />
      )}
      <NewProjectDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = useState({ name: '', description: '', country: 'NL', region: '', programme: 'iso14064' as Programme, externalRegistryId: '' })
  const m = useAppMutation(() => projects.create({ name: form.name, description: form.description, country: form.country.toUpperCase(), region: form.region || null, programme: form.programme, externalRegistryId: form.externalRegistryId || null }), {
    successMessage: 'Project created.',
    onSuccess: () => onOpenChange(false),
  })
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New project" description="A project is the boundary your engagements refer to.">
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Corporate GHG inventory" />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={set('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Programme" required>
              <NativeSelect value={form.programme} onChange={set('programme')}>
                {PROGRAMMES.map((p) => (
                  <option key={p} value={p}>
                    {PROGRAMME_LABELS[p]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Country (ISO 2)" required>
              <Input value={form.country} onChange={set('country')} maxLength={2} />
            </Field>
            <Field label="Region">
              <Input value={form.region} onChange={set('region')} />
            </Field>
            <Field label="Registry ID" hint="Verra or Gold Standard project ID, if any">
              <Input value={form.externalRegistryId} onChange={set('externalRegistryId')} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!form.name.trim() || form.country.length !== 2}>
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

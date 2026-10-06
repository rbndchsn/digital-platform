/** Platform settings (PRD FR-67, FR-72): flag defaults, announcement banner, maintenance, templates, branding, data operations. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Database, Download, HardDrive, Mail, Megaphone, Palette, Plus, Trash2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { admin } from '@/api'
import type { DataOperation, DataOperationResult } from '@/api/admin'
import type { AnnouncementAudience, AnnouncementTone, FlagState } from '@/domain/enums'
import type { Announcement } from '@/domain/schemas'
import { PageHeader } from '@/components/page-header'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Skeleton, Switch } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { fmtDateTime, fmtRelative } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

export const Route = createFileRoute('/_app/admin/settings')({
  component: Settings,
})

function Settings() {
  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: admin.getSettings })
  const flags = useQuery({ queryKey: ['admin', 'flags'], queryFn: admin.listFlagDefaults })
  const anns = useQuery({ queryKey: ['admin', 'announcements'], queryFn: admin.listAnnouncements })
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: admin.listOrgs })
  const setDefault = useAppMutation(({ key, state }: { key: string; state: FlagState }) => admin.setFlagDefault(key, state), { successMessage: 'Default state updated for every organisation without an override.' })
  const toggleAnn = useAppMutation(({ id, active }: { id: string; active: boolean }) => admin.updateAnnouncement(id, { active }), { successMessage: (a) => (a.active ? 'Announcement is live in the app shell.' : 'Announcement withdrawn.') })
  const removeAnn = useAppMutation((id: string) => admin.removeAnnouncement(id), { successMessage: 'Announcement deleted.' })
  const [editAnn, setEditAnn] = useState<Announcement | 'new' | null>(null)
  const [maintenance, setMaintenance] = useState(false)
  const [maintenanceMsg, setMaintenanceMsg] = useState('VERIFASSUR_X is read-only for about 30 minutes while we migrate the evidence vault. Uploads and approvals resume automatically.')
  const maintenanceM = useAppMutation((on: boolean) => admin.updateSettings({ maintenance_mode: on, maintenance_message: on ? maintenanceMsg : null, maintenance_from: on ? new Date().toISOString() : null, maintenance_until: null }), { successMessage: (s) => (s.maintenance_mode ? 'Maintenance mode is on; everyone sees the banner.' : 'Maintenance mode is off.') })
  const [branding, setBranding] = useState(false)
  const [productName, setProductName] = useState('')
  const [colour, setColour] = useState('')
  const brandingM = useAppMutation(() => admin.updateSettings({ branding_json: { ...settings.data!.branding_json, product_name: productName || settings.data!.branding_json.product_name, primary_colour: colour || settings.data!.branding_json.primary_colour } }), { successMessage: 'Branding saved (simulated: the statement page and e-mails pick it up in the real platform).' })
  const [template, setTemplate] = useState<string | null>(null)
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const templateM = useAppMutation(() => admin.updateSettings({ notification_templates_json: settings.data!.notification_templates_json.map((t) => (t.type === template ? { ...t, subject: templateSubject, body: templateBody } : t)) }), { successMessage: 'Template saved.' })
  const [op, setOp] = useState<DataOperation | null>(null)
  const [opOrg, setOpOrg] = useState('')
  const [opResult, setOpResult] = useState<DataOperationResult | null>(null)
  const opM = useAppMutation((k: DataOperation) => admin.dataOperation(k, { orgId: k === 'export_org' ? opOrg || orgs.data?.find((o) => o.type === 'client')?.id : undefined }), { onSuccess: (r) => setOpResult(r) })
  const s = settings.data
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide configuration. Feature defaults and the announcement banner apply immediately; the other sections show what the real platform would do and record the simulated change." />
      <div className="space-y-6">
        <Card>
          <CardHeader title="Feature flag defaults" description="The default state of every feature for organisations without a per-client override (managers set overrides on the Clients page). Hidden, preview (visible but inactive, with interest capture) or enabled." />
          <Table label="Feature flag defaults">
            <THead>
              <tr>
                <TH>Feature</TH>
                <TH>Horizon</TH>
                <TH>Default</TH>
                <TH>Overrides</TH>
                <TH className="text-right">Interest</TH>
              </tr>
            </THead>
            <TBody>
              {(flags.data ?? []).map((f) => (
                <TR key={f.key}>
                  <TD>
                    <div className="text-fg text-sm font-medium">{f.title}</div>
                    <div className="text-fg-subtle max-w-md truncate text-xs">{f.description}</div>
                  </TD>
                  <TD>
                    <Badge tone="outline">{f.horizon}</Badge>
                  </TD>
                  <TD>
                    <NativeSelect value={f.defaultState} onChange={(e) => setDefault.mutate({ key: f.key, state: e.target.value as FlagState })} className="h-8 w-32 text-xs" aria-label={`Default state of ${f.title}`}>
                      <option value="hidden">Hidden</option>
                      <option value="preview">Preview</option>
                      <option value="enabled">Enabled</option>
                    </NativeSelect>
                  </TD>
                  <TD className="text-fg-muted text-xs">{f.overrides.length ? f.overrides.map((o) => `${o.orgName.split(' ')[0]}: ${o.state}`).join(' · ') : '—'}</TD>
                  <TD className="text-right tabular-nums">{f.interestCount || <span className="text-fg-subtle">0</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Megaphone className="size-4" /> Announcement banner</span>} description="Shown at the top of the app for the chosen audience while active and within the window." actions={<Button size="sm" onClick={() => setEditAnn('new')}><Plus /> New announcement</Button>} />
          <CardContent>
            {!anns.data ? (
              <Skeleton className="h-16" />
            ) : anns.data.length === 0 ? (
              <p className="text-fg-muted text-sm">No announcement yet.</p>
            ) : (
              <ul className="divide-border divide-y">
                {anns.data.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-fg text-sm font-medium">{a.title}</span>
                        <Badge tone={a.tone === 'warning' ? 'warning' : a.tone === 'success' ? 'success' : 'info'}>{a.tone}</Badge>
                        <Badge tone="outline">{a.audience}</Badge>
                        <span className="text-fg-subtle text-xs">
                          from {fmtDateTime(a.starts_at)}
                          {a.ends_at ? ` to ${fmtDateTime(a.ends_at)}` : ''}
                        </span>
                      </div>
                      <p className="text-fg-muted mt-0.5 line-clamp-2 text-xs">{a.body}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <span className={a.active ? 'text-success font-medium' : 'text-fg-muted'}>{a.active ? 'Live' : 'Off'}</span>
                      <Switch checked={a.active} onCheckedChange={(v) => toggleAnn.mutate({ id: a.id, active: v })} aria-label={`Publish ${a.title}`} />
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => setEditAnn(a)}>
                      Edit
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${a.title}`} onClick={() => removeAnn.mutate(a.id)}>
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><Wrench className="size-4" /> Maintenance mode</span>} description="Everyone sees a banner; mutations are blocked for non-administrators during the window." actions={s ? <Badge tone={s.maintenance_mode ? 'warning' : 'neutral'}>{s.maintenance_mode ? 'On' : 'Off'}</Badge> : null} />
            <CardContent className="flex flex-wrap items-center gap-2">
              {s?.maintenance_mode ? (
                <Button variant="secondary" onClick={() => maintenanceM.mutate(false)} loading={maintenanceM.isPending}>
                  Turn maintenance mode off
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setMaintenance(true)}>
                  Schedule maintenance
                </Button>
              )}
              {s?.maintenance_message && s.maintenance_mode ? <p className="text-fg-muted text-xs">{s.maintenance_message}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><Palette className="size-4" /> Branding</span>} description="Product name, logo and primary colour used on the statement page and in e-mails." />
            <CardContent className="flex flex-wrap items-center gap-3">
              {s ? (
                <>
                  <span className="inline-block size-6 rounded-md border" style={{ background: s.branding_json.primary_colour }} aria-hidden />
                  <span className="text-fg text-sm font-medium">{s.branding_json.product_name}</span>
                  <span className="text-fg-subtle text-xs">{s.branding_json.primary_colour}</span>
                  <Button size="sm" variant="secondary" onClick={() => { setProductName(s.branding_json.product_name); setColour(s.branding_json.primary_colour); setBranding(true) }}>
                    Edit branding
                  </Button>
                </>
              ) : (
                <Skeleton className="h-6 w-48" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Mail className="size-4" /> Notification templates</span>} description="Subject and body per notification type; placeholders in double braces are filled at send time." />
          <CardContent>
            {!s ? (
              <Skeleton className="h-16" />
            ) : (
              <ul className="divide-border divide-y">
                {s.notification_templates_json.map((t) => (
                  <li key={t.type} className="flex flex-wrap items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-fg text-sm font-medium">{t.type.replace(/_/g, ' ')}</div>
                      <div className="text-fg-muted truncate text-xs">{t.subject}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setTemplate(t.type); setTemplateSubject(t.subject); setTemplateBody(t.body) }}>
                      Edit template
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={<span className="inline-flex items-center gap-2"><Database className="size-4" /> Data operations</span>} description={`Exports, backups and retention (${s?.retention_years ?? 10} years after closure). Each run is an asynchronous job with an audit event; files arrive as expiring signed links.`} />
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOp('export_org')}>
              <Download /> Export an organisation
            </Button>
            <Button variant="secondary" onClick={() => setOp('export_audit')}>
              <Download /> Export the audit log
            </Button>
            <Button variant="secondary" onClick={() => setOp('backup_check')}>
              <HardDrive /> Backup status
            </Button>
            <Button variant="secondary" onClick={() => setOp('retention_report')}>
              <Database /> Retention report
            </Button>
            {s ? <p className="text-fg-subtle w-full text-xs">Last settings change {fmtRelative(s.updated_at)}.</p> : null}
          </CardContent>
        </Card>
      </div>

      {editAnn ? <AnnouncementDialog ann={editAnn === 'new' ? null : editAnn} onClose={() => setEditAnn(null)} /> : null}

      <ShowDontDoDialog open={maintenance} onOpenChange={setMaintenance} title="Schedule maintenance" description="A banner appears for everyone; non-administrators cannot change data while it is on." wouldDo={['Show the banner in every session within seconds', 'Return 503 for mutating API calls from non-administrators', 'E-mail client admins and staff 24 hours ahead', 'Record start and end in the audit log']} simulateLabel="Turn maintenance mode on" onSimulate={() => maintenanceM.mutateAsync(true)}>
        <Field label="Message shown in the banner" required>
          <Textarea value={maintenanceMsg} onChange={(e) => setMaintenanceMsg(e.target.value)} />
        </Field>
      </ShowDontDoDialog>

      <ShowDontDoDialog open={branding} onOpenChange={setBranding} title="Edit branding" description="Used on the public statement page, PDFs and e-mails." wouldDo={['Upload the logo to object storage and re-render the statement template', 'Validate the colour contrast against WCAG AA', 'Record the change in the audit log']} simulateLabel="Save branding" onSimulate={() => brandingM.mutateAsync()}>
        <div className="space-y-3">
          <Field label="Product name">
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </Field>
          <Field label="Primary colour">
            <Input value={colour} onChange={(e) => setColour(e.target.value)} />
          </Field>
          <Field label="Logo">
            <Button type="button" variant="secondary" className="w-full">
              Choose file…
            </Button>
          </Field>
        </div>
      </ShowDontDoDialog>

      <ShowDontDoDialog open={template !== null} onOpenChange={(o) => !o && setTemplate(null)} title={`Edit template: ${template?.replace(/_/g, ' ') ?? ''}`} description="Placeholders such as {{first_name}} and {{service_reference}} are filled at send time." wouldDo={['Validate placeholders against the notification schema', 'Send a test e-mail to you', 'Version the template so past e-mails stay reproducible']} simulateLabel="Save template" onSimulate={() => templateM.mutateAsync()} size="lg">
        <div className="space-y-3">
          <Field label="Subject">
            <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} />
          </Field>
          <Field label="Body">
            <Textarea value={templateBody} onChange={(e) => setTemplateBody(e.target.value)} className="min-h-40 font-mono text-xs" />
          </Field>
        </div>
      </ShowDontDoDialog>

      <ShowDontDoDialog
        open={op !== null}
        onOpenChange={(o) => !o && setOp(null)}
        title={op === 'export_org' ? 'Export an organisation' : op === 'export_audit' ? 'Export the platform audit log' : op === 'backup_check' ? 'Backup status' : 'Retention report'}
        description={op === 'export_org' ? 'Zip of records, document manifest with hashes and the audit log of one organisation.' : op === 'export_audit' ? 'Every audit event across organisations.' : op === 'backup_check' ? 'Checks the nightly database export and the daily object replication.' : 'Lists what is past the retention period and would be purged by the retention job.'}
        wouldDo={op === 'backup_check' ? ['Read the last successful nightly D1 export and R2 replication', 'Compare object counts between the primary and secondary bucket', 'Record the check in the audit log'] : ['Queue a background job and show its progress', 'Deliver the result as a signed link that expires after 7 days', 'Record the request in the audit log']}
        simulateLabel={op === 'backup_check' ? 'Run check' : op === 'retention_report' ? 'Run report' : 'Queue export'}
        onSimulate={() => op && opM.mutateAsync(op)}
      >
        {op === 'export_org' ? (
          <Field label="Organisation" required>
            <NativeSelect value={opOrg} onChange={(e) => setOpOrg(e.target.value)}>
              {orgs.data
                ?.filter((o) => o.type === 'client')
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
        ) : null}
      </ShowDontDoDialog>

      {opResult ? (
        <Dialog open onOpenChange={(o) => !o && setOpResult(null)}>
          <DialogContent title={opResult.summary} description={`Job ${opResult.jobId} · recorded in the audit log`} size="sm">
            <dl className="grid gap-2 text-sm">
              {opResult.details.map((d) => (
                <div key={d.label} className="flex items-start justify-between gap-4">
                  <dt className="text-fg-muted">{d.label}</dt>
                  <dd className="text-fg text-right font-medium">{d.value}</dd>
                </div>
              ))}
            </dl>
            <DialogFooter>
              <Button onClick={() => setOpResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}

function AnnouncementDialog({ ann, onClose }: { ann: Announcement | null; onClose: () => void }) {
  const [title, setTitle] = useState(ann?.title ?? '')
  const [body, setBody] = useState(ann?.body ?? '')
  const [tone, setTone] = useState<AnnouncementTone>(ann?.tone ?? 'info')
  const [audience, setAudience] = useState<AnnouncementAudience>(ann?.audience ?? 'all')
  const [active, setActive] = useState(ann?.active ?? true)
  const m = useAppMutation(() => (ann ? admin.updateAnnouncement(ann.id, { title, body, tone, audience, active }) : admin.createAnnouncement({ title, body, tone, audience, active })), { successMessage: active ? 'Announcement is live.' : 'Announcement saved.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={ann ? 'Edit announcement' : 'New announcement'} description="Shown in the app shell for the chosen audience." size="sm">
        <div className="space-y-3">
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Message">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone">
              <NativeSelect value={tone} onChange={(e) => setTone(e.target.value as AnnouncementTone)}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
              </NativeSelect>
            </Field>
            <Field label="Audience">
              <NativeSelect value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
                <option value="all">Everyone</option>
                <option value="clients">Clients</option>
                <option value="staff">VERIFASSUR staff</option>
              </NativeSelect>
            </Field>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Publish now</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
          <Alert tone="info">Preview: the banner shows the title and message exactly as typed, in the chosen tone.</Alert>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!title.trim()}>
            {ann ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

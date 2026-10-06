/** Users and organisations (PRD FR-63–66): every user across orgs with lifecycle actions; organisations tab. */
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Building2, KeyRound, LogOut, MoreHorizontal, Pencil, Search, ShieldOff, UserMinus, UserPlus, UserRoundCheck, UserX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { admin } from '@/api'
import type { AdminOrgRow, AdminUserRow, ReassignmentSummary } from '@/api/admin'
import type { OrgRole } from '@/domain/enums'
import { CLIENT_ROLES, VERIFIER_ROLES } from '@/domain/enums'
import { z } from 'zod'
import { EmptyState } from '@/components/empty-state'
import { NavTabs } from '@/components/nav-tabs'
import { PageHeader } from '@/components/page-header'
import { ComingBadge } from '@/components/preview-overlay'
import { ReasonDialog } from '@/components/reason-dialog'
import { ShowDontDoDialog } from '@/components/show-dont-do'
import { StatusChip } from '@/components/status-chip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/input'
import { Alert, Avatar, Skeleton } from '@/components/ui/misc'
import { TBody, TD, TH, THead, TR, Table } from '@/components/ui/table'
import { useMe } from '@/lib/auth'
import { fmtRelative, roleLabel } from '@/lib/format'
import { useAppMutation } from '@/lib/query'

const TABS = ['users', 'organisations'] as const

export const Route = createFileRoute('/_app/admin/users')({
  validateSearch: z.object({ tab: z.enum(TABS).optional() }),
  component: UsersAndOrgs,
})

function UsersAndOrgs() {
  const navigate = useNavigate()
  const { tab = 'users' } = Route.useSearch()
  return (
    <>
      <PageHeader title="Users and organisations" description="Every person on the platform and every organisation. Users are deactivated, never deleted; every action here is written to the audit log with your name." />
      <NavTabs value={tab} onChange={(v) => navigate({ to: '/admin/users', search: { tab: v } })} items={[{ value: 'users', label: 'Users' }, { value: 'organisations', label: 'Organisations' }]} label="Administration lists" className="mb-4" />
      {tab === 'users' ? <UsersTab /> : <OrgsTab />}
    </>
  )
}

// ---------------------------------------------------------------- users
function UsersTab() {
  const me = useMe()
  const [orgId, setOrgId] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['admin', 'users', orgId, role, status, search], queryFn: () => admin.listUsers({ orgId: orgId || undefined, role: (role || undefined) as OrgRole | undefined, status: (status || undefined) as 'active' | 'disabled' | 'invited' | undefined, search: search || undefined }) })
  const orgs = useQuery({ queryKey: ['admin', 'orgs'], queryFn: admin.listOrgs })
  const [invite, setInvite] = useState(false)
  const [summary, setSummary] = useState<ReassignmentSummary | null>(null)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="text-fg-subtle pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, e-mail, organisation" aria-label="Search users" className="w-64 pl-8" />
          </div>
          <NativeSelect value={orgId} onChange={(e) => setOrgId(e.target.value)} className="w-52" aria-label="Filter by organisation">
            <option value="">All organisations</option>
            {orgs.data?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} className="w-48" aria-label="Filter by role">
            <option value="">All roles</option>
            {[...VERIFIER_ROLES, ...CLIENT_ROLES].map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="w-40" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Deactivated</option>
            <option value="invited">Invited</option>
          </NativeSelect>
        </div>
        <Button onClick={() => setInvite(true)}>
          <UserPlus /> Invite user
        </Button>
      </div>
      <Card>
        {!q.data ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : q.data.length === 0 ? (
          <EmptyState title="No user matches" />
        ) : (
          <Table label="Users">
            <THead>
              <tr>
                <TH>User</TH>
                <TH>Organisation</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>MFA</TH>
                <TH>Last sign-in</TH>
                <TH className="text-right">Open work</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {q.data.map((u) => (
                <UserRow key={`${u.id}-${u.orgId}`} u={u} self={u.id === me.user.id} onDeactivated={setSummary} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {invite ? <InviteDialog orgs={orgs.data ?? []} onClose={() => setInvite(false)} /> : null}
      {summary ? <ReassignmentDialog summary={summary} onClose={() => setSummary(null)} /> : null}
    </>
  )
}

function UserRow({ u, self, onDeactivated }: { u: AdminUserRow; self: boolean; onDeactivated: (s: ReassignmentSummary) => void }) {
  const [edit, setEdit] = useState(false)
  const [changeRole, setChangeRole] = useState(false)
  const [deactivate, setDeactivate] = useState(false)
  const [resetPwd, setResetPwd] = useState(false)
  const [resetMfa, setResetMfa] = useState(false)
  const [forceOut, setForceOut] = useState(false)
  const [anonymise, setAnonymise] = useState(false)
  const [anonReason, setAnonReason] = useState('')
  const deactivateM = useAppMutation((reason: string) => admin.deactivateUser(u.id, reason), { successMessage: `${u.name} deactivated.`, onSuccess: onDeactivated })
  const reactivateM = useAppMutation(() => admin.reactivateUser(u.id), { successMessage: `${u.name} reactivated. Team roles are not restored.` })
  const resetPwdM = useAppMutation(() => admin.resetPassword(u.id), { successMessage: `Password reset link sent to ${u.email} (simulated).` })
  const resetMfaM = useAppMutation(() => admin.resetMfa(u.id), { successMessage: `MFA and passkeys reset for ${u.name} (simulated).` })
  const forceOutM = useAppMutation(() => admin.forceSignOut(u.id), { successMessage: `All sessions of ${u.name} revoked.` })
  const anonymiseM = useAppMutation(() => admin.anonymiseUser(u.id, anonReason), { successMessage: 'User anonymised.' })
  const disabled = u.status === 'disabled'
  return (
    <TR className={disabled ? 'opacity-70' : undefined}>
      <TD>
        <div className="flex items-center gap-3">
          <Avatar name={u.name} tone={u.orgType === 'verifier' ? 'primary' : 'neutral'} />
          <div className="min-w-0">
            <div className="text-fg truncate text-sm font-medium">
              {u.name} {self ? <Badge tone="outline">you</Badge> : null}
            </div>
            <div className="text-fg-subtle truncate text-xs">
              {u.jobTitle ? `${u.jobTitle} · ` : ''}
              {u.email}
            </div>
          </div>
        </div>
      </TD>
      <TD className="text-sm">{u.orgName}</TD>
      <TD>
        <Badge tone={u.role === 'platform_admin' ? 'warning' : 'outline'}>{roleLabel(u.role)}</Badge>
      </TD>
      <TD>
        {u.membershipStatus === 'invited' ? <StatusChip status="invited" label="Invited" /> : <StatusChip status={disabled ? 'rejected' : 'active'} label={disabled ? 'Deactivated' : 'Active'} />}
        {u.anonymisedAt ? <Badge tone="neutral" className="ml-1">Anonymised</Badge> : null}
        {disabled && u.deactivationReason ? <div className="text-fg-subtle mt-0.5 max-w-56 truncate text-[11px]" title={u.deactivationReason}>{u.deactivationReason}</div> : null}
      </TD>
      <TD>{u.mfaEnabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="warning">Not enrolled</Badge>}</TD>
      <TD className="text-fg-muted text-xs whitespace-nowrap" title={u.lastSignInAt ?? ''}>
        {u.lastSignInAt ? fmtRelative(u.lastSignInAt) : 'never'}
      </TD>
      <TD className="text-right tabular-nums">{u.openWork ? <Badge tone={disabled ? 'blocking' : 'primary'}>{u.openWork}</Badge> : <span className="text-fg-subtle">0</span>}</TD>
      <TD className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label={`Actions for ${u.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEdit(true)}>
              <Pencil /> Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setChangeRole(true)}>
              <UserRoundCheck /> Change role
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setResetPwd(true)} disabled={disabled}>
              <KeyRound /> Reset password
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setResetMfa(true)} disabled={disabled}>
              <ShieldOff /> Reset MFA and passkeys
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setForceOut(true)} disabled={disabled}>
              <LogOut /> Force sign-out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {disabled ? (
              <>
                <DropdownMenuItem onSelect={() => reactivateM.mutate()} disabled={Boolean(u.anonymisedAt)}>
                  <UserRoundCheck /> Reactivate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAnonymise(true)} disabled={Boolean(u.anonymisedAt)} className="text-danger">
                  <UserX /> Anonymise (after retention)
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => setDeactivate(true)} disabled={self} className="text-danger">
                <UserMinus /> Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TD>
      {edit ? <EditUserDialog u={u} onClose={() => setEdit(false)} /> : null}
      {changeRole ? <ChangeRoleDialog u={u} onClose={() => setChangeRole(false)} /> : null}
      <ReasonDialog
        open={deactivate}
        onOpenChange={setDeactivate}
        title={`Deactivate ${u.name}?`}
        description="The account is disabled, not deleted: sessions are revoked, memberships disabled and the person is removed from active teams. Their history stays in every log."
        placeholder="e.g. Left the company on 30 September 2026 (HR ticket 4471)."
        phrase="deactivate"
        confirmLabel="Deactivate user"
        danger
        note="You will get a summary of the open work (team roles, findings, drafts) to hand to the manager; the verifier managers are notified."
        onConfirm={(reason) => deactivateM.mutateAsync(reason)}
      />
      <ShowDontDoDialog open={resetPwd} onOpenChange={setResetPwd} title={`Reset the password of ${u.name}`} description={`A single-use reset link is e-mailed to ${u.email}; the current password keeps working until the link is used.`} wouldDo={['Invalidate any pending reset link', 'E-mail a 15-minute single-use reset link', 'Record the reset in the audit log and notify the user']} simulateLabel="Send reset link" onSimulate={() => resetPwdM.mutateAsync()} />
      <ShowDontDoDialog open={resetMfa} onOpenChange={setResetMfa} title={`Reset MFA and passkeys of ${u.name}`} description="The authenticator and every passkey are removed; the person re-enrols at the next sign-in after confirming a magic link." wouldDo={['Delete the TOTP secret, recovery codes and passkeys', 'Revoke every session', 'Require re-enrolment at the next sign-in', 'Record the reset in the audit log and notify the user']} simulateLabel="Reset MFA" onSimulate={() => resetMfaM.mutateAsync()} />
      <ShowDontDoDialog open={forceOut} onOpenChange={setForceOut} title={`Force sign-out of ${u.name}`} description="Every active session is revoked immediately on every device." wouldDo={['Delete the sessions from the session store and the edge cache', 'Record the revocation in the audit log and notify the user']} simulateLabel="Revoke sessions" onSimulate={() => forceOutM.mutateAsync()} />
      <ShowDontDoDialog open={anonymise} onOpenChange={setAnonymise} title={`Anonymise ${u.name}`} description="Allowed only after the retention period. Name and e-mail are replaced by a pseudonym; audit events keep the user id. Irreversible." wouldDo={['Check the retention period against the deactivation date', 'Replace name, e-mail and job title with a pseudonym', 'Keep every audit event under the user id', 'Record the anonymisation with your reason']} simulateLabel="Anonymise" simulateDisabled={anonReason.trim().length < 10} onSimulate={() => anonymiseM.mutateAsync()}>
        <Field label="Reason" required hint="At least 10 characters.">
          <Textarea value={anonReason} onChange={(e) => setAnonReason(e.target.value)} placeholder="e.g. Retention period of 10 years elapsed; GDPR request DSAR-2036-014." />
        </Field>
      </ShowDontDoDialog>
    </TR>
  )
}

function EditUserDialog({ u, onClose }: { u: AdminUserRow; onClose: () => void }) {
  const [name, setName] = useState(u.name)
  const [email, setEmail] = useState(u.email)
  const [jobTitle, setJobTitle] = useState(u.jobTitle)
  const m = useAppMutation(() => admin.updateUser(u.id, { name, email, jobTitle }), { successMessage: 'User updated.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Edit ${u.name}`} description="Changes are written to the audit log with before and after values." size="sm">
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="E-mail" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Job title">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!name.trim() || !email.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChangeRoleDialog({ u, onClose }: { u: AdminUserRow; onClose: () => void }) {
  const roles = u.orgType === 'client' ? CLIENT_ROLES : VERIFIER_ROLES
  const [role, setRole] = useState<OrgRole>(u.role)
  const m = useAppMutation(() => admin.changeRole(u.id, u.orgId, role), { successMessage: `${u.name} is now ${roleLabel(role)} at ${u.orgName}.`, onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`Change the role of ${u.name}`} description={`At ${u.orgName}. The person is notified; the change is logged.`} size="sm">
        <Field label="Role" required>
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {role === 'platform_admin' ? (
          <Alert tone="warning" className="mt-3" title="Platform administrator">
            Sees everything, including money, and can change no engagement or record data. Separate from assurance roles.
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={role === u.role}>
            Change role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteDialog({ orgs, onClose }: { orgs: AdminOrgRow[]; onClose: () => void }) {
  const [orgId, setOrgId] = useState(orgs.find((o) => o.type === 'client')?.id ?? orgs[0]?.id ?? '')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const org = orgs.find((o) => o.id === orgId)
  const roles = org?.type === 'verifier' ? VERIFIER_ROLES : CLIENT_ROLES
  const [role, setRole] = useState<OrgRole>('client_contributor')
  const m = useAppMutation(() => admin.inviteUser({ orgId, name, email, jobTitle, role: roles.includes(role as never) ? role : roles[0] }), { successMessage: `${name} invited (single-use link, 7 days).`, onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Invite a user" description="A single-use invitation link is e-mailed; the membership is created as “invited” until accepted." size="sm">
        <div className="space-y-3">
          <Field label="Organisation" required>
            <NativeSelect value={orgId} onChange={(e) => { setOrgId(e.target.value); const t = orgs.find((o) => o.id === e.target.value)?.type; setRole(t === 'verifier' ? 'verifier_auditor' : 'client_contributor') }}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Work e-mail" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.example" />
          </Field>
          <Field label="Job title">
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </Field>
          <Field label="Role" required>
            <NativeSelect value={role} onChange={(e) => setRole(e.target.value as OrgRole)}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!name.trim() || !email.includes('@')}>
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReassignmentDialog({ summary, onClose }: { summary: ReassignmentSummary; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={`${summary.userName} deactivated — work to reassign`} description={`Tell ${summary.notifiedManagers.join(', ') || 'the manager'} (already notified) to reassign the following through the team panel or a manager override.`} size="lg">
        <div className="space-y-4">
          <Section title={`Team roles on active services (${summary.services.length})`}>
            {summary.services.length === 0 ? (
              <p className="text-fg-muted text-sm">None.</p>
            ) : (
              <ul className="divide-border divide-y">
                {summary.services.map((s) => (
                  <li key={`${s.serviceId}-${s.role}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="text-primary-strong font-semibold">{s.reference}</span> {s.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone="outline">{roleLabel(s.role)}</Badge>
                      {s.coiStatus ? <StatusChip status={s.coiStatus} size="xs" /> : null}
                      <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate({ to: '/engagements/$serviceId/phases', params: { serviceId: s.serviceId } }) }}>
                        Open
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title={`Open findings assigned (${summary.openFindings.length})`}>
            {summary.openFindings.length === 0 ? (
              <p className="text-fg-muted text-sm">None.</p>
            ) : (
              <ul className="divide-border divide-y">
                {summary.openFindings.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="text-primary-strong font-semibold">{f.serviceReference}</span> {f.type} #{f.number} {f.title}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => { onClose(); navigate({ to: '/engagements/$serviceId/findings/$findingId', params: { serviceId: f.serviceId, findingId: f.id } }) }}>
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title={`Draft requests (${summary.draftRequests.length})`}>{summary.draftRequests.length === 0 ? <p className="text-fg-muted text-sm">None.</p> : <p className="text-sm">{summary.draftRequests.map((d) => `${d.reference} ${d.name}`).join(' · ')}</p>}</Section>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-fg-subtle mb-1 text-xs font-semibold uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- organisations
function OrgsTab() {
  const q = useQuery({ queryKey: ['admin', 'orgs'], queryFn: admin.listOrgs })
  const [create, setCreate] = useState(false)
  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={() => setCreate(true)}>
          <Building2 /> New organisation
        </Button>
      </div>
      <Card>
        {!q.data ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : (
          <Table label="Organisations">
            <THead>
              <tr>
                <TH>Organisation</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH className="text-right">Users</TH>
                <TH className="text-right">Ongoing</TH>
                <TH className="text-right">Closed</TH>
                <TH className="text-right">Verified records</TH>
                <TH>Features</TH>
                <TH>
                  <span className="inline-flex items-center gap-1">
                    Portfolio manager <ComingBadge flagKey="portfolios" />
                  </span>
                </TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {q.data.map((o) => (
                <OrgRow key={o.id} o={o} />
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {create ? <OrgDialog onClose={() => setCreate(false)} /> : null}
    </>
  )
}

function OrgRow({ o }: { o: AdminOrgRow }) {
  const [edit, setEdit] = useState(false)
  const [suspend, setSuspend] = useState(false)
  const suspendM = useAppMutation((reason: string) => admin.suspendOrg(o.id, reason), { successMessage: `${o.name} suspended; its users cannot sign in.` })
  const unsuspendM = useAppMutation(() => admin.unsuspendOrg(o.id), { successMessage: `${o.name} reactivated.` })
  return (
    <TR className={o.status === 'suspended' ? 'opacity-70' : undefined}>
      <TD>
        <div className="text-fg text-sm font-semibold">{o.name}</div>
        <div className="text-fg-subtle text-xs">
          {o.legalName} · {o.country}
          {o.registrationNo ? ` · ${o.registrationNo}` : ''}
        </div>
      </TD>
      <TD>
        <Badge tone={o.type === 'verifier' ? 'primary' : 'outline'}>{o.type}</Badge>
      </TD>
      <TD>
        <StatusChip status={o.status === 'suspended' ? 'on_hold' : 'active'} label={o.status === 'suspended' ? 'Suspended' : 'Active'} />
        {o.suspendedReason ? <div className="text-fg-subtle mt-0.5 max-w-48 truncate text-[11px]" title={o.suspendedReason}>{o.suspendedReason}</div> : null}
      </TD>
      <TD className="text-right tabular-nums">{o.users}</TD>
      <TD className="text-right tabular-nums">{o.ongoing}</TD>
      <TD className="text-right tabular-nums">{o.closed}</TD>
      <TD className="text-right tabular-nums">{o.verifiedRecords}</TD>
      <TD className="text-fg-muted text-xs">
        {o.enabledFlags} enabled · {o.previewFlags} preview
      </TD>
      <TD className="text-fg-muted text-sm">{o.type === 'client' ? (o.portfolioManagerName ?? '—') : '—'}</TD>
      <TD className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label={`Actions for ${o.name}`}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setEdit(true)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            {o.type === 'client' ? (
              <>
                <DropdownMenuSeparator />
                {o.status === 'suspended' ? (
                  <DropdownMenuItem onSelect={() => unsuspendM.mutate()}>
                    <UserRoundCheck /> Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => setSuspend(true)} className="text-danger">
                    <ShieldOff /> Suspend
                  </DropdownMenuItem>
                )}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TD>
      {edit ? <OrgDialog org={o} onClose={() => setEdit(false)} /> : null}
      <ReasonDialog open={suspend} onOpenChange={setSuspend} title={`Suspend ${o.name}?`} description="Members cannot sign in; data and engagements are kept and shown as frozen to staff. Reversible." placeholder="e.g. Contract terminated for non-payment; legal hold until the dispute is settled." phrase="suspend" confirmLabel="Suspend organisation" danger onConfirm={(reason) => suspendM.mutateAsync(reason)} />
    </TR>
  )
}

function OrgDialog({ org, onClose }: { org?: AdminOrgRow; onClose: () => void }) {
  const [name, setName] = useState(org?.name ?? '')
  const [legalName, setLegalName] = useState(org?.legalName ?? '')
  const [country, setCountry] = useState(org?.country ?? 'NL')
  const [registrationNo, setRegistrationNo] = useState(org?.registrationNo ?? '')
  const m = useAppMutation(() => (org ? admin.updateOrg(org.id, { name, legalName, country, registrationNo }) : admin.createOrg({ name, legalName, country, registrationNo })), { successMessage: org ? 'Organisation updated.' : 'Organisation created. Invite its first admin from the Users tab.', onSuccess: onClose })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={org ? `Edit ${org.name}` : 'New client organisation'} description={org ? 'Changes are written to the audit log.' : 'The organisation starts empty; invite the first client admin afterwards.'} size="sm">
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Legal name" required>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country (ISO)" required>
              <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
            </Field>
            <Field label="Registration no.">
              <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!name.trim() || !legalName.trim() || country.length !== 2}>
            {org ? 'Save' : 'Create organisation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

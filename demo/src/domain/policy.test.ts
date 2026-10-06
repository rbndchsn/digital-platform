import { describe, expect, it } from 'vitest'
import type { AuthContext } from './policy'
import { can, decide } from './policy'

const client = (role: AuthContext['orgRole']): AuthContext => ({
  userId: 'u_client',
  orgId: 'org_c',
  orgType: 'client',
  orgRole: role,
  platformRole: null,
  serviceRoles: {},
  coiApproved: {},
})

const verifier = (role: AuthContext['orgRole'], serviceRoles: AuthContext['serviceRoles'] = {}, coi: Record<string, boolean> = {}): AuthContext => ({
  userId: 'u_v',
  orgId: 'org_verifassur',
  orgType: 'verifier',
  orgRole: role,
  platformRole: null,
  serviceRoles,
  coiApproved: coi,
})

describe('client roles', () => {
  it('admin can create and submit requests, viewer cannot', () => {
    expect(can(client('client_admin'), 'service.create')).toBe(true)
    expect(can(client('client_admin'), 'service.submit', { orgId: 'org_c' })).toBe(true)
    expect(can(client('client_viewer'), 'service.create')).toBe(false)
    expect(can(client('client_viewer'), 'service.read', { orgId: 'org_c' })).toBe(true)
  })
  it('contributor can upload and respond but not accept agreements', () => {
    expect(can(client('client_contributor'), 'document.upload:client', { serviceId: 's1', orgId: 'org_c' })).toBe(true)
    expect(can(client('client_contributor'), 'finding.respond', { serviceId: 's1', orgId: 'org_c' })).toBe(true)
    expect(can(client('client_contributor'), 'approval.decide:agreement_acceptance', { serviceId: 's1' })).toBe(false)
  })
  it('never crosses organisations', () => {
    expect(decide(client('client_owner'), 'service.read', { orgId: 'org_other' }).allowed).toBe(false)
  })
  it('cannot upload to a locked document', () => {
    expect(can(client('client_admin'), 'document.upload:client', { serviceId: 's1', locked: true })).toBe(false)
  })
})

describe('verifier roles', () => {
  it('manager can triage and approve scope without being on the team', () => {
    const m = verifier('verifier_manager')
    expect(can(m, 'service.triage', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'approval.decide:impartiality', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'staff.templates')).toBe(true)
  })
  it('auditor needs team membership with approved COI', () => {
    const notOnTeam = verifier('verifier_auditor')
    expect(can(notOnTeam, 'service.read', { serviceId: 's1' })).toBe(false)
    const pendingCoi = verifier('verifier_auditor', { s1: ['verifier_auditor'] }, { s1: false })
    expect(decide(pendingCoi, 'service.read', { serviceId: 's1' }).reason).toMatch(/conflict of interest/)
    expect(can(pendingCoi, 'coi.declare', { serviceId: 's1' })).toBe(true)
    const ok = verifier('verifier_auditor', { s1: ['verifier_auditor'] }, { s1: true })
    expect(can(ok, 'finding.create', { serviceId: 's1' })).toBe(true)
    expect(can(ok, 'iteration.create', { serviceId: 's1' })).toBe(false)
  })
  it('team leader creates iterations but cannot approve or issue them', () => {
    const tl = verifier('verifier_team_leader', { s1: ['verifier_team_leader'] }, { s1: true })
    expect(can(tl, 'iteration.create', { serviceId: 's1' })).toBe(true)
    expect(can(tl, 'iteration.manager_decide', { serviceId: 's1' })).toBe(false)
    const mgrWhoIsAlsoTl = verifier('verifier_manager', { s1: ['verifier_team_leader'] }, { s1: true })
    expect(decide(mgrWhoIsAlsoTl, 'iteration.issue', { serviceId: 's1', teamLeaderUserId: 'u_v' }).reason).toMatch(/team leader/)
  })
  it('independent reviewer must hold no other role on the service', () => {
    const ir = verifier('verifier_independent_reviewer', { s1: ['verifier_independent_reviewer'] }, { s1: true })
    expect(can(ir, 'iteration.ir_decide', { serviceId: 's1' })).toBe(true)
    const conflicted = verifier('verifier_independent_reviewer', { s1: ['verifier_independent_reviewer', 'verifier_auditor'] }, { s1: true })
    expect(decide(conflicted, 'iteration.ir_decide', { serviceId: 's1' }).reason).toMatch(/another role/)
  })
  it('finance manages invoices only', () => {
    const f = verifier('verifier_finance')
    expect(can(f, 'invoice.manage', { serviceId: 's1' })).toBe(true)
    expect(can(f, 'finding.create', { serviceId: 's1' })).toBe(false)
  })
})

describe('manager overrides (PRD §6.14)', () => {
  it('only the manager can override steps, services and team roles; the team leader can replan', () => {
    const m = verifier('verifier_manager')
    expect(can(m, 'step.override', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'service.override', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'team.reassign', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'step.plan_dates', { serviceId: 's1' })).toBe(true)
    expect(can(m, 'step.override')).toBe(false) // service-scoped
    const tl = verifier('verifier_team_leader', { s1: ['verifier_team_leader'] }, { s1: true })
    expect(can(tl, 'step.plan_dates', { serviceId: 's1' })).toBe(true)
    expect(can(tl, 'step.override', { serviceId: 's1' })).toBe(false)
    expect(can(tl, 'team.reassign', { serviceId: 's1' })).toBe(false)
    const aud = verifier('verifier_auditor', { s1: ['verifier_auditor'] }, { s1: true })
    expect(can(aud, 'step.override', { serviceId: 's1' })).toBe(false)
    expect(can(verifier('verifier_coordinator'), 'service.override', { serviceId: 's1' })).toBe(false)
    expect(can(client('client_admin'), 'step.override', { serviceId: 's1', orgId: 'org_c' })).toBe(false)
  })
})

describe('ADMIN — platform administrator (PRD §3.2 v0.2)', () => {
  const admin: AuthContext = { ...verifier('platform_admin'), userId: 'u_admin', platformRole: 'platform_admin' }
  it('sees everything across organisations', () => {
    for (const a of ['org.read', 'project.read', 'service.read', 'document.read', 'record.read', 'invoice.read'] as const) {
      expect(can(admin, a, { serviceId: 's1', orgId: 'org_other' }), a).toBe(true)
      expect(can(admin, a), a).toBe(true)
    }
    expect(can(admin, 'staff.clients')).toBe(true)
    expect(can(admin, 'staff.templates')).toBe(true)
  })
  it('administers users, organisations, settings, audit, COI register, stats and break-glass', () => {
    for (const a of ['admin.users', 'admin.orgs', 'admin.settings', 'admin.audit', 'admin.coi_register', 'admin.stats', 'admin.break_glass', 'org.manage_flags'] as const) {
      expect(can(admin, a), a).toBe(true)
    }
  })
  it('never changes engagement or record data', () => {
    const denied = [
      'step.transition',
      'step.override',
      'step.plan_dates',
      'step.request_document',
      'service.triage',
      'service.hold',
      'service.cancel',
      'service.close',
      'service.override',
      'service.create',
      'service.submit',
      'approval.decide:technical_scope',
      'approval.decide:impartiality',
      'approval.decide:contract',
      'approval.decide:audit_plan',
      'approval.decide:agreement_acceptance',
      'team.nominate',
      'team.reassign',
      'coi.decide',
      'coi.declare',
      'document.upload:client',
      'document.upload:verifier',
      'document.check',
      'document.delete',
      'finding.create',
      'finding.respond',
      'finding.transition',
      'iteration.create',
      'iteration.submit_for_ir',
      'iteration.ir_decide',
      'iteration.manager_decide',
      'iteration.issue',
      'record.create',
      'record.submit',
      'record.verify',
      'invoice.manage',
      'staff.triage_queue',
      'org.manage_members',
    ] as const
    for (const a of denied) {
      const d = decide(admin, a, { serviceId: 's1', orgId: 'org_c' })
      expect(d.allowed, a).toBe(false)
      expect(d.reason, a).toMatch(/platform administrator/)
    }
  })
  it('the ADMIN role is recognised from the membership alone', () => {
    const byOrgRole: AuthContext = { ...verifier('platform_admin'), platformRole: null }
    expect(can(byOrgRole, 'admin.users')).toBe(true)
    expect(can(byOrgRole, 'step.transition', { serviceId: 's1' })).toBe(false)
  })
  it('nobody else can use the admin actions', () => {
    for (const ctx of [verifier('verifier_manager'), verifier('verifier_coordinator'), verifier('verifier_finance'), client('client_owner'), client('client_admin')]) {
      for (const a of ['admin.users', 'admin.orgs', 'admin.settings', 'admin.audit', 'admin.coi_register', 'admin.stats', 'admin.break_glass'] as const) {
        expect(can(ctx, a), `${ctx.orgRole} ${a}`).toBe(false)
      }
    }
  })
})

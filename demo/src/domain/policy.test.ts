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
  })
  it('refuses the decision, the issue and the post-issuance decisions to the involved set regardless of org role (PRD v0.3 FR-79)', () => {
    const involved = { userId: 'u_v', reasons: ['Entered or edited verified values on 2027-03-12'] }
    const m = verifier('verifier_manager')
    for (const a of ['iteration.manager_decide', 'iteration.issue', 'statement.revise_decide', 'statement.withdraw_decide'] as const) {
      const d = decide(m, a, { serviceId: 's1', involved })
      expect(d.allowed, a).toBe(false)
      expect(d.code, a).toBe('decision_maker_conflict')
      expect(d.reason, a).toMatch(/involved set/)
      expect(can(m, a, { serviceId: 's1', involved: null }), a).toBe(true)
    }
    // A manager who is also the team leader is involved through the team role, not through a special rule.
    const mgrWhoIsAlsoTl = verifier('verifier_manager', { s1: ['verifier_team_leader'] }, { s1: true })
    expect(decide(mgrWhoIsAlsoTl, 'iteration.issue', { serviceId: 's1', involved: { userId: 'u_v', reasons: ['Holds the team leader role'] } }).code).toBe('decision_maker_conflict')
    // Complaint handling follows the same rule (FR-92).
    expect(decide(m, 'case.decide', { serviceId: 's1', involved }).code).toBe('decision_maker_conflict')
    expect(can(verifier('verifier_auditor'), 'case.handle', { involved: null })).toBe(true)
    expect(can(verifier('verifier_auditor'), 'case.handle', { involved })).toBe(false)
  })
  it('materiality, misstatements and acknowledgements follow the roles (PRD v0.3 §11.2)', () => {
    const tl = verifier('verifier_team_leader', { s1: ['verifier_team_leader'] }, { s1: true })
    expect(can(tl, 'materiality.set', { serviceId: 's1' })).toBe(true)
    expect(can(tl, 'materiality.approve', { serviceId: 's1' })).toBe(false)
    expect(can(tl, 'misstatement.manage', { serviceId: 's1' })).toBe(true)
    expect(can(verifier('verifier_manager'), 'materiality.approve', { serviceId: 's1' })).toBe(true)
    const ir = verifier('verifier_independent_reviewer', { s1: ['verifier_independent_reviewer'] }, { s1: true })
    expect(can(ir, 'materiality.acknowledge', { serviceId: 's1' })).toBe(true)
    expect(can(ir, 'misstatement.manage', { serviceId: 's1' })).toBe(false)
  })
  it('competence profiles are edited by managers, never one’s own (PRD v0.3 FR-94)', () => {
    const m = verifier('verifier_manager')
    expect(can(m, 'competence.edit')).toBe(true)
    const own = decide(m, 'competence.edit', { ownProfile: true })
    expect(own.allowed).toBe(false)
    expect(own.code).toBe('own_profile')
    expect(can(verifier('verifier_team_leader'), 'competence.edit')).toBe(false)
    expect(can(verifier('verifier_team_leader'), 'competence.read')).toBe(true)
  })
  it('clients raise and follow their own cases', () => {
    expect(can(client('client_admin'), 'case.create')).toBe(true)
    expect(can(client('client_contributor'), 'case.create')).toBe(true)
    expect(can(client('client_viewer'), 'case.create')).toBe(false)
    expect(can(client('client_viewer'), 'case.read_own')).toBe(true)
    expect(can(client('client_admin'), 'case.read_all')).toBe(false)
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
    // PRD v0.3: reads the complaints register and competence profiles, changes neither.
    expect(can(admin, 'case.read_all')).toBe(true)
    expect(can(admin, 'competence.read')).toBe(true)
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
      // PRD v0.3
      'materiality.set',
      'materiality.approve',
      'misstatement.manage',
      'materiality.acknowledge',
      'statement.post_issuance_open',
      'statement.revise_decide',
      'statement.withdraw_decide',
      'case.handle',
      'case.assign',
      'case.decide',
      'competence.edit',
      'team.check_override',
      'template.edit',
      'legacy.manage',
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

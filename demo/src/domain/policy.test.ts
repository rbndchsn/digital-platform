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

describe('platform admin', () => {
  it('is limited to tenant administration', () => {
    const pa: AuthContext = { ...verifier('verifier_manager'), platformRole: 'platform_admin' }
    expect(can(pa, 'org.manage_flags')).toBe(true)
    expect(can(pa, 'service.read', { serviceId: 's1' })).toBe(false)
  })
})

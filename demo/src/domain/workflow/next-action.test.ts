import { describe, expect, it } from 'vitest'
import type { Service } from '../schemas'
import { instantiateTemplate } from './instantiate'
import { applyStepOverride } from './machines'
import type { ServiceSnapshot } from './next-action'
import { computeNextAction, isActionForViewer } from './next-action'
import { templateFor } from './templates'

const now = '2026-02-01T09:00:00Z'
const audit = { created_at: now, created_by: null, updated_at: now, updated_by: null, version: 0, deleted_at: null }

function makeSnapshot(status: Service['status'] = 'contracting'): ServiceSnapshot {
  let n = 0
  const inst = instantiateTemplate({ serviceId: 'svc', template: templateFor('iso14064_1_inventory_verification'), startDate: '2026-02-01', now, actorId: null, newId: (p) => `${p}_${++n}` })
  const service: Service = {
    ...audit,
    id: 'svc',
    org_id: 'org_c',
    verifier_org_id: 'org_v',
    project_id: 'prj',
    template_id: 'tpl',
    template_version: 1,
    service_type: 'iso14064_1_inventory_verification',
    standard: 'ISO 14064-1',
    name: 'Test',
    reference: 'VX-1',
    status,
    resume_status: null,
    period_start: '2025-01-01',
    period_end: '2025-12-31',
    scope_json: { summary: '', sites: [], boundary: '', products: [], interventions: [], materiality_pct: null },
    requested_at: null,
    contracted_at: null,
    issued_at: null,
    closed_at: null,
    on_hold_reason: null,
    renewed_from_service_id: null,
    client_contact_user_id: null,
    team_leader_user_id: null,
    target_opinion_date: null,
  }
  return { service, ...inst, team: [], findings: [], iterations: [] }
}

function complete(snap: ServiceSnapshot, ...keys: string[]) {
  for (const k of keys) {
    const s = snap.steps.find((x) => x.key === k)!
    s.status = 'completed'
    for (const slot of snap.slots.filter((x) => x.step_id === s.id)) slot.status = 'accepted'
    for (const a of snap.approvals.filter((x) => x.step_id === s.id)) a.status = 'approved'
  }
}

describe('computeNextAction', () => {
  it('asks the client to upload the CPF first', () => {
    const a = computeNextAction(makeSnapshot())!
    expect(a.party).toBe('client')
    expect(a.action).toBe('upload_document')
    expect(a.label).toMatch(/pre-engagement form/i)
  })

  it('moves to manager review, approvals, team nomination and COI', () => {
    const snap = makeSnapshot()
    snap.slots.find((s) => s.key === 'cpf')!.status = 'submitted'
    expect(computeNextAction(snap)!.action).toBe('review_documents')
    complete(snap, 'pre_engagement')
    expect(computeNextAction(snap)!.action).toBe('decide_approval')
    complete(snap, 'desk_review_cpf')
    expect(computeNextAction(snap)!.action).toBe('nominate_team')
    snap.team.push({ ...audit, id: 'tm1', service_id: 'svc', user_id: 'u_tl', service_role: 'verifier_team_leader', status: 'nominated', nominated_by: null, nominated_at: null, coi: { ...audit, id: 'coi1', service_team_id: 'tm1', declaration: null, details: null, declared_at: null, status: 'required', decided_by: null, decided_at: null } })
    const declare = computeNextAction(snap)!
    expect(declare.action).toBe('declare_coi')
    expect(declare.actor_user_id).toBe('u_tl')
    snap.team[0].coi!.status = 'declared'
    expect(computeNextAction(snap)!.action).toBe('decide_coi')
  })

  it('client accepts the agreement once the MSA is uploaded', () => {
    const snap = makeSnapshot()
    complete(snap, 'pre_engagement', 'desk_review_cpf', 'team_nomination', 'contract_review')
    expect(computeNextAction(snap)!.action).toBe('upload_document')
    snap.slots.find((s) => s.key === 'msa')!.status = 'accepted'
    const a = computeNextAction(snap)!
    expect(a.action).toBe('accept_agreement')
    expect(a.party).toBe('client')
  })

  it('prioritises open findings and then opinion iterations in execution', () => {
    const snap = makeSnapshot('execution')
    complete(snap, 'pre_engagement', 'desk_review_cpf', 'team_nomination', 'contract_review', 'service_agreement', 'audit_plan', 'desk_review', 'data_review', 'remote_onsite_audit', 'reporting')
    expect(computeNextAction(snap)!.action).toBe('create_iteration')
    snap.findings.push({ ...audit, id: 'f1', service_id: 'svc', number: 1, type: 'CAR', severity: 'major', title: 'Missing meter data', description: '', step_id: null, entity_type: null, entity_id: null, raised_by: 'u', raised_at: now, assigned_user_id: null, due_at: '2026-03-01', status: 'open', closed_by: null, closed_at: null, blocking: true })
    expect(computeNextAction(snap)!.action).toBe('respond_finding')
    snap.findings[0].status = 'responded'
    expect(computeNextAction(snap)!.action).toBe('review_finding')
    snap.findings[0].status = 'closed'
    snap.iterations.push({ ...audit, id: 'it1', service_id: 'svc', iteration_no: 1, status: 'independent_review', summary_json: { opinion_type: null, level_of_assurance: null, figures: [], narrative: '' }, submitted_for_ir_at: now, ir_user_id: 'u_ir', ir_decision: null, ir_comment: null, ir_decided_at: null, manager_user_id: null, manager_decision: null, manager_comment: null, manager_decided_at: null, checklist_ir_json: [], checklist_manager_json: [] })
    const ir = computeNextAction(snap)!
    expect(ir.action).toBe('ir_decide')
    expect(ir.actor_user_id).toBe('u_ir')
    snap.iterations[0].status = 'approved'
    expect(computeNextAction(snap)!.action).toBe('issue')
  })

  it('returns null for terminal states and resume for on hold', () => {
    expect(computeNextAction(makeSnapshot('closed'))).toBeNull()
    const held = makeSnapshot('on_hold')
    held.service.on_hold_reason = 'Client merger'
    expect(computeNextAction(held)!.label).toMatch(/Client merger/)
  })

  it('recomputes after a manager override of a step (PRD FR-73)', () => {
    const snap = makeSnapshot('execution')
    complete(snap, 'pre_engagement', 'desk_review_cpf', 'team_nomination', 'contract_review', 'service_agreement', 'audit_plan')
    const desk = snap.steps.find((s) => s.key === 'desk_review')!
    desk.status = 'in_progress'
    const sample = snap.slots.find((s) => s.step_id === desk.id && s.required && s.uploader_party === 'client')!
    sample.status = 'rejected'
    const before = computeNextAction(snap)!
    expect(before.action).toBe('upload_document')
    expect(before.party).toBe('client')
    expect(before.step_id).toBe(desk.id)
    // The manager forces the step closed although the client never re-uploaded.
    desk.status = applyStepOverride(desk, 'complete').state
    const after = computeNextAction(snap)!
    expect(after.step_id).not.toBe(desk.id)
    expect(after.entity_id).not.toBe(sample.id)
    // Reopening by override brings the client action back.
    desk.status = applyStepOverride(desk, 'reopen').state
    expect(computeNextAction(snap)!.step_id).toBe(desk.id)
  })

  it('addresses actions to the right viewer', () => {
    const a = computeNextAction(makeSnapshot())!
    expect(isActionForViewer(a, { party: 'client', roles: ['client_admin'], userId: 'x' })).toBe(true)
    expect(isActionForViewer(a, { party: 'client', roles: ['client_viewer'], userId: 'x' })).toBe(false)
    expect(isActionForViewer(a, { party: 'verifier', roles: ['verifier_manager'], userId: 'x' })).toBe(false)
  })
})

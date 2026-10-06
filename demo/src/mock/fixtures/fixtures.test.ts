import { describe, expect, it } from 'vitest'
import * as S from '@/domain/schemas'
import { WorkflowTemplate } from '@/domain/workflow/template.schema'
import { computeNextAction } from '@/domain/workflow/next-action'
import { snapshotFrom } from '../snapshot'
import { SVC, buildSeed } from './index'
import { USR } from './base'

const seed = buildSeed()

function validateAll<T>(rows: T[], schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, name: string) {
  const failures = rows.map((r, i) => ({ i, res: schema.safeParse(r) })).filter((x) => !x.res.success)
  expect(failures.map((f) => `${name}[${f.i}]: ${JSON.stringify((f.res.error as { issues?: unknown })?.issues ?? f.res.error).slice(0, 300)}`)).toEqual([])
}

describe('seed validates against the domain schemas', () => {
  it('every table row parses', () => {
    validateAll(seed.organisations, S.Organisation, 'organisations')
    validateAll(seed.users, S.User, 'users')
    validateAll(seed.memberships, S.Membership, 'memberships')
    validateAll(seed.projects, S.Project, 'projects')
    validateAll(seed.services, S.Service, 'services')
    validateAll(seed.phases, S.Phase, 'phases')
    validateAll(seed.steps, S.Step, 'steps')
    validateAll(seed.slots, S.DocumentSlot, 'slots')
    validateAll(seed.approvals, S.Approval, 'approvals')
    validateAll(seed.team, S.ServiceTeamMember, 'team')
    validateAll(seed.cois, S.CoiDeclaration, 'cois')
    validateAll(seed.documents, S.Document, 'documents')
    validateAll(seed.documentVersions, S.DocumentVersion, 'documentVersions')
    validateAll(seed.evidenceLinks, S.EvidenceLink, 'evidenceLinks')
    validateAll(seed.findings, S.Finding, 'findings')
    validateAll(seed.findingResponses, S.FindingResponse, 'findingResponses')
    validateAll(seed.iterations, S.OpinionIteration, 'iterations')
    validateAll(seed.iterationDocuments, S.IterationDocument, 'iterationDocuments')
    validateAll(seed.statements, S.OpinionStatement, 'statements')
    validateAll(seed.inventories, S.Inventory, 'inventories')
    validateAll(seed.inventoryLines, S.InventoryLine, 'inventoryLines')
    validateAll(seed.inventoryLineGases, S.InventoryLineGas, 'inventoryLineGases')
    validateAll(seed.emissionFactors, S.EmissionFactor, 'emissionFactors')
    validateAll(seed.profiles, S.EmissionProfile, 'profiles')
    validateAll(seed.profileGases, S.EmissionProfileGas, 'profileGases')
    validateAll(seed.decarbRecords, S.DecarbUnitRecord, 'decarbRecords')
    validateAll(seed.invoices, S.Invoice, 'invoices')
    validateAll(seed.notifications, S.Notification, 'notifications')
    validateAll(seed.auditEvents, S.AuditEvent, 'auditEvents')
    validateAll(seed.featureFlags, S.FeatureFlag, 'featureFlags')
    validateAll(seed.templates, WorkflowTemplate, 'templates')
  })

  it('has unique ids per table', () => {
    for (const [name, rows] of Object.entries(seed)) {
      const ids = (rows as Array<{ id?: string; key?: string }>).map((r) => r.id ?? r.key).filter(Boolean)
      expect(new Set(ids).size, name).toBe(ids.length)
    }
  })

  it('keeps referential integrity', () => {
    const has = (rows: Array<{ id: string }>, id: string | null) => id == null || rows.some((r) => r.id === id)
    for (const s of seed.services) {
      expect(has(seed.projects, s.project_id), s.id).toBe(true)
      expect(has(seed.organisations, s.org_id)).toBe(true)
      expect(has(seed.users, s.client_contact_user_id)).toBe(true)
    }
    for (const st of seed.steps) expect(has(seed.phases, st.phase_id), st.id).toBe(true)
    for (const sl of seed.slots) {
      expect(has(seed.steps, sl.step_id)).toBe(true)
      expect(has(seed.documents, sl.current_document_id), sl.id).toBe(true)
      if (sl.status !== 'empty') expect(sl.current_document_id).not.toBeNull()
    }
    for (const d of seed.documents) expect(has(seed.documentVersions, d.current_version_id), d.id).toBe(true)
    for (const v of seed.documentVersions) expect(has(seed.documents, v.document_id)).toBe(true)
    for (const e of seed.evidenceLinks) expect(has(seed.documentVersions, e.document_version_id)).toBe(true)
    for (const c of seed.cois) expect(has(seed.team, c.service_team_id)).toBe(true)
    for (const r of seed.findingResponses) expect(has(seed.findings, r.finding_id)).toBe(true)
    for (const d of seed.iterationDocuments) expect(has(seed.iterations, d.iteration_id)).toBe(true)
    for (const st of seed.statements) expect(has(seed.iterations, st.iteration_id)).toBe(true)
    for (const l of seed.inventoryLines) expect(has(seed.inventories, l.inventory_id)).toBe(true)
    for (const gsr of seed.inventoryLineGases) expect(has(seed.inventoryLines, gsr.line_id)).toBe(true)
    for (const d of seed.decarbRecords) {
      expect(has(seed.profiles, d.baseline_profile_id)).toBe(true)
      expect(has(seed.profiles, d.project_profile_id)).toBe(true)
      if (d.assurance_ref) expect(has(seed.iterations, d.assurance_ref)).toBe(true)
    }
    for (const n of seed.notifications) expect(has(seed.users, n.user_id)).toBe(true)
  })

  it('issued services have locked iteration documents and a statement', () => {
    for (const st of seed.statements) {
      const docs = seed.iterationDocuments.filter((d) => d.iteration_id === st.iteration_id)
      expect(docs.length).toBeGreaterThan(0)
      for (const d of docs) {
        const v = seed.documentVersions.find((x) => x.id === d.document_version_id)!
        const doc = seed.documents.find((x) => x.id === v.document_id)!
        expect(doc.locked_at, doc.id).not.toBeNull()
      }
      expect(st.hashes_json.length).toBe(docs.length)
    }
  })
})

describe('storyline preconditions (plan_v1 §2.4)', () => {
  it('ch.1: Northwind FY2025 inventory asks the client to re-upload activity data', () => {
    const a = computeNextAction(snapshotFrom(seed, SVC.nwInv2025))!
    expect(a.party).toBe('client')
    expect(a.action).toBe('upload_document')
    expect(a.label).toMatch(/Re-upload Activity data/)
    expect(seed.services.find((s) => s.id === SVC.nwInv2025)!.status).toBe('execution')
  })
  it('ch.3: Atlas wheat service waits for the auditor COI declaration', () => {
    const a = computeNextAction(snapshotFrom(seed, SVC.atlasDecarb2025))!
    expect(a.action).toBe('declare_coi')
    expect(a.actor_user_id).toBe(USR.aud)
  })
  it('ch.2/3: a request sits in the triage queue', () => {
    expect(computeNextAction(snapshotFrom(seed, SVC.atlasPcf2025))!.action).toBe('triage')
  })
  it('ch.4: Solstice verification waits for the client to accept the audit plan', () => {
    const a = computeNextAction(snapshotFrom(seed, SVC.solVer2025))!
    expect(a.action).toBe('accept_audit_plan')
    expect(a.party).toBe('client')
  })
  it('ch.6: the FY2025 inventory has an open CAR assigned to the site manager', () => {
    const car = seed.findings.find((f) => f.service_id === SVC.nwInv2025 && f.type === 'CAR')!
    expect(car.status).toBe('open')
    expect(car.assigned_user_id).toBe(USR.nwContrib)
  })
  it('ch.7: the milk record computes 400,000 reduction units', () => {
    const rec = seed.decarbRecords.find((d) => d.id === 'dcu_nw_milk_2025')!
    expect(rec.declared_reduction_units).toBe(400_000)
    expect(rec.decarb_factor_gross).toBeCloseTo(0.4, 6)
    expect(rec.status).toBe('under_verification')
  })
  it('ch.8: the insetting service needs iteration 2 after IR returned iteration 1', () => {
    const a = computeNextAction(snapshotFrom(seed, SVC.nwDecarb2025))!
    expect(a.action).toBe('create_iteration')
    expect(a.label).toMatch(/iteration 2/)
    expect(seed.services.find((s) => s.id === SVC.nwDecarb2025)!.status).toBe('opinion_review')
  })
  it('ch.9: closed services have paid invoices and verified inventories', () => {
    const inv = seed.invoices.find((i) => i.service_id === SVC.nwInv2024 && i.kind === 'invoice')!
    expect(inv.status).toBe('paid')
    const inventory2024 = seed.inventories.find((i) => i.year === 2024)!
    expect(inventory2024.status).toBe('verified')
    expect(inventory2024.verified_totals_json?.by_scope['3']).toBeGreaterThan(0)
  })
})

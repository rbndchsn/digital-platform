/**
 * Runs the investor storyline (plan_v1 §2.4) end to end through the api layer, without any UI.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { setLatencyEnabled } from '@/mock/latency'
import { SVC } from '@/mock/fixtures'
import { USR } from '@/mock/fixtures/base'
import { ApiError, admin, approvals, auth, dashboard, demo, documents, features, findings, invoices, iterations, records, services, team } from './index'

const as = (userId: string) => auth.signIn(userId)
const slot = (detail: services.ServiceDetail, key: string) => detail.phases.flatMap((p) => p.steps).flatMap((s) => s.slots).find((s) => s.key === key)!
const approval = (detail: services.ServiceDetail, kind: string) => detail.phases.flatMap((p) => p.steps).flatMap((s) => s.approvals).find((a) => a.kind === kind && a.status === 'pending')!
const upload = (serviceId: string, slotId: string, filename: string) => documents.simulateUpload({ serviceId, slotId, filename, sizeBytes: 420_000, mimeType: 'application/pdf' })

beforeAll(() => {
  setLatencyEnabled(false)
  demo.resetDemo()
})

describe('storyline', () => {
  let newServiceId = ''

  it('ch.1 — client home shows what blocks Ingrid', async () => {
    await as(USR.nwAdmin)
    const d = await dashboard.client()
    expect(d.ongoing).toBeGreaterThanOrEqual(2)
    expect(d.needsAction.map((x) => x.id)).toContain(SVC.nwInv2025)
    expect(d.needsAction.find((x) => x.id === SVC.nwInv2025)!.nextAction!.label).toMatch(/Re-upload/)
    expect(d.latestVerified?.year).toBe(2024)
  })

  it('ch.2 — a new request reaches the triage queue', async () => {
    await as(USR.nwAdmin)
    const draft = await services.createDraft({ projectId: 'prj_nw_products', serviceType: 'iso14067_product_verification', name: 'Product carbon footprint 2025 — whey protein', periodStart: '2025-01-01', periodEnd: '2025-12-31', scope: { summary: 'Cradle-to-gate PCF of WPC 80.', products: ['Whey protein concentrate 80'] } })
    expect(draft.status).toBe('draft')
    await services.updateDraft(draft.id, { scope: { materiality_pct: 5 } })
    const submitted = await services.submit(draft.id)
    expect(submitted.status).toBe('requested')
    newServiceId = draft.id
    await as(USR.mgr)
    const staffHome = await dashboard.staff()
    expect(staffHome.triage.map((x) => x.id)).toContain(newServiceId)
  })

  it('ch.3 — triage, approvals, team nomination and COI', async () => {
    await as(USR.mgr)
    await services.triage(newServiceId, 'accept')
    let detail = await services.get(newServiceId)
    expect(detail.service.status).toBe('contracting')
    expect(detail.nextAction?.action).toBe('upload_document')

    await as(USR.nwAdmin)
    await upload(newServiceId, slot(detail, 'cpf').id, 'Northwind_CPF_WPC80.pdf')
    detail = await services.get(newServiceId)
    expect(slot(detail, 'cpf').status).toBe('submitted')

    await as(USR.mgr)
    await documents.check(newServiceId, slot(detail, 'cpf').document!.version!.id, 'accept')
    detail = await services.get(newServiceId)
    expect(detail.nextAction?.action).toBe('decide_approval')
    await approvals.decide(newServiceId, approval(detail, 'technical_scope').id, 'approve', 'Within scope.')
    detail = await services.get(newServiceId)
    await approvals.decide(newServiceId, approval(detail, 'impartiality').id, 'approve', 'No threats identified.')
    detail = await services.get(newServiceId)
    expect(detail.nextAction?.action).toBe('nominate_team')

    await expect(team.nominate(newServiceId, [{ userId: USR.ir, role: 'verifier_independent_reviewer' }, { userId: USR.ir, role: 'verifier_auditor' }])).rejects.toBeInstanceOf(ApiError)
    await team.nominate(newServiceId, [
      { userId: USR.tl, role: 'verifier_team_leader' },
      { userId: USR.aud, role: 'verifier_auditor' },
      { userId: USR.ir, role: 'verifier_independent_reviewer' },
      { userId: USR.coord, role: 'verifier_coordinator' },
    ])
    detail = await services.get(newServiceId)
    expect(detail.nextAction?.action).toBe('declare_coi')

    // The nominated auditor cannot open the service before declaring.
    await as(USR.aud)
    await expect(services.get(newServiceId)).rejects.toMatchObject({ code: 'forbidden' })
    for (const u of [USR.tl, USR.aud, USR.ir, USR.coord]) {
      await as(u)
      const my = team.myCoiSync(newServiceId)!
      await team.declareCoi(newServiceId, my.id, 'clear', 'No relationship with Northwind.')
    }
    await as(USR.mgr)
    detail = await services.get(newServiceId)
    for (const m of detail.team.filter((t) => t.coi && t.coi.status === 'declared')) await team.decideCoi(newServiceId, m.coi!.id, 'approve')
    detail = await services.get(newServiceId)
    expect(detail.phases[0].steps.find((s) => s.key === 'team_nomination')!.status).toBe('completed')
    expect(detail.nextAction?.action).toBe('upload_document')
    expect(detail.nextAction?.role).toBe('verifier_coordinator')
  })

  it('ch.4 — contracting completes with the client accepting the agreement, then planning', async () => {
    await as(USR.coord)
    let detail = await services.get(newServiceId)
    await upload(newServiceId, slot(detail, 'quote').id, 'VERIFASSUR_quote.pdf')
    await upload(newServiceId, slot(detail, 'contract').id, 'VERIFASSUR_contract.pdf')
    await as(USR.mgr)
    detail = await services.get(newServiceId)
    await approvals.decide(newServiceId, approval(detail, 'contract').id, 'approve')
    await as(USR.coord)
    detail = await services.get(newServiceId)
    await upload(newServiceId, slot(detail, 'msa').id, 'VERIFASSUR_service_agreement.pdf')
    detail = await services.get(newServiceId)
    expect(detail.nextAction?.action).toBe('accept_agreement')

    await as(USR.nwAdmin)
    await expect(approvals.acceptAgreement(newServiceId, approval(detail, 'agreement_acceptance').id, 'wrong name')).rejects.toMatchObject({ code: 'validation' })
    const accepted = await approvals.acceptAgreement(newServiceId, approval(detail, 'agreement_acceptance').id, 'Ingrid Vos')
    expect((accepted.evidence_json as { document_sha256: string }).document_sha256).toHaveLength(64)
    detail = await services.get(newServiceId)
    expect(detail.service.status).toBe('planning')
    expect(detail.service.contracted_at).not.toBeNull()

    await as(USR.tl)
    detail = await services.get(newServiceId)
    await upload(newServiceId, slot(detail, 'audit_plan').id, 'Audit_plan_WPC80.pdf')
    await as(USR.nwAdmin)
    detail = await services.get(newServiceId)
    expect(detail.nextAction?.action).toBe('accept_audit_plan')
    await approvals.decide(newServiceId, approval(detail, 'audit_plan').id, 'approve')
    detail = await services.get(newServiceId)
    expect(detail.service.status).toBe('execution')
  })

  it('ch.5 — evidence: re-upload a rejected document and have it accepted', async () => {
    await as(USR.nwAdmin)
    let detail = await services.get(SVC.nwInv2025)
    const s = slot(detail, 'activity_data')
    expect(s.status).toBe('rejected')
    const before = s.document!.versionCount
    await documents.simulateUpload({ serviceId: SVC.nwInv2025, slotId: s.id, documentId: s.document!.id, filename: 'Northwind_activity_data_v2.zip', sizeBytes: 3_200_000, mimeType: 'application/zip' })
    detail = await services.get(SVC.nwInv2025)
    expect(slot(detail, 'activity_data').status).toBe('submitted')
    expect(slot(detail, 'activity_data').document!.versionCount).toBe(before + 1)
    await as(USR.aud)
    await documents.check(SVC.nwInv2025, slot(detail, 'activity_data').document!.version!.id, 'accept')
    detail = await services.get(SVC.nwInv2025)
    expect(slot(detail, 'activity_data').status).toBe('accepted')
    const bundle = await documents.downloadAll(SVC.nwInv2025)
    expect(bundle.files.length).toBeGreaterThan(3)
  })

  it('ch.6 — findings: client responds, auditor reviews and closes', async () => {
    await as(USR.nwContrib)
    const list = await findings.list(SVC.nwInv2025)
    const car = list.find((f) => f.type === 'CAR')!
    expect(car.status).toBe('open')
    await findings.respond(car.id, 'Q3 invoices (July–September) and the calibrated meter export attached.')
    expect((await findings.get(car.id)).finding.status).toBe('responded')
    await as(USR.aud)
    await findings.transition(car.id, 'review')
    const closed = await findings.transition(car.id, 'close', 'Volumes reconcile to the invoices. Closing.')
    expect(closed.status).toBe('closed')
    expect((await findings.get(car.id)).responses.length).toBe(2)
  })

  it('ch.7 — records: the milk record and a unit mismatch', async () => {
    await as(USR.nwAdmin)
    const rec = await records.getDecarbRecord('dcu_nw_milk_2025')
    expect(rec.computed?.reduction_units).toBe(400_000)
    expect(rec.computed?.decarb_factor_gross).toBeCloseTo(0.4, 6)
    const inv = (await records.listInventories()).find((i) => i.year === 2025)!
    expect(inv.lines.length).toBeGreaterThan(10)
    expect(inv.totals.by_scope['3']).toBeGreaterThan(inv.totals.by_scope['1'])
    const cmp = await records.compareInventories()
    expect(cmp.change.find((c) => c.scope === '3')?.pct).not.toBeNull()
    const base = rec.baseline!
    const profile = { period_start: base.period_start, period_end: base.period_end, boundary: base.boundary, gwp_set: base.gwp_set, gases: base.gases, biogenic_co2_t: base.biogenic_co2_t, removals_tco2e: base.removals_tco2e, reference_volume: base.reference_volume, volume_unit: base.volume_unit, notes: null }
    await expect(records.previewDecarb({ baseline: profile, project: profile, attributed_volume: 100, volume_unit: 'L' })).rejects.toMatchObject({ code: 'validation' })
  })

  it('ch.8 — opinion: iteration 2, independent review, manager approval, issuance, write-back', async () => {
    await as(USR.tl)
    const it2 = await iterations.create(SVC.nwDecarb2025, { opinionType: 'unqualified', levelOfAssurance: 'reasonable', narrative: 'Biogenic CO2 is reported separately and excluded from the units.', figures: iterations.suggestedFigures(SVC.nwDecarb2025) })
    expect(it2.iteration_no).toBe(2)
    await iterations.submitForIr(SVC.nwDecarb2025, it2.id)
    await as(USR.ir)
    const checklist = it2.checklist_ir_json.map((c) => ({ ...c, checked: true }))
    await expect(iterations.irDecide(SVC.nwDecarb2025, it2.id, 'approve', '', it2.checklist_ir_json)).rejects.toMatchObject({ code: 'validation' })
    const afterIr = await iterations.irDecide(SVC.nwDecarb2025, it2.id, 'approve', 'Wording now states the biogenic exclusion.', checklist)
    expect(afterIr.status).toBe('manager_review')
    await as(USR.tl)
    await expect(iterations.managerDecide(SVC.nwDecarb2025, it2.id, 'approve', '', afterIr.checklist_manager_json)).rejects.toMatchObject({ code: 'forbidden' })
    await as(USR.mgr)
    const approved = await iterations.managerDecide(SVC.nwDecarb2025, it2.id, 'approve', 'Approved.', afterIr.checklist_manager_json.map((c) => ({ ...c, checked: true })))
    expect(approved.status).toBe('approved')
    const progress: string[] = []
    const statement = await iterations.issue(SVC.nwDecarb2025, it2.id, (k) => {
      progress.push(k)
    })
    expect(progress).toEqual(iterations.ISSUANCE_STEPS.map((s) => s.key))
    expect(statement.public_code).toMatch(/^VX-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(statement.hashes_json.length).toBe(7)
    expect((await services.get(SVC.nwDecarb2025)).service.status).toBe('issued')
    await as(USR.nwAdmin)
    const rec = await records.getDecarbRecord('dcu_nw_milk_2025')
    expect(rec.status).toBe('verified')
    expect(rec.verified_reduction_units).toBe(400_000)
    // PRD v0.3 FR-83: the record points to the statement and carries the level of assurance.
    expect(rec.assurance_ref).toBe(statement.id)
    expect(rec.level_of_assurance).toBe('reasonable')
    expect(rec.assurance_status).toBe('verified')
    expect(rec.assurance.history[0]?.event).toBe('written_back')
    await auth.signOut()
    const pub = await iterations.getPublicStatement(statement.public_code)
    expect(pub?.clientName).toBe('Northwind Dairy Cooperative')
  })

  it('ch.9 — timeline and log record everything', async () => {
    await as(USR.nwAdmin)
    const tl = await services.timeline(SVC.nwDecarb2025)
    expect(tl.rows.filter((r) => r.kind === 'step').length).toBeGreaterThan(10)
    const log = await services.log(SVC.nwDecarb2025)
    expect(log[0].event_type).toBe('opinion.issued')
    expect(log.some((e) => e.event_type === 'iteration.ir_approved')).toBe(true)
  })

  it('ch.10 — preview features and interest signals', async () => {
    await as(USR.nwAdmin)
    const flags = await features.list()
    expect(flags.find((f) => f.key === 'mcp')?.state).toBe('preview')
    expect(flags.find((f) => f.key === 'public_statement')?.state).toBe('enabled')
    await features.registerInterest('mcp', 'We use an agentic carbon-accounting tool.')
    await as(USR.mgr)
    const interest = await features.staffInterest()
    expect(interest.some((i) => i.flagKey === 'mcp' && i.orgName === 'Northwind Dairy Cooperative')).toBe(true)
  })

  it('ch.11 — administration: Sam sees the whole platform, deactivates a user and cannot touch an engagement', async () => {
    await as(USR.admin)
    const me = await auth.me()
    expect(me.isAdmin).toBe(true)
    expect(me.role).toBe('platform_admin')

    // Rollups, including money (only ADMIN gets money).
    const st = await admin.stats()
    expect(st.totals.started).toBeGreaterThanOrEqual(10)
    expect(st.totals.issued).toBeGreaterThanOrEqual(5)
    expect(st.money).not.toBeNull()
    const eur = st.money!.find((m) => m.currency === 'EUR')!
    expect(eur.invoicedMinor).toBeGreaterThan(0)
    expect(eur.outstandingMinor).toBe(eur.invoicedMinor - eur.paidMinor)
    expect(st.byClient[0].orgName).toBe('Northwind Dairy Cooperative')
    expect(st.cycleTimes.requestToContractMedianDays).not.toBeNull()
    expect(st.coiPending.some((c) => c.userName === 'Priya Natarajan')).toBe(true)
    expect(st.byStaff.find((x) => x.name === 'Helena Brandt')).toBeDefined()
    expect(st.byStaff.some((x) => x.name === 'Sam Okafor')).toBe(false)
    const filtered = await admin.stats({ orgId: 'org_solstice' })
    expect(filtered.byClient.every((c) => c.orgId === 'org_solstice' || c.started + c.ongoing + c.issued + c.closed === 0)).toBe(true)

    // Reads everywhere.
    const all = await services.list({})
    expect(all.length).toBeGreaterThanOrEqual(10)
    expect((await services.get(SVC.nwInv2025)).service.id).toBe(SVC.nwInv2025)
    expect((await admin.listOrgs()).find((o) => o.id === 'org_northwind')?.portfolioManagerName).toBe('Helena Brandt')

    // Users and deactivation with the reassignment summary.
    const users = await admin.listUsers()
    const pieter = users.find((u) => u.id === USR.nwContrib)!
    expect(pieter.openWork).toBeGreaterThanOrEqual(0)
    await expect(admin.deactivateUser(USR.nwContrib, 'short')).rejects.toMatchObject({ code: 'validation' })
    await expect(admin.deactivateUser(USR.admin, 'Trying to deactivate myself by mistake')).rejects.toMatchObject({ code: 'validation' })
    const summary = await admin.deactivateUser(USR.nwContrib, 'Left Northwind on 30 September 2026 (HR ticket 4471).')
    expect(summary.userName).toBe('Pieter de Jong')
    expect(summary.notifiedManagers).toContain('Helena Brandt')
    const after = (await admin.listUsers({ status: 'disabled' })).find((u) => u.id === USR.nwContrib)!
    expect(after.status).toBe('disabled')
    expect(after.deactivationReason).toMatch(/HR ticket/)
    const log = await admin.auditLog({ type: 'admin.' })
    expect(log[0].event_type).toBe('admin.user_deactivated')
    expect(log[0].reason).toMatch(/HR ticket/)
    expect((await admin.auditLog({ authOnly: true })).some((e) => e.event_type === 'auth.signed_in' && e.actorName === 'Sam Okafor')).toBe(true)
    expect(auth.listPersonas().find((p) => p.userId === USR.nwContrib)?.disabled).toBe(true)
    await admin.reactivateUser(USR.nwContrib)
    expect((await admin.listUsers()).find((u) => u.id === USR.nwContrib)!.status).toBe('active')

    // Settings: announcement goes live for everyone, flag default changes.
    const ann = (await admin.listAnnouncements())[0]
    await admin.updateAnnouncement(ann.id, { active: true })
    expect(admin.activeAnnouncementsSync().map((a) => a.id)).toContain(ann.id)
    await admin.setFlagDefault('portfolios', 'preview')
    expect((await admin.listFlagDefaults()).find((f) => f.key === 'portfolios')?.defaultState).toBe('preview')
    expect((await admin.coiRegister()).length).toBeGreaterThan(5)

    // Break-glass: content is gated until a reason is given.
    expect(admin.canReadEvidenceContentSync(SVC.nwInv2025)).toBe(false)
    await admin.breakGlass(SVC.nwInv2025, 'Support ticket 2210: client cannot open the activity data sample.')
    expect(admin.canReadEvidenceContentSync(SVC.nwInv2025)).toBe(true)

    // ADMIN never changes engagement or record data.
    const detail = await services.get(SVC.nwInv2025)
    const step = detail.phases.flatMap((p) => p.steps).find((s) => s.status !== 'completed' && s.status !== 'skipped')!
    await expect(services.transitionStep(SVC.nwInv2025, step.id, 'complete')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(services.overrideStep(SVC.nwInv2025, step.id, 'complete', 'Administrators must not be able to do this')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(services.hold(SVC.nwInv2025, 'no')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(upload(SVC.nwInv2025, slot(detail, 'org_chart').id, 'x.pdf')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(invoices.upsert(SVC.nwInv2025, { kind: 'invoice', reference: 'X', amountMinor: 1, currency: 'EUR', issuedAt: null, dueAt: null, status: 'sent' })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(records.setVerifiedDecarb('dcu_nw_milk_2025', { reduction: 1, removal: 0 })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(team.nominate(SVC.atlasDecarb2025, [{ userId: USR.fin, role: 'verifier_auditor' }])).rejects.toMatchObject({ code: 'forbidden' })
    // …and nobody else can use the admin api.
    await as(USR.mgr)
    await expect(admin.listUsers()).rejects.toMatchObject({ code: 'forbidden' })
    await expect(admin.stats()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('ch.12 — manager override: Helena forces a step with a reason and the next action moves', async () => {
    await as(USR.mgr)
    let detail = await services.get(SVC.nwInv2025)
    const current = detail.phases.flatMap((p) => p.steps).find((s) => s.status !== 'completed' && s.status !== 'skipped')!
    await expect(services.overrideStep(SVC.nwInv2025, current.id, 'complete', 'too short')).rejects.toMatchObject({ code: 'validation' })
    const reason = 'Client evidence reviewed off-platform during the site visit; closing to keep the plan.'
    const forced = await services.overrideStep(SVC.nwInv2025, current.id, 'complete', reason)
    expect(forced.status).toBe('completed')
    expect(forced.closed_by).toBe(USR.mgr)
    detail = await services.get(SVC.nwInv2025)
    expect(detail.nextAction?.step_id).not.toBe(current.id)
    const log = await services.log(SVC.nwInv2025, { types: ['step.overridden'] })
    expect(log[0].reason).toBe(reason)
    expect(log[0].summary).toMatch(/^Override:/)
    // Reopen by override, then the normal flow is back.
    const reopened = await services.overrideStep(SVC.nwInv2025, current.id, 'reopen', 'Reopened: the site-visit notes were incomplete after all.')
    expect(reopened.status).toBe('in_progress')
    // Impartiality cannot be forced: the Atlas team nomination is waiting for a COI declaration.
    const atlas = await services.get(SVC.atlasDecarb2025)
    const nomination = atlas.phases.flatMap((p) => p.steps).find((s) => s.key === 'team_nomination')!
    await expect(services.overrideStep(SVC.atlasDecarb2025, nomination.id, 'complete', 'Trying to skip the impartiality gate')).rejects.toMatchObject({ code: 'conflict' })
    // Reassign the auditor role from Priya to Jonas; Jonas must declare COI.
    const priya = atlas.team.find((t) => t.userId === USR.aud)!
    const teamAfter = await team.reassign(SVC.atlasDecarb2025, priya.id, USR.fin, 'Priya is on leave until November; Jonas takes the data review.')
    expect(teamAfter.some((t) => t.userId === USR.aud)).toBe(false)
    const jonas = teamAfter.find((t) => t.userId === USR.fin)!
    expect(jonas.role).toBe('verifier_auditor')
    expect(jonas.coi?.status).toBe('required')
    // Service override: hold and resume with reasons, both logged as overrides.
    const beforeHold = (await services.get(SVC.solVer2025)).service.status
    await services.overrideService(SVC.solVer2025, 'hold', 'Client asked to pause until the new site manager starts.')
    expect((await services.get(SVC.solVer2025)).service.status).toBe('on_hold')
    await services.overrideService(SVC.solVer2025, 'resume', 'New site manager confirmed; resuming the plan.')
    expect((await services.get(SVC.solVer2025)).service.status).toBe(beforeHold)
    expect((await services.log(SVC.solVer2025, { types: ['service.overridden'] })).length).toBe(2)
    // Planned dates.
    const replanned = await services.replanStep(SVC.nwInv2025, current.id, { plannedStart: current.planned_start, plannedEnd: '2026-12-31' }, 'Site visit moved.')
    expect(replanned.planned_end).toBe('2026-12-31')
    // Only managers override.
    await as(USR.tl)
    await expect(services.overrideStep(SVC.nwInv2025, current.id, 'complete', 'Team leaders cannot override steps')).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('reset restores the seed', async () => {
    demo.resetDemo()
    await as(USR.nwAdmin)
    expect((await services.get(SVC.nwDecarb2025)).service.status).toBe('opinion_review')
  })
})

/**
 * Template → service rows (PRD FR-11, §8.5). Copies the template so later template edits do not change running services.
 */
import type { Approval, AuditColumns, DocumentSlot, Phase, Step } from '../schemas'
import type { WorkflowTemplate } from './template.schema'

const DAY_MS = 86_400_000

/** UTC-only date helpers so planned dates never shift with the machine's timezone. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}
export function parseDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00Z`)
}
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface InstantiateOptions {
  serviceId: string
  template: WorkflowTemplate
  /** First planned day (YYYY-MM-DD). */
  startDate: string
  now: string
  actorId: string | null
  newId: (prefix: string) => string
}

export interface Instantiated {
  phases: Phase[]
  steps: Step[]
  slots: DocumentSlot[]
  approvals: Approval[]
}

function audit(now: string, actorId: string | null): AuditColumns {
  return { created_at: now, created_by: actorId, updated_at: now, updated_by: actorId, version: 0, deleted_at: null }
}

export function instantiateTemplate(opts: InstantiateOptions): Instantiated {
  const { serviceId, template, now, actorId, newId } = opts
  const phases: Phase[] = []
  const steps: Step[] = []
  const slots: DocumentSlot[] = []
  const approvals: Approval[] = []
  let cursor = parseDate(opts.startDate)

  template.phases.forEach((pt, phaseIdx) => {
    const phaseId = newId('phase')
    const phaseStart = cursor
    let stepOrder = 0
    for (const st of pt.steps) {
      const stepId = newId('step')
      const planned_start = isoDate(cursor)
      const planned_end = isoDate(addDays(cursor, st.planned_duration_days))
      steps.push({
        ...audit(now, actorId),
        id: stepId,
        service_id: serviceId,
        phase_id: phaseId,
        key: st.key,
        name: st.name,
        description: st.description,
        order_no: stepOrder++,
        owner_role: st.owner_role,
        status: 'not_started',
        planned_start,
        planned_end,
        actual_start: null,
        actual_end: null,
        parallel_allowed: st.parallel_allowed,
        checklist_json: st.checklist.map((c) => ({ ...c, checked: false })),
        closed_by: null,
        closed_at: null,
      })
      for (const sl of st.slots) {
        slots.push({
          ...audit(now, actorId),
          id: newId('slot'),
          service_id: serviceId,
          step_id: stepId,
          key: sl.key,
          name: sl.name,
          description: sl.description,
          category: sl.category,
          required: sl.required,
          uploader_party: sl.uploader_party,
          current_document_id: null,
          status: 'empty',
        })
      }
      for (const ap of st.approvals) {
        approvals.push({
          ...audit(now, actorId),
          id: newId('appr'),
          service_id: serviceId,
          step_id: stepId,
          kind: ap.kind,
          label: ap.label,
          status: 'pending',
          decided_by: null,
          decided_at: null,
          comment: null,
          evidence_json: null,
        })
      }
      // Parallel steps share the start of the previous step; sequential steps follow it.
      if (!st.parallel_allowed) cursor = addDays(cursor, st.planned_duration_days)
    }
    phases.push({
      ...audit(now, actorId),
      id: phaseId,
      service_id: serviceId,
      key: pt.key,
      name: pt.name,
      order_no: phaseIdx,
      status: 'not_started',
      planned_start: isoDate(phaseStart),
      planned_end: isoDate(cursor),
      actual_start: null,
      actual_end: null,
    })
  })

  return { phases, steps, slots, approvals }
}

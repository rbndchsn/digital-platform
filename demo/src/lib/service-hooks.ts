import { useQuery } from '@tanstack/react-query'
import { cases, competence, documents, findings, involved, iterations, materiality, postIssuance, services, team } from '@/api'
import type { Action } from '@/domain/policy'

export function useService(serviceId: string) {
  return useQuery({ queryKey: ['service', serviceId], queryFn: () => services.get(serviceId) })
}

export function useServiceDocuments(serviceId: string) {
  return useQuery({ queryKey: ['documents', serviceId], queryFn: () => documents.listForService(serviceId) })
}

export function useServiceFindings(serviceId: string) {
  return useQuery({ queryKey: ['findings', serviceId], queryFn: () => findings.list(serviceId) })
}

export function useIterations(serviceId: string) {
  return useQuery({ queryKey: ['iterations', serviceId], queryFn: () => iterations.list(serviceId) })
}

export function useStatement(serviceId: string) {
  return useQuery({ queryKey: ['statement', serviceId], queryFn: () => iterations.getStatement(serviceId) })
}

/** Every statement of the service, newest first (issued, superseded, withdrawn; PRD v0.3 FR-89, FR-90). */
export function useStatements(serviceId: string) {
  return useQuery({ queryKey: ['statements', serviceId], queryFn: () => iterations.listStatements(serviceId) })
}

export function useTimeline(serviceId: string) {
  return useQuery({ queryKey: ['timeline', serviceId], queryFn: () => services.timeline(serviceId) })
}

// ---------------------------------------------------------------- PRD v0.3
export function useMateriality(serviceId: string) {
  return useQuery({ queryKey: ['materiality', serviceId], queryFn: () => materiality.get(serviceId) })
}

export function useMisstatements(serviceId: string, enabled = Boolean(serviceId)) {
  return useQuery({ queryKey: ['misstatements', serviceId], queryFn: () => materiality.list(serviceId), enabled })
}

export function useAggregation(serviceId: string, iterationId?: string) {
  return useQuery({ queryKey: ['aggregation', serviceId, iterationId ?? 'latest'], queryFn: () => materiality.aggregate(serviceId, iterationId) })
}

export function usePostIssuanceEvents(serviceId: string, enabled = true) {
  return useQuery({ queryKey: ['postIssuance', serviceId], queryFn: () => postIssuance.list(serviceId), enabled })
}

/** PRD §10.2 `GET /services/:id/eligibility?action=`: whether the viewer may take a decision, with the reasons. */
export function useEligibility(serviceId: string, action: Action, enabled = true) {
  return useQuery({ queryKey: ['eligibility', serviceId, action], queryFn: () => involved.eligibility(serviceId, action), enabled })
}

/** Latest stored competence and rotation check per team row (PRD FR-96). */
export function useTeamChecks(serviceId: string) {
  return useQuery({ queryKey: ['teamChecks', serviceId], queryFn: async () => team.checksForTeamSync(serviceId) })
}

/** Competence profiles of the verifier staff; fails quietly for roles without `competence.read`. */
export function useProfiles(enabled = true) {
  return useQuery({ queryKey: ['competence', 'profiles'], queryFn: () => competence.listProfiles(), enabled, retry: false })
}

export function useMyCases(enabled = true) {
  return useQuery({ queryKey: ['cases', 'mine'], queryFn: cases.listMine, enabled })
}

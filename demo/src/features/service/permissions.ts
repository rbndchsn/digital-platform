/**
 * What the viewer may do on a service, derived from the session and the service team. The platform administrator
 * (PRD §3.2 v0.2) is read-only: every capability is false and `readOnly` is true, so no action control renders.
 * PRD v0.3 adds materiality, misstatements and post-issuance powers.
 */
import type { ServiceDetail } from '@/api/services'
import type { ServiceRole } from '@/domain/enums'
import { useMe } from '@/lib/auth'

export function useServicePermissions(d: ServiceDetail | undefined) {
  const me = useMe()
  const isVerifier = me.org.type === 'verifier'
  const readOnly = me.isAdmin
  const isManager = isVerifier && !readOnly && me.role === 'verifier_manager'
  const roles = d?.myRoles ?? []
  const onTeam = (r: ServiceRole) => !readOnly && roles.includes(r)
  const isClientActor = !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner' || me.role === 'client_contributor')
  const isTeamLeader = onTeam('verifier_team_leader')
  return {
    isVerifier,
    readOnly,
    isManager,
    isTeamLeader,
    isClientActor,
    canTransition: isManager || isTeamLeader || onTeam('verifier_auditor') || onTeam('verifier_technical_expert'),
    canCheck: isManager || isTeamLeader || onTeam('verifier_auditor') || onTeam('verifier_technical_expert'),
    canUploadClient: isClientActor,
    canUploadVerifier: isManager || (!readOnly && me.role === 'verifier_coordinator') || isTeamLeader || onTeam('verifier_auditor') || onTeam('verifier_coordinator'),
    canDecideVerifierApprovals: isManager,
    canDecideClientApprovals: !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner'),
    canNominate: isManager,
    /** Manager overrides (PRD §6.14): step status, team reassignment. */
    canOverride: isManager,
    /** Planned dates: manager or the team leader (PRD FR-76). */
    canReplan: isManager || isTeamLeader,
    canDeleteClient: !isVerifier && (me.role === 'client_admin' || me.role === 'client_owner'),
    /** PRD v0.3 FR-84: the team leader sets materiality; a manager approves it (plan_v1 §8 D25). */
    canSetMateriality: isManager || isTeamLeader,
    canApproveMateriality: isManager,
    /** PRD v0.3 FR-85: team leader, auditor and technical expert on the team; the manager before issuance. */
    canManageMisstatements: isManager || isTeamLeader || onTeam('verifier_auditor') || onTeam('verifier_technical_expert'),
    /** PRD v0.3 FR-88: a manager opens post-issuance events; the decision is checked against the involved set. */
    canOpenPostIssuance: isManager,
    canPrepareIteration: isManager || isTeamLeader,
  }
}

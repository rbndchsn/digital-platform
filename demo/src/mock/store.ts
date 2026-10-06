/**
 * In-memory tables with a sessionStorage snapshot (plan_v1 §0.2: no localStorage, no IndexedDB).
 * Pages never import this module; they use `@/api/*`.
 */
import type {
  Announcement,
  ApiClient,
  Approval,
  AuditEvent,
  Case,
  CaseNote,
  CoiDeclaration,
  CompetenceProfile,
  CompetenceQualification,
  DecarbUnitRecord,
  Document,
  DocumentSlot,
  DocumentVersion,
  EmissionFactor,
  EmissionProfile,
  EmissionProfileGas,
  EvidenceLink,
  FeatureFlag,
  FeatureFlagOverride,
  FeatureInterest,
  Finding,
  FindingResponse,
  Inventory,
  InventoryLine,
  InventoryLineGas,
  Invoice,
  IterationDocument,
  LegacyEngagement,
  MaterialitySetting,
  Membership,
  Misstatement,
  NominationCheck,
  Notification,
  OpinionIteration,
  OpinionStatement,
  Organisation,
  Phase,
  PlatformSettings,
  PostIssuanceEvent,
  Project,
  RecordAssuranceHistory,
  Service,
  ServiceTeamMember,
  Step,
  User,
} from '@/domain/schemas'
import type { WorkflowTemplate } from '@/domain/workflow/template.schema'

export interface Tables {
  organisations: Organisation[]
  users: User[]
  memberships: Membership[]
  apiClients: ApiClient[]
  projects: Project[]
  services: Service[]
  phases: Phase[]
  steps: Step[]
  slots: DocumentSlot[]
  approvals: Approval[]
  team: ServiceTeamMember[]
  cois: CoiDeclaration[]
  documents: Document[]
  documentVersions: DocumentVersion[]
  evidenceLinks: EvidenceLink[]
  findings: Finding[]
  findingResponses: FindingResponse[]
  iterations: OpinionIteration[]
  iterationDocuments: IterationDocument[]
  statements: OpinionStatement[]
  inventories: Inventory[]
  inventoryLines: InventoryLine[]
  inventoryLineGases: InventoryLineGas[]
  emissionFactors: EmissionFactor[]
  profiles: EmissionProfile[]
  profileGases: EmissionProfileGas[]
  decarbRecords: DecarbUnitRecord[]
  invoices: Invoice[]
  notifications: Notification[]
  auditEvents: AuditEvent[]
  featureFlags: FeatureFlag[]
  flagOverrides: FeatureFlagOverride[]
  featureInterest: FeatureInterest[]
  templates: WorkflowTemplate[]
  platformSettings: PlatformSettings[]
  announcements: Announcement[]
  // PRD v0.3
  materialitySettings: MaterialitySetting[]
  misstatements: Misstatement[]
  postIssuanceEvents: PostIssuanceEvent[]
  recordAssuranceHistory: RecordAssuranceHistory[]
  cases: Case[]
  caseNotes: CaseNote[]
  competenceProfiles: CompetenceProfile[]
  competenceQualifications: CompetenceQualification[]
  nominationChecks: NominationCheck[]
  legacyEngagements: LegacyEngagement[]
}

export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T][number]

export interface SessionState {
  /** Signed-in persona (user id) and active org. */
  userId: string | null
  orgId: string | null
  /** Services for which the platform administrator holds break-glass evidence access this session (PRD FR-70). */
  breakGlassServiceIds: string[]
  /** Demo bookkeeping. */
  seededAt: string
  storylineChapter: number
}

interface Snapshot {
  schema: number
  tables: Tables
  session: SessionState
}

const STORAGE_KEY = 'vx.demo.v1'
/** Bumped per release (2: v0.2 ADMIN tables; 3: v0.3 governance tables and record columns); an older snapshot reseeds silently (plan_v1 §8 D10). */
const SCHEMA = 3

const EMPTY_SESSION = (): SessionState => ({ userId: null, orgId: null, breakGlassServiceIds: [], seededAt: new Date().toISOString(), storylineChapter: 0 })

type Listener = () => void

export class Store {
  private tables: Tables
  private session: SessionState
  private listeners = new Set<Listener>()
  private persistScheduled = false

  constructor(seed: () => Tables) {
    const restored = Store.readSnapshot()
    if (restored) {
      this.tables = restored.tables
      this.session = restored.session
    } else {
      this.tables = seed()
      this.session = EMPTY_SESSION()
      this.persist()
    }
  }

  // ---------------------------------------------------------------- reads
  all<T extends TableName>(table: T): Tables[T] {
    return this.tables[table]
  }

  find<T extends TableName>(table: T, id: string): Row<T> | undefined {
    return (this.tables[table] as Array<{ id?: string }>).find((r) => r.id === id) as Row<T> | undefined
  }

  get<T extends TableName>(table: T, id: string): Row<T> {
    const row = this.find(table, id)
    if (!row) throw new NotFoundError(table, id)
    return row
  }

  where<T extends TableName>(table: T, pred: (row: Row<T>) => boolean): Row<T>[] {
    return (this.tables[table] as Row<T>[]).filter(pred)
  }

  getSession(): SessionState {
    return this.session
  }

  // ---------------------------------------------------------------- writes
  insert<T extends TableName>(table: T, row: Row<T>): Row<T> {
    ;(this.tables[table] as Row<T>[]).push(row)
    this.changed()
    return row
  }

  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>, actorId: string | null = null): Row<T> {
    const rows = this.tables[table] as Array<Row<T> & { id?: string; version?: number; updated_at?: string; updated_by?: string | null }>
    const idx = rows.findIndex((r) => r.id === id)
    if (idx < 0) throw new NotFoundError(table, id)
    const current = rows[idx]
    const next = { ...current, ...patch } as typeof current
    if (typeof current.version === 'number') {
      next.version = current.version + 1
      next.updated_at = new Date().toISOString()
      next.updated_by = actorId
    }
    rows[idx] = next
    this.changed()
    return next as Row<T>
  }

  remove<T extends TableName>(table: T, id: string): void {
    const rows = this.tables[table] as Array<{ id?: string }>
    const idx = rows.findIndex((r) => r.id === id)
    if (idx >= 0) rows.splice(idx, 1)
    this.changed()
  }

  setSession(patch: Partial<SessionState>): void {
    this.session = { ...this.session, ...patch }
    this.changed()
  }

  /** Replace everything with fresh seed data (Demo panel → Reset). */
  reset(seed: () => Tables): void {
    this.tables = seed()
    this.session = EMPTY_SESSION()
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    this.changed()
  }

  // ---------------------------------------------------------------- subscriptions and persistence
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private changed(): void {
    for (const l of this.listeners) l()
    if (this.persistScheduled) return
    this.persistScheduled = true
    queueMicrotask(() => {
      this.persistScheduled = false
      this.persist()
    })
  }

  private persist(): void {
    try {
      const snap: Snapshot = { schema: SCHEMA, tables: this.tables, session: this.session }
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
    } catch {
      /* quota or unavailable: demo keeps running in memory */
    }
  }

  private static readSnapshot(): Snapshot | null {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const snap = JSON.parse(raw) as Snapshot
      if (snap.schema !== SCHEMA || !snap.tables || !snap.session) return null
      return snap
    } catch {
      return null
    }
  }
}

export class NotFoundError extends Error {
  constructor(
    readonly table: string,
    readonly id: string,
  ) {
    super(`${table}/${id} not found`)
    this.name = 'NotFoundError'
  }
}

let instance: Store | null = null
let seeder: (() => Tables) | null = null

export function configureStore(seed: () => Tables): void {
  seeder = seed
  instance = null
}

export function getStore(): Store {
  if (!instance) {
    if (!seeder) throw new Error('Store not configured: call configureStore(seed) first')
    instance = new Store(seeder)
  }
  return instance
}

export function resetStore(): void {
  if (!seeder) throw new Error('Store not configured')
  getStore().reset(seeder)
}

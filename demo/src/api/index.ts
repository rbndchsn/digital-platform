/**
 * The api surface pages use. Operation names follow the PRD endpoints (§10.2).
 * Phase II swaps the implementations for `fetch` without touching the pages.
 */
export * as auth from './auth'
export * as services from './services'
export * as projects from './projects'
export * as approvals from './approvals'
export * as team from './team'
export * as documents from './documents'
export * as findings from './findings'
export * as iterations from './iterations'
export * as records from './records'
export * as notifications from './notifications'
export * as features from './features'
export * as invoices from './invoices'
export * as dashboard from './dashboard'
export * as staff from './staff'
export * as admin from './admin'
export * as demo from './demo'
export { ApiError, getStore } from './core'
export type { ApiErrorCode } from './core'

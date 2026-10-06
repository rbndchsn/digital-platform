/** Time helpers. The seed is built relative to "today" so the demo always looks current. */

const DAY_MS = 86_400_000

let frozen: Date | null = null

export function freezeClock(date: Date | null): void {
  frozen = date
}

export function now(): Date {
  return frozen ? new Date(frozen) : new Date()
}

export function nowIso(): string {
  return now().toISOString()
}

export function todayIso(): string {
  return now().toISOString().slice(0, 10)
}

export function daysAgo(days: number, hour = 9, minute = 0): string {
  const d = new Date(now().getTime() - days * DAY_MS)
  d.setUTCHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function daysFromNow(days: number): string {
  return new Date(now().getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function dateDaysAgo(days: number): string {
  return daysAgo(days).slice(0, 10)
}

export function addDaysIso(yyyyMmDd: string, days: number): string {
  return new Date(new Date(`${yyyyMmDd}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** Simulated network behaviour for the demo: latency, "slow network" and "fail next call" toggles. */

export class MockNetworkError extends Error {
  constructor() {
    super('Simulated network error (demo panel: "fail next call")')
    this.name = 'MockNetworkError'
  }
}

const settings = {
  enabled: true,
  slow: false,
  failNext: false,
  baseMs: 180,
  jitterMs: 220,
}

export function setSlowNetwork(on: boolean): void {
  settings.slow = on
}
export function setFailNextCall(on: boolean): void {
  settings.failNext = on
}
export function setLatencyEnabled(on: boolean): void {
  settings.enabled = on
}
export function getNetworkSettings(): Readonly<typeof settings> {
  return settings
}

export async function simulateLatency(): Promise<void> {
  if (settings.failNext) {
    settings.failNext = false
    await wait(settings.enabled ? 400 : 0)
    throw new MockNetworkError()
  }
  if (!settings.enabled) return
  const ms = settings.baseMs + Math.random() * settings.jitterMs
  await wait(settings.slow ? ms * 6 : ms)
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

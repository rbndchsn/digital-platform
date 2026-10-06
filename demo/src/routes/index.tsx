import { createFileRoute } from '@tanstack/react-router'
import { useTheme } from '@/lib/theme'

export const Route = createFileRoute('/')({
  component: Placeholder,
})

function Placeholder() {
  const { theme, toggle } = useTheme()
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-fg grid size-10 place-items-center rounded-lg text-lg font-bold">✓</span>
        <h1 className="text-2xl font-semibold tracking-tight">VERIFASSUR_X</h1>
      </div>
      <p className="text-fg-muted max-w-md text-center">
        Assurance platform demo. The application shell is being built step by step; this placeholder confirms the
        deploy pipeline works.
      </p>
      <button
        type="button"
        onClick={toggle}
        className="border-border bg-surface hover:bg-surface-muted rounded-md border px-3 py-1.5 text-sm shadow-card"
      >
        Theme: {theme}
      </button>
    </main>
  )
}

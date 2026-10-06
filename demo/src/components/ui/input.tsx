import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const base =
  'bg-surface border-border text-fg placeholder:text-fg-subtle w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-danger'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-9', className)} {...props} />)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, 'min-h-20', className)} {...props} />)
Textarea.displayName = 'Textarea'

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'h-9 appearance-none bg-no-repeat pr-8', className)} style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237b8a89' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")", backgroundPosition: 'right 0.6rem center' }} {...props}>
    {children}
  </select>
))
NativeSelect.displayName = 'NativeSelect'

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-fg mb-1 block text-sm font-medium', className)} {...props} />
}

/** Label wraps the control so assistive tech (and tests) associate them without ids. */
export function Field({ label, hint, error, required, children, className }: { label: string; hint?: ReactNode; error?: string | null; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block">
        <span className="text-fg mb-1 block text-sm font-medium">
          {label}
          {required ? <span className="text-danger ml-0.5">*</span> : null}
        </span>
        {children}
      </label>
      {error ? <p className="text-danger text-xs">{error}</p> : hint ? <p className="text-fg-subtle text-xs">{hint}</p> : null}
    </div>
  )
}

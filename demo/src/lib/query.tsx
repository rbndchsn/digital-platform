/** TanStack Query client plus a mutation helper that invalidates everything and toasts errors. */
import { QueryClient, useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
})

export function describeError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Something went wrong.'
}

/**
 * Mutations in the demo invalidate every query on success: the mock store is tiny and this keeps
 * every screen consistent without hand-maintained invalidation lists.
 */
export function useAppMutation<TData, TVariables = void>(
  fn: (vars: TVariables) => Promise<TData>,
  opts: Omit<UseMutationOptions<TData, unknown, TVariables>, 'mutationFn'> & { successMessage?: string | ((data: TData) => string); silent?: boolean } = {},
) {
  const qc = useQueryClient()
  const { successMessage, silent, ...rest } = opts
  return useMutation<TData, unknown, TVariables>({
    mutationFn: fn,
    ...rest,
    onSuccess: async (data, vars, ctx, mutation) => {
      await qc.invalidateQueries()
      if (successMessage) toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage)
      await rest.onSuccess?.(data, vars, ctx, mutation)
    },
    onError: (e, vars, ctx, mutation) => {
      if (!silent) toast.error(describeError(e))
      rest.onError?.(e, vars, ctx, mutation)
    },
  })
}

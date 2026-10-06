import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/misc'
import { queryClient } from '@/lib/query'

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Outlet />
        <Toaster position="bottom-center" richColors closeButton toastOptions={{ duration: 3500 }} />
      </TooltipProvider>
    </QueryClientProvider>
  ),
})

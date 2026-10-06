/** Session context for the shell. Guards use `auth.sessionProbe()` synchronously in route `beforeLoad`. */
import { createContext, useContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auth } from '@/api'
import type { Me } from '@/api/auth'

const Ctx = createContext<Me | null>(null)

export function AuthProvider({ children, initial }: { children: ReactNode; initial: Me }) {
  const { data } = useQuery({ queryKey: ['me'], queryFn: auth.me, initialData: initial })
  return <Ctx.Provider value={data ?? initial}>{children}</Ctx.Provider>
}

export function useMe(): Me {
  const me = useContext(Ctx)
  if (!me) throw new Error('useMe outside AuthProvider')
  return me
}

export function useIsStaff(): boolean {
  return useMe().org.type === 'verifier'
}

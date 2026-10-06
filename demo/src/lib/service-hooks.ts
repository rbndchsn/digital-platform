import { useQuery } from '@tanstack/react-query'
import { documents, findings, iterations, services } from '@/api'

export function useService(serviceId: string) {
  return useQuery({ queryKey: ['service', serviceId], queryFn: () => services.get(serviceId) })
}

export function useServiceDocuments(serviceId: string) {
  return useQuery({ queryKey: ['documents', serviceId], queryFn: () => documents.listForService(serviceId) })
}

export function useServiceFindings(serviceId: string) {
  return useQuery({ queryKey: ['findings', serviceId], queryFn: () => findings.list(serviceId) })
}

export function useIterations(serviceId: string) {
  return useQuery({ queryKey: ['iterations', serviceId], queryFn: () => iterations.list(serviceId) })
}

export function useStatement(serviceId: string) {
  return useQuery({ queryKey: ['statement', serviceId], queryFn: () => iterations.getStatement(serviceId) })
}

export function useTimeline(serviceId: string) {
  return useQuery({ queryKey: ['timeline', serviceId], queryFn: () => services.timeline(serviceId) })
}

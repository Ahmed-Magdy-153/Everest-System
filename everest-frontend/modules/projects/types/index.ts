import type { Status } from '@/types'

export interface Project {
  id: string
  name: string
  nameAr: string
  clientName: string
  status: Status
  budget: number
  startDate: string
  endDate?: string
}

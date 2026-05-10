import type { Status } from '@/types'

export interface Contract {
  id: string
  title: string
  titleAr: string
  projectId: string
  clientName: string
  value: number
  signedDate: string
  status: Status
}

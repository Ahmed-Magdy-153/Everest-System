export type PaymentDirection = 'incoming' | 'outgoing'

export interface Payment {
  id: string
  direction: PaymentDirection
  amount: number
  date: string
  projectId?: string
  workerId?: string
  notes?: string
}

export type Locale = 'ar' | 'en'
export type Direction = 'rtl' | 'ltr'
export type Status = 'active' | 'inactive' | 'completed' | 'pending' | 'cancelled'
export type Currency = 'SAR' | 'USD'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface SelectOption {
  label: string
  value: string | number
}

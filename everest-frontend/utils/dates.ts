export const toISODate = (date: Date) => date.toISOString().split('T')[0]
export const today = () => toISODate(new Date())

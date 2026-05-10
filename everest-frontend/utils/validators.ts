export const isRequired = (value: unknown) => value !== undefined && value !== null && value !== ''
export const isPositiveNumber = (value: number) => typeof value === 'number' && value > 0

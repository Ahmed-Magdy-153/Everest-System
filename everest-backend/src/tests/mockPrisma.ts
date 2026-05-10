/**
 * Re-usable Prisma mock factory.
 * Import this ONLY inside vi.mock() factories — never at module top-level.
 * Each vi.mock() call creates fresh vi.fn() instances per test file.
 */
import { vi } from 'vitest'

export function createPrismaMock() {
  return {
    user:             { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    role:             { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    project:          { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    payment:          { findMany: vi.fn(), create: vi.fn() },
    expense:          { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    material:         { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    materialUsage:    { findMany: vi.fn(), create: vi.fn() },
    inventoryLog:     { findMany: vi.fn(), create: vi.fn() },
    worker:           { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workshop:         { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workerAssignment: { create: vi.fn(), update: vi.fn() },
    capitalEntry:     { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    contractItem:     { create: vi.fn(), update: vi.fn() },
    session:          { create: vi.fn(), delete: vi.fn() },
    $transaction:     vi.fn(),
  }
}

export type PrismaMock = ReturnType<typeof createPrismaMock>

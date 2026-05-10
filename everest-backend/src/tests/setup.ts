// Only env vars here — vi.mock must live in each test file for hoisting to work
process.env.JWT_SECRET     = 'test-secret-key-for-vitest'
process.env.JWT_EXPIRES_IN = '1h'
process.env.DATABASE_URL   = 'postgresql://test:test@localhost:5432/test'
process.env.DIRECT_URL     = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV       = 'test'

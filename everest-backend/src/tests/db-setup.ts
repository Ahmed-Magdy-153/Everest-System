/**
 * Setup for real database integration tests.
 *
 * Safety rules enforced here:
 *  1. Loads credentials from .env.test — NOT from .env (production).
 *  2. Requires TEST_DATABASE_URL to be explicitly set. If it is missing the
 *     test run aborts immediately with a clear error — no silent fallback to
 *     the production DATABASE_URL ever happens.
 *  3. Overrides DATABASE_URL and DIRECT_URL with the test values so Prisma
 *     always connects to the test database, regardless of what .env contains.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.test (test credentials) — does NOT touch .env (production)
config({ path: resolve(process.cwd(), '.env.test') })

// ── Hard guard — fail immediately if test DB is not configured ────────────────
if (!process.env.TEST_DATABASE_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  DATABASE TEST SETUP ERROR                                       ║
║                                                                  ║
║  TEST_DATABASE_URL is not set.                                   ║
║                                                                  ║
║  Database integration tests MUST run against a dedicated test    ║
║  Supabase project — never against the production database.       ║
║                                                                  ║
║  Steps to fix:                                                   ║
║  1. Create a second free Supabase project for testing.           ║
║  2. Run: npx prisma db push  (using the test project URLs).      ║
║  3. Copy .env.test.example → .env.test                           ║
║  4. Fill in the test project connection strings.                 ║
║  5. Re-run: npm run test:db                                      ║
╚══════════════════════════════════════════════════════════════════╝
`)
  process.exit(1)
}

// ── Inject test credentials into process.env ─────────────────────────────────
// Prisma reads DATABASE_URL and DIRECT_URL at client instantiation time.
// We override them here so no code path can accidentally use the production URL.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.DIRECT_URL   = process.env.TEST_DIRECT_URL ?? process.env.TEST_DATABASE_URL

// Confirm isolation in test output
console.log(`\n[DB Tests] Connected to TEST database`)
console.log(`[DB Tests] Host: ${new URL(process.env.DATABASE_URL.replace('?pgbouncer=true', '')).hostname}\n`)

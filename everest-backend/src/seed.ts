/**
 * Seed script — creates the initial roles and the first admin user.
 * Run with:  npm run db:seed
 *
 * Credentials created:
 *   admin@everest.com  /  admin123   (owner role — full access)
 *   manager@everest.com / manager123 (manager role — limited access)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱  Seeding database...\n')

  // ── Roles ────────────────────────────────────────────────────────────────────
  const ownerRole = await prisma.role.upsert({
    where:  { name: 'owner' },
    update: {},
    create: {
      name: 'owner',
      permissions: {
        manageCapital:   true,
        manageProjects:  true,
        manageInventory: true,
        manageExpenses:  true,
        manageWorkers:   true,
        manageUsers:     true,
        viewReports:     true,
        deleteProjects:  true,
        exportData:      true,
      },
    },
  })

  const managerRole = await prisma.role.upsert({
    where:  { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      permissions: {
        manageCapital:   false,
        manageProjects:  true,
        manageInventory: true,
        manageExpenses:  true,
        manageWorkers:   true,
        manageUsers:     false,
        viewReports:     true,
        deleteProjects:  false,
        exportData:      false,
      },
    },
  })

  const accountantRole = await prisma.role.upsert({
    where:  { name: 'accountant' },
    update: {},
    create: {
      name: 'accountant',
      permissions: {
        manageCapital:   true,
        manageProjects:  false,
        manageInventory: false,
        manageExpenses:  true,
        manageWorkers:   false,
        manageUsers:     false,
        viewReports:     true,
        deleteProjects:  false,
        exportData:      true,
      },
    },
  })

  console.log('✅  Roles created:', ownerRole.name, '|', managerRole.name, '|', accountantRole.name)

  // ── Users ────────────────────────────────────────────────────────────────────
  const adminPassword   = await bcrypt.hash('admin123',   12)
  const managerPassword = await bcrypt.hash('manager123', 12)

  const adminUser = await prisma.user.upsert({
    where:  { email: 'admin@everest.com' },
    update: {},
    create: {
      name:     'مدير النظام',
      email:    'admin@everest.com',
      password: adminPassword,
      roleId:   ownerRole.id,
      avatar:   'م',
      color:    '#B8860B',
      status:   'active',
    },
  })

  const managerUser = await prisma.user.upsert({
    where:  { email: 'manager@everest.com' },
    update: {},
    create: {
      name:     'مدير المشاريع',
      email:    'manager@everest.com',
      password: managerPassword,
      roleId:   managerRole.id,
      avatar:   'أ',
      color:    '#1A2744',
      status:   'active',
    },
  })

  console.log('✅  Users created:')
  console.log(`    📧  ${adminUser.email}   password: admin123   (${ownerRole.name})`)
  console.log(`    📧  ${managerUser.email} password: manager123 (${managerRole.name})`)
  console.log('\n🎉  Seed complete!\n')
}

main()
  .catch((e) => { console.error('❌  Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

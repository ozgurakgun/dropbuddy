import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'great-western' },
    update: {},
    create: {
      name: 'Great Western Kitchen',
      slug: 'great-western',
      description: 'Demo restaurant tenant',
      addressLabel: 'Great Western Rd, Glasgow',
      latitude: 55.8735,
      longitude: -4.2905,
    },
  })

  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@dropbuddy.local' },
    update: {
      password: passwordHash,
      isSuperAdmin: true,
      isRestaurantAdmin: false,
      isDriver: false,
      tenantId: null,
    },
    create: {
      email: 'superadmin@dropbuddy.local',
      name: 'DropBuddy Superadmin',
      password: passwordHash,
      isSuperAdmin: true,
    },
  })

  const restaurantAdmin = await prisma.user.upsert({
    where: { email: 'admin@greatwestern.local' },
    update: {
      password: passwordHash,
      isRestaurantAdmin: true,
      isDriver: false,
      isSuperAdmin: false,
      tenantId: tenant.id,
    },
    create: {
      email: 'admin@greatwestern.local',
      name: 'Restaurant Admin',
      password: passwordHash,
      isRestaurantAdmin: true,
      tenantId: tenant.id,
    },
  })

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@greatwestern.local' },
    update: {
      password: passwordHash,
      isDriver: true,
      isRestaurantAdmin: false,
      isSuperAdmin: false,
      tenantId: tenant.id,
    },
    create: {
      email: 'driver@greatwestern.local',
      name: 'Demo Driver',
      password: passwordHash,
      isDriver: true,
      tenantId: tenant.id,
    },
  })

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: { tenantId: tenant.id, isActive: true },
    create: {
      userId: driverUser.id,
      tenantId: tenant.id,
      isActive: true,
    },
  })

  console.log('Seeded users:')
  console.log(`  superadmin: ${superadmin.email} / password123`)
  console.log(`  restaurant: ${restaurantAdmin.email} / password123`)
  console.log(`  driver:     ${driverUser.email} / password123`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

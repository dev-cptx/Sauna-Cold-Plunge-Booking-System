import { PrismaClient, DayOfWeek } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@antigravity.id'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!'

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: process.env.SEED_ADMIN_NAME ?? 'Admin',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'SUPER_ADMIN',
    },
  })
  console.log(`✓ Admin user: ${adminEmail}`)

  // Operational hours (Mon–Sun)
  const schedule: { day: DayOfWeek; open: string; close: string }[] = [
    { day: 'MONDAY',    open: '09:00', close: '22:00' },
    { day: 'TUESDAY',   open: '09:00', close: '22:00' },
    { day: 'WEDNESDAY', open: '09:00', close: '22:00' },
    { day: 'THURSDAY',  open: '09:00', close: '22:00' },
    { day: 'FRIDAY',    open: '09:00', close: '23:00' },
    { day: 'SATURDAY',  open: '08:00', close: '23:00' },
    { day: 'SUNDAY',    open: '08:00', close: '21:00' },
  ]

  for (const s of schedule) {
    await prisma.operationalHours.upsert({
      where: { dayOfWeek: s.day },
      update: {},
      create: {
        dayOfWeek: s.day,
        openTime: s.open,
        closeTime: s.close,
        slotDuration: 90,     // 90-minute sessions
        breakBetweenSlots: 30, // 30-minute turnaround
      },
    })
  }
  console.log('✓ Operational hours set')

  // Default pricing config (skip if already seeded)
  const existingConfig = await prisma.pricingConfig.findFirst()
  if (!existingConfig) {
    await prisma.pricingConfig.create({
      data: {
        // Weekday: two peak windows
        weekdayMorningPeakStart:   '07:00',
        weekdayMorningPeakEnd:     '10:00',
        weekdayAfternoonPeakStart: '17:00',
        weekdayAfternoonPeakEnd:   '22:00',
        // Weekend: one peak window
        weekendPeakStart: '10:00',
        weekendPeakEnd:   '22:00',
        // Per-pax rates (IDR): [1 person, 2, 3, 4, 5]
        rates: {
          weekdayOffPeak:       [130000, 125000, 120000, 115000, 110000],
          weekdayMorningPeak:   [150000, 145000, 140000, 135000, 130000],
          weekdayAfternoonPeak: [180000, 175000, 170000, 165000, 160000],
          weekendOffPeak:       [160000, 155000, 150000, 145000, 140000],
          weekendPeak:          [200000, 195000, 190000, 185000, 180000],
        },
      },
    })
    console.log('✓ Default pricing config created')
  } else {
    console.log('✓ Pricing config already exists — skipped')
  }

  console.log('\nSeeding complete.')
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

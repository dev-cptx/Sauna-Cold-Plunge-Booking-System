import { prisma } from './prisma'
import { eachDayOfInterval, format, getDay } from 'date-fns'
import type { DayOfWeek } from '@prisma/client'
import { timeToMinutes, minutesToTime } from './utils'

const JS_DAY_TO_PRISMA: Record<number, DayOfWeek> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
  4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

export interface GenerateOptions {
  /** Override operational-hours open time, e.g. "10:00" */
  startTime?: string
  /** Override operational-hours close time, e.g. "20:00" */
  endTime?: string
  /** Session length in minutes — overrides operational hours value */
  slotDuration?: number
  /** Buffer between sessions in minutes — overrides operational hours value */
  breakBetween?: number
  /** Max pax per slot — defaults to 10 */
  capacity?: number
}

export async function generateSlotsForDateRange(
  startDate: Date,
  endDate: Date,
  overrides: GenerateOptions = {}
): Promise<number> {
  const [opHours, blockedDates] = await Promise.all([
    prisma.operationalHours.findMany({ where: { isActive: true } }),
    prisma.blockedDate.findMany({
      where: { date: { gte: startDate, lte: endDate }, isFullDay: true },
    }),
  ])

  const blockedSet = new Set(blockedDates.map((b) => format(b.date, 'yyyy-MM-dd')))
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const capacity = overrides.capacity ?? 5
  let created = 0

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')
    if (blockedSet.has(dateStr)) continue

    const dayOfWeek = JS_DAY_TO_PRISMA[getDay(day)]
    const hours = opHours.find((h) => h.dayOfWeek === dayOfWeek)

    // Determine effective time window + durations
    // Explicit overrides take priority; fall back to DB operational hours; skip day if neither exists
    const open     = overrides.startTime ?? hours?.openTime
    const close    = overrides.endTime   ?? hours?.closeTime
    const duration = overrides.slotDuration  ?? hours?.slotDuration
    const gap      = overrides.breakBetween  ?? hours?.breakBetweenSlots

    if (!open || !close || !duration || gap === undefined) continue

    const slots = buildTimeSlots(open, close, duration, gap)

    for (const slot of slots) {
      try {
        await prisma.timeSlot.upsert({
          where:  { date_startTime: { date: new Date(dateStr), startTime: slot.startTime } },
          update: {},
          create: { date: new Date(dateStr), startTime: slot.startTime, endTime: slot.endTime, capacity },
        })
        created++
      } catch {
        // Skip duplicates silently
      }
    }
  }

  return created
}

function buildTimeSlots(open: string, close: string, duration: number, gap: number) {
  const slots: { startTime: string; endTime: string }[] = []
  let current = timeToMinutes(open)
  const end = timeToMinutes(close)

  while (current + duration <= end) {
    slots.push({ startTime: minutesToTime(current), endTime: minutesToTime(current + duration) })
    current += duration + gap
  }

  return slots
}

export async function getAvailableSlots(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd')

  const slots = await prisma.timeSlot.findMany({
    where: { date: new Date(dateStr), isBlocked: false },
    include: {
      bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { pax: true } },
    },
    orderBy: { startTime: 'asc' },
  })

  return slots.map((slot) => {
    // Private-room model: a slot is closed the moment ANY active booking exists.
    // bookedCount = pax from the single booking (for display); capacity is always 5.
    const bookedCount       = slot.bookings.reduce((sum, b) => sum + b.pax, 0)
    const hasActiveBooking  = slot.bookings.length > 0
    const availableCapacity = hasActiveBooking ? 0 : slot.capacity
    return {
      id: slot.id,
      date: dateStr,
      startTime: slot.startTime,
      endTime: slot.endTime,
      totalCapacity: slot.capacity,
      bookedCount,
      availableCapacity,
      isAvailable: !hasActiveBooking,
    }
  })
}

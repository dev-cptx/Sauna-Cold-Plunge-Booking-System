import { prisma } from './prisma'
import { getDay } from 'date-fns'
import { timeToMinutes } from './utils'
import type { PriceEstimate } from '@/types'

// ─── Types ────────────────────────────────────────────────

export type RateKey =
  | 'weekdayOffPeak'
  | 'weekdayMorningPeak'
  | 'weekdayAfternoonPeak'
  | 'weekendOffPeak'
  | 'weekendPeak'

export type RateMatrix = Record<RateKey, number[]>

// ─── Fallback (used until admin saves a config) ───────────

export const DEFAULT_RATES: RateMatrix = {
  weekdayOffPeak:       [130000, 125000, 120000, 115000, 110000],
  weekdayMorningPeak:   [150000, 145000, 140000, 135000, 130000],
  weekdayAfternoonPeak: [180000, 175000, 170000, 165000, 160000],
  weekendOffPeak:       [160000, 155000, 150000, 145000, 140000],
  weekendPeak:          [200000, 195000, 190000, 185000, 180000],
}

export const DEFAULT_CONFIG = {
  weekdayMorningPeakStart:   '07:00',
  weekdayMorningPeakEnd:     '10:00',
  weekdayAfternoonPeakStart: '17:00',
  weekdayAfternoonPeakEnd:   '22:00',
  weekendPeakStart:          '10:00',
  weekendPeakEnd:            '22:00',
}

// ─── Helpers ─────────────────────────────────────────────

/** Returns which of the 3 weekday bands a slot falls into. */
function weekdayKey(
  startTime: string,
  morStart: string, morEnd: string,
  aftStart: string, aftEnd: string,
): RateKey {
  const t = timeToMinutes(startTime)
  if (t >= timeToMinutes(morStart) && t < timeToMinutes(morEnd)) return 'weekdayMorningPeak'
  if (t >= timeToMinutes(aftStart) && t < timeToMinutes(aftEnd)) return 'weekdayAfternoonPeak'
  return 'weekdayOffPeak'
}

/** Returns which of the 2 weekend bands a slot falls into. */
function weekendKey(startTime: string, pkStart: string, pkEnd: string): RateKey {
  const t = timeToMinutes(startTime)
  if (t >= timeToMinutes(pkStart) && t < timeToMinutes(pkEnd)) return 'weekendPeak'
  return 'weekendOffPeak'
}

const RATE_KEY_LABEL: Record<RateKey, string> = {
  weekdayOffPeak:       'Weekday Off-peak',
  weekdayMorningPeak:   'Weekday Morning Peak',
  weekdayAfternoonPeak: 'Weekday Afternoon Peak',
  weekendOffPeak:       'Weekend Off-peak',
  weekendPeak:          'Weekend Peak',
}

// ─── Main export ─────────────────────────────────────────

export async function calculatePrice(
  slotDate: Date,
  startTime: string,
  pax: number,
): Promise<PriceEstimate> {
  const config = await prisma.pricingConfig.findFirst()

  const cfg   = config ?? DEFAULT_CONFIG
  const rates = (config?.rates as RateMatrix | null) ?? DEFAULT_RATES

  const day       = getDay(slotDate)   // 0 = Sun, 6 = Sat
  const isWeekend = day === 0 || day === 6

  const key: RateKey = isWeekend
    ? weekendKey(startTime, cfg.weekendPeakStart, cfg.weekendPeakEnd)
    : weekdayKey(
        startTime,
        cfg.weekdayMorningPeakStart,   cfg.weekdayMorningPeakEnd,
        cfg.weekdayAfternoonPeakStart, cfg.weekdayAfternoonPeakEnd,
      )

  const rateList    = rates[key] ?? DEFAULT_RATES[key]
  const idx         = Math.min(Math.max(pax, 1), 5) - 1
  const pricePerPax = rateList[idx] ?? rateList[0]

  return {
    basePrice:  0,
    pricePerPax,
    pax,
    totalPrice: pricePerPax * pax,
    currency:   'IDR',
    ruleName:   RATE_KEY_LABEL[key],
  }
}

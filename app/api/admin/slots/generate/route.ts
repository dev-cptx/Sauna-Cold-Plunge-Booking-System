import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateSlotsForDateRange } from '@/lib/slots'
import { z } from 'zod'
import { parseISO } from 'date-fns'

const schema = z.object({
  startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // Optional time-range override — if omitted, falls back to operational hours
  startTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotDuration: z.coerce.number().int().min(30).max(480).optional(),
  breakBetween: z.coerce.number().int().min(0).max(120).optional(),
  capacity:     z.coerce.number().int().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { startDate, endDate, ...overrides } = parsed.data

  const created = await generateSlotsForDateRange(
    parseISO(startDate),
    parseISO(endDate),
    overrides
  )

  return NextResponse.json({ created, message: `Generated ${created} slots` })
}

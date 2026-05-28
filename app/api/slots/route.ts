import { NextRequest, NextResponse } from 'next/server'
import { getAvailableSlots } from '@/lib/slots'
import { calculatePrice } from '@/lib/pricing'
import { z } from 'zod'
import { parseISO } from 'date-fns'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd'),
  pax:  z.coerce.number().int().min(1).max(5).optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    date: searchParams.get('date'),
    pax:  searchParams.get('pax') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters', details: parsed.error.flatten() }, { status: 400 })
  }

  const { date, pax } = parsed.data
  const slotDate = parseISO(date)

  const slots = await getAvailableSlots(slotDate)

  if (pax) {
    const withPrices = await Promise.all(
      slots.map(async (s) => ({ ...s, estimatedPrice: await calculatePrice(slotDate, s.startTime, pax) }))
    )
    return NextResponse.json(withPrices)
  }

  return NextResponse.json(slots)
}

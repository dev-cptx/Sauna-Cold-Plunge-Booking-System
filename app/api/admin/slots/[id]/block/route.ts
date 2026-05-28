import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  isBlocked:   z.boolean(),
  blockedNote: z.string().max(200).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body   = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const slot = await prisma.timeSlot.findUnique({ where: { id: params.id } })
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const updated = await prisma.timeSlot.update({
    where: { id: params.id },
    data: { isBlocked: parsed.data.isBlocked, blockedNote: parsed.data.blockedNote ?? null },
  })

  return NextResponse.json(updated)
}

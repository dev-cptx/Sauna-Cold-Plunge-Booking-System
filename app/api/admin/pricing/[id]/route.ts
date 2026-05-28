import { NextResponse } from 'next/server'

// Pricing is now a single shared config — per-rule CRUD no longer exists.
// Use GET /api/admin/pricing and PUT /api/admin/pricing instead.
export function GET()    { return NextResponse.json({ error: 'Endpoint removed — use /api/admin/pricing' }, { status: 410 }) }
export function PATCH()  { return NextResponse.json({ error: 'Endpoint removed — use /api/admin/pricing' }, { status: 410 }) }
export function DELETE() { return NextResponse.json({ error: 'Endpoint removed — use /api/admin/pricing' }, { status: 410 }) }

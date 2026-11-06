import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createInvitedAccount } from '@/lib/invites'
import { prisma } from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().toLowerCase(),
  role: z.enum(['restaurant_admin', 'driver']),
})

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user.isRestaurantAdmin || !session.user.tenantId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      isRestaurantAdmin: true,
      isDriver: true,
      emailVerified: true,
      password: true,
      createdAt: true,
      lastLoginAt: true,
      driverProfile: { select: { id: true, isActive: true } },
    },
  })

  return NextResponse.json(
    users.map(({ password, ...user }) => ({
      ...user,
      status: password ? (user.emailVerified ? 'active' : 'pending_password') : 'invited',
    })),
  )
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user.isRestaurantAdmin || !session.user.tenantId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 },
    )
  }

  try {
    const { user } = await createInvitedAccount({
      email: parsed.data.email,
      name: parsed.data.name,
      tenantId: session.user.tenantId,
      role: parsed.data.role,
    })

    return NextResponse.json({
      message: `Invite sent to ${user.email}.`,
      userId: user.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create account.'
    const status = message.includes('already exists') ? 409 : 502
    return NextResponse.json({ message }, { status })
  }
}

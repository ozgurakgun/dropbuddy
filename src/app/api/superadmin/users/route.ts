import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createInvitedAccount } from '@/lib/invites'
import { prisma } from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().toLowerCase(),
  tenantId: z.string().min(1),
  role: z.enum(['restaurant_admin', 'driver']),
})

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      isRestaurantAdmin: true,
      isDriver: true,
      emailVerified: true,
      password: true,
      createdAt: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  })

  return NextResponse.json(
    users.map(({ password, ...user }) => ({
      ...user,
      status: user.isSuperAdmin
        ? 'superadmin'
        : password
          ? user.emailVerified
            ? 'active'
            : 'pending_password'
          : 'invited',
    })),
  )
}

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user.isSuperAdmin) {
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
    const { user, tenant } = await createInvitedAccount({
      email: parsed.data.email,
      name: parsed.data.name,
      tenantId: parsed.data.tenantId,
      role: parsed.data.role,
    })

    return NextResponse.json({
      message: `Invite sent to ${user.email} for ${tenant.name}.`,
      userId: user.id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create account.'
    const status = message.includes('already exists')
      ? 409
      : message.includes('not found')
        ? 404
        : 502
    return NextResponse.json({ message }, { status })
  }
}

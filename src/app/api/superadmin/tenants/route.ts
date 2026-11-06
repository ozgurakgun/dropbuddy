import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendInviteEmail } from '@/lib/auth-emails'
import { createAuthToken } from '@/lib/auth-tokens'
import { prisma } from '@/lib/prisma'
import { getServerAuthSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  adminName: z.string().trim().min(1).max(120).optional(),
  adminEmail: z.string().trim().email().toLowerCase(),
})

export async function POST(request: Request) {
  const session = await getServerAuthSession()
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 },
    )
  }

  const { name, slug, adminEmail, adminName } = parsed.data

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } })
  if (existingTenant) {
    return NextResponse.json({ message: 'A tenant with this slug already exists.' }, { status: 409 })
  }

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existingUser) {
    return NextResponse.json({ message: 'A user with this email already exists.' }, { status: 409 })
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      users: {
        create: {
          email: adminEmail,
          name: adminName || null,
          isRestaurantAdmin: true,
        },
      },
    },
    include: { users: true },
  })

  const admin = tenant.users[0]
  const invite = await createAuthToken(admin.id, 'INVITE', 60 * 24 * 7)

  try {
    await sendInviteEmail({
      email: admin.email,
      name: admin.name,
      tenantName: tenant.name,
      token: invite.token,
      expiresInLabel: 'in 7 days',
    })
  } catch (error) {
    console.error('[INVITE_EMAIL_FAILED]', error)
    return NextResponse.json(
      {
        message:
          'Tenant created, but the invite email could not be sent. Check SMTP settings and resend.',
        tenantId: tenant.id,
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    message: `Created ${tenant.name} and invited ${admin.email}.`,
    tenantId: tenant.id,
  })
}

import { sendInviteEmail } from '@/lib/auth-emails'
import { createAuthToken } from '@/lib/auth-tokens'
import { prisma } from '@/lib/prisma'

export type AccountRole = 'restaurant_admin' | 'driver'

export async function createInvitedAccount({
  email,
  name,
  tenantId,
  role,
}: {
  email: string
  name?: string | null
  tenantId: string
  role: AccountRole
}) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    throw new Error('A user with this email already exists.')
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) {
    throw new Error('Tenant not found.')
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || null,
      tenantId,
      isRestaurantAdmin: role === 'restaurant_admin',
      isDriver: role === 'driver',
      ...(role === 'driver'
        ? {
            driverProfile: {
              create: {
                tenantId,
                isActive: true,
              },
            },
          }
        : {}),
    },
  })

  const invite = await createAuthToken(user.id, 'INVITE', 60 * 24 * 7)

  try {
    await sendInviteEmail({
      email: user.email,
      name: user.name,
      tenantName: tenant.name,
      role,
      token: invite.token,
      expiresInLabel: 'in 7 days',
    })
  } catch (error) {
    console.error('[INVITE_EMAIL_FAILED]', error)
    await prisma.authToken.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    throw new Error('Could not send the invite email. Check SMTP settings and try again.')
  }

  return { user, tenant }
}

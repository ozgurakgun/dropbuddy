import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendPasswordResetEmail, sendVerificationEmail } from '@/lib/auth-emails'
import { createAuthToken } from '@/lib/auth-tokens'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

const genericMessage = "If an account exists, we'll send password reset instructions."

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user?.password) {
    return NextResponse.json({ message: genericMessage })
  }

  try {
    if (!user.emailVerified) {
      const token = await createAuthToken(user.id, 'EMAIL_VERIFICATION', 60 * 24)
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
        expiresInLabel: 'in 24 hours',
      })
      return NextResponse.json({
        message:
          'That account is not verified yet. We sent a new verification email — confirm it before signing in or resetting your password.',
      })
    }

    const token = await createAuthToken(user.id, 'PASSWORD_RESET', 60)
    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      token: token.token,
      expiresInLabel: 'in 60 minutes',
    })
  } catch (error) {
    console.error('[PASSWORD_RESET_EMAIL_FAILED]', error)
    return NextResponse.json(
      { message: 'We could not send a reset email right now. Please try again later.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ message: genericMessage })
}

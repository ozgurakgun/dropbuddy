import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { consumeAuthToken, invalidateAuthTokens } from '@/lib/auth-tokens'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  token: z.string().min(20),
  purpose: z.enum(['invite', 'reset']),
  password: z.string().min(8).max(200),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Password must be at least 8 characters, and the link must be valid.' },
      { status: 400 },
    )
  }

  const type = parsed.data.purpose === 'invite' ? 'INVITE' : 'PASSWORD_RESET'
  const authToken = await consumeAuthToken(type, parsed.data.token)
  if (!authToken) {
    return NextResponse.json(
      { message: 'This link is invalid or has expired.' },
      { status: 400 },
    )
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await prisma.user.update({
    where: { id: authToken.userId },
    data: {
      password: passwordHash,
      emailVerified: new Date(),
    },
  })

  await invalidateAuthTokens(authToken.userId, 'INVITE')
  await invalidateAuthTokens(authToken.userId, 'PASSWORD_RESET')

  return NextResponse.json({
    message: 'Password saved. You can now sign in.',
  })
}

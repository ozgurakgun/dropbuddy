import { NextResponse } from 'next/server'
import { consumeAuthToken, invalidateAuthTokens } from '@/lib/auth-tokens'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token : ''

    if (!token) {
      return NextResponse.json({ message: 'A verification token is required.' }, { status: 400 })
    }

    const authToken = await consumeAuthToken('EMAIL_VERIFICATION', token)
    if (!authToken) {
      return NextResponse.json(
        { message: 'This verification link is invalid or has expired.' },
        { status: 400 },
      )
    }

    await prisma.user.update({
      where: { id: authToken.userId },
      data: { emailVerified: new Date() },
    })

    await invalidateAuthTokens(authToken.userId, 'EMAIL_VERIFICATION')

    return NextResponse.json({ message: 'Email verified successfully. You can now sign in.' })
  } catch (error) {
    console.error('[VERIFY_EMAIL_ERROR]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}

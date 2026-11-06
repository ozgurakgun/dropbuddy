import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { sendVerificationEmail } from '@/lib/auth-emails'
import { createAuthToken } from '@/lib/auth-tokens'
import { validateEmail, validatePassword } from '@/lib/auth-validation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || name.length < 2) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    }

    const emailError = validateEmail(email)
    if (emailError) {
      return NextResponse.json({ message: emailError }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    const passwordHash = await bcrypt.hash(password, 12)

    let user
    let createdNew = false

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json(
          { message: 'An account with this email already exists' },
          { status: 400 },
        )
      }

      // Claim an invited/shadow account that has no password yet.
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: passwordHash,
          emailVerified: null,
        },
      })
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: passwordHash,
          emailVerified: null,
        },
      })
      createdNew = true
    }

    const token = await createAuthToken(user.id, 'EMAIL_VERIFICATION', 60 * 24)

    try {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
        expiresInLabel: 'in 24 hours',
      })
    } catch (emailError) {
      console.error('[SIGNUP_EMAIL_ERROR]', emailError)
      await prisma.authToken.deleteMany({ where: { userId: user.id } })
      if (createdNew) {
        await prisma.user.delete({ where: { id: user.id } })
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: null, emailVerified: null },
        })
      }

      return NextResponse.json(
        { message: 'We could not send a verification email. Please try again later.' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      message: 'Account created. Check your email to verify your address before signing in.',
    })
  } catch (error) {
    console.error('[SIGNUP_ERROR]', error)
    return NextResponse.json({ message: 'Internal Error' }, { status: 500 })
  }
}

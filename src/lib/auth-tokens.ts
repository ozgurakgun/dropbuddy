import { createHash, randomBytes } from 'crypto'
import type { AuthTokenType } from '@prisma/client'
import { prisma } from './prisma'

const TOKEN_BYTE_LENGTH = 48

function generateRawToken() {
  return randomBytes(TOKEN_BYTE_LENGTH).toString('hex')
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  expiresInMinutes: number,
) {
  const rawToken = generateRawToken()
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

  await prisma.authToken.deleteMany({ where: { userId, type } })

  const token = await prisma.authToken.create({
    data: {
      userId,
      type,
      token: tokenHash,
      expiresAt,
    },
  })

  return {
    id: token.id,
    token: rawToken,
    expiresAt,
  }
}

export async function consumeAuthToken(type: AuthTokenType, rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const now = new Date()

  const token = await prisma.authToken.findFirst({
    where: {
      type,
      token: tokenHash,
      consumedAt: null,
      expiresAt: { gt: now },
    },
  })

  if (!token) {
    return null
  }

  await prisma.authToken.update({
    where: { id: token.id },
    data: { consumedAt: now },
  })

  return token
}

export async function invalidateAuthTokens(userId: string, type: AuthTokenType) {
  await prisma.authToken.deleteMany({ where: { userId, type } })
}

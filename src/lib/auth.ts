import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'

declare module 'next-auth' {
  interface User {
    id: string
    isSuperAdmin: boolean
    isRestaurantAdmin: boolean
    isDriver: boolean
    tenantId: string | null
    tenantName: string | null
    tenantSlug: string | null
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      isSuperAdmin: boolean
      isRestaurantAdmin: boolean
      isDriver: boolean
      tenantId: string | null
      tenantName: string | null
      tenantSlug: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    isSuperAdmin: boolean
    isRestaurantAdmin: boolean
    isDriver: boolean
    tenantId: string | null
    tenantName: string | null
    tenantSlug: string | null
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Invalid credentials')
        }

        const email = credentials.email.trim().toLowerCase()
        const user = await prisma.user.findUnique({
          where: { email },
          include: { tenant: true },
        })

        if (!user?.password) {
          throw new Error('Invalid credentials')
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email address before signing in.')
        }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) {
          throw new Error('Invalid credentials')
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          isRestaurantAdmin: user.isRestaurantAdmin,
          isDriver: user.isDriver,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name ?? null,
          tenantSlug: user.tenant?.slug ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isSuperAdmin = user.isSuperAdmin
        token.isRestaurantAdmin = user.isRestaurantAdmin
        token.isDriver = user.isDriver
        token.tenantId = user.tenantId
        token.tenantName = user.tenantName
        token.tenantSlug = user.tenantSlug
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.isSuperAdmin = token.isSuperAdmin
        session.user.isRestaurantAdmin = token.isRestaurantAdmin
        session.user.isDriver = token.isDriver
        session.user.tenantId = token.tenantId
        session.user.tenantName = token.tenantName
        session.user.tenantSlug = token.tenantSlug
      }
      return session
    },
  },
}

export function homePathForUser(user: {
  isSuperAdmin: boolean
  isRestaurantAdmin: boolean
  isDriver: boolean
}): string {
  if (user.isSuperAdmin) return '/superadmin/tenants'
  if (user.isRestaurantAdmin) return '/restaurant/orders'
  if (user.isDriver) return '/driver'
  return '/pending'
}

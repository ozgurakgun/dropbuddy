import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth'

export async function getServerAuthSession() {
  return getServerSession(authOptions)
}

export async function getSession() {
  return getServerAuthSession()
}

export async function requireSession() {
  const session = await getServerAuthSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }
  return session
}

export async function requireSuperAdmin() {
  const session = await requireSession()
  if (!session.user.isSuperAdmin) {
    redirect('/auth/signin')
  }
  return session
}

export async function requireRestaurantAccess() {
  const session = await requireSession()
  if (!session.user.isRestaurantAdmin || !session.user.tenantId) {
    redirect('/auth/signin')
  }
  return session
}

export async function requireRestaurantAdmin() {
  return requireRestaurantAccess()
}

export async function requireDriver() {
  const session = await requireSession()
  if (!session.user.isDriver || !session.user.tenantId) {
    redirect('/auth/signin')
  }
  return session
}

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path.startsWith('/superadmin') && !token?.isSuperAdmin) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    if (path.startsWith('/restaurant') && !(token?.isRestaurantAdmin && token.tenantId)) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    if (path.startsWith('/driver') && !(token?.isDriver && token.tenantId)) {
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        if (path.startsWith('/auth')) return true
        if (path === '/') return true
        return !!token
      },
    },
  },
)

export const config = {
  matcher: ['/superadmin/:path*', '/restaurant/:path*', '/driver/:path*'],
}

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const role = (req.nextauth.token as any)?.role

    if (req.nextUrl.pathname.startsWith('/admin') &&
        !req.nextUrl.pathname.startsWith('/admin/login') &&
        role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ req, token }) {
        if (req.nextUrl.pathname.startsWith('/admin/login')) return true
        if (req.nextUrl.pathname.startsWith('/admin')) return !!token
        return true
      },
    },
  }
)

export const config = { matcher: ['/admin/:path*'] }

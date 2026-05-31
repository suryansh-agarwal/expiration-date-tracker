import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('session')
  const isLoginPage = request.nextUrl.pathname === '/login'

  if ((!session || session.value !== 'authenticated') && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session?.value === 'authenticated' && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

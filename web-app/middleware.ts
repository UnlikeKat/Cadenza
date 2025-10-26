import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Public paths that don't require authentication
        const publicPaths = [
          '/',                    // Landing page
          '/auth/signin',         // Sign in page
          '/auth/signup',         // Sign up page
          '/api/auth',           // Auth API routes (signin, callback, etc.)
        ]
        
        // Check if current path is public
        const isPublicPath = publicPaths.some(publicPath => 
          path === publicPath || path.startsWith(publicPath)
        )
        
        // Allow access to public paths without token
        if (isPublicPath) {
          return true
        }
        
        // All other routes require authentication
        return !!token
      },
    },
  }
)

// Protect all routes except static files and images
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder (public files)
     * - file extensions (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}

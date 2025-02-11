// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    // Se o usuário está autenticado e tenta acessar /login
    if (req.nextUrl.pathname === "/login" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Se estiver na página de login, sempre permite
        if (req.nextUrl.pathname === "/login") {
          return true;
        }
        // Para outras páginas, requer autenticação
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

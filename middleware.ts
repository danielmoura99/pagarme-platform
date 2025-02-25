// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    // Se o usuário está autenticado e tenta acessar /login
    if (req.nextUrl.pathname === "/login" && req.nextauth.token) {
      return NextResponse.redirect(new URL("/products", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Páginas públicas - sempre permite acesso
        const publicPaths = [
          "/login",
          "/checkout",
          "/processing",
          "/success",
          "/error",
          "/unavailable",
        ];

        // Verifica se o caminho atual está na lista de caminhos públicos
        if (publicPaths.some((path) => req.nextUrl.pathname.startsWith(path))) {
          return true;
        }

        // Para outras páginas (dashboard), requer autenticação
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

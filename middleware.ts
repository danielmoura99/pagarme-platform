// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Se o usuário está autenticado e tenta acessar /login
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Rotas restritas apenas para admins
    const adminOnlyPaths = [
      "/products",
      "/checkout-settings",
      "/coupons",
      "/analytics",
      "/integrations",
      "/recipients",
      "/settings",
      "/clientes",
    ];

    // Verificar se é uma rota de admin e o usuário não é admin
    if (
      token &&
      token.role !== "admin" &&
      adminOnlyPaths.some((path) => pathname.startsWith(path))
    ) {
      // Redirecionar afiliados para o dashboard
      return NextResponse.redirect(new URL("/", req.url));
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

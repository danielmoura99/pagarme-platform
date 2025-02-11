// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Seção da esquerda - Imagem/Banner */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-8 text-white flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-4">Plataforma de Vendas</h1>
          <p className="text-lg opacity-90">
            Gerencie suas vendas, produtos e afiliados em um só lugar
          </p>
        </div>

        <div className="mt-auto">
          <p className="text-sm opacity-70">
            © 2024 Sua Empresa. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Seção da direita - Formulário */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        {/* Header Mobile */}
        <div className="md:hidden p-4 bg-primary text-white text-center">
          <h1 className="text-xl font-bold">Plataforma de Vendas</h1>
        </div>

        {/* Conteúdo do Formulário */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

// src/app/page.tsx

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">Pagina em desenvolvimento</h1>
      </div>
    </main>
  );
}

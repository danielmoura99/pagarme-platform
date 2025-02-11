// app/(dashboard)/layout.tsx
import { Navbar } from "@/components/dashboard/navbar";
import { AppSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-80 bg-gray-900">
        <AppSidebar />
      </div>
      <main className="md:pl-72">
        <Navbar />
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

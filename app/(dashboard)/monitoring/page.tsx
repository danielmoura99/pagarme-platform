import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth";
import MonitorDashboard from "./monitor-dashboard";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") redirect("/");
  return <MonitorDashboard />;
}

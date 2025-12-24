import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <DashboardClient currentUserName={user.name} />;
}

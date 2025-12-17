import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/events";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const mockUserId = process.env.MOCK_USER_ID?.trim();
    if (!mockUserId || !isUuid(mockUserId)) {
      redirect("/login");
    }
  }

  return <DashboardClient />;
}

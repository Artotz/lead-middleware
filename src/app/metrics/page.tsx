import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import MetricsClient from "./metrics-client";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return <MetricsClient />;
}

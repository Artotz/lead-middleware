import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import LeadsImportClient from "./leads-import-client";

export const dynamic = "force-dynamic";

export default async function LeadsImportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <LeadsImportClient defaultConsultor={user.name} />;
}

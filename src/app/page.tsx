import { RequireAuth } from "@/components/RequireAuth";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardClient />
    </RequireAuth>
  );
}

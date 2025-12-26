import { RequireAuth } from "@/components/RequireAuth";
import LeadsImportClient from "./leads-import-client";

export default function LeadsImportPage() {
  return (
    <RequireAuth>
      <LeadsImportClient />
    </RequireAuth>
  );
}

import { RequireAuth } from "@/components/RequireAuth";
import MetricsClient from "./metrics-client";

export default function MetricsPage() {
  return (
    <RequireAuth>
      <MetricsClient />
    </RequireAuth>
  );
}

import { RequireAuth } from "@/components/RequireAuth";
import CronogramaClient from "./cronograma-client";

export default function CronogramaPage() {
  return (
    <RequireAuth>
      <CronogramaClient />
    </RequireAuth>
  );
}

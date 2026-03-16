import CronogramaClient from "../cronograma-client";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function CronogramaDashboardPage() {
  return <CronogramaClient locale={DEFAULT_LOCALE} initialTab="dashboard" />;
}

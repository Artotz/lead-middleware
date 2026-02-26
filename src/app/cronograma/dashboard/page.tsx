import { headers } from "next/headers";
import CronogramaClient from "../cronograma-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default async function CronogramaDashboardPage() {
  const locale = getLocaleFromHeaders(await headers());
  return <CronogramaClient locale={locale} initialTab="dashboard" />;
}

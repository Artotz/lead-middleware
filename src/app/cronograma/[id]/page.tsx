import { headers } from "next/headers";
import AppointmentDetailClient from "./detail-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default async function AppointmentDetailPage() {
  const locale = getLocaleFromHeaders(await headers());
  return <AppointmentDetailClient locale={locale} />;
}


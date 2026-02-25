import { headers } from "next/headers";
import AppointmentDetailClient from "./detail-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default function AppointmentDetailPage() {
  const locale = getLocaleFromHeaders(headers());
  return <AppointmentDetailClient locale={locale} />;
}

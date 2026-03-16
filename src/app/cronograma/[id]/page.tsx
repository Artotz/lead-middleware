import AppointmentDetailClient from "./detail-client";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function AppointmentDetailPage() {
  return <AppointmentDetailClient locale={DEFAULT_LOCALE} />;
}


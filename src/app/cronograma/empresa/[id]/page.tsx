import CompanyDetailClient from "./detail-client";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function CompanyDetailPage() {
  return <CompanyDetailClient locale={DEFAULT_LOCALE} />;
}


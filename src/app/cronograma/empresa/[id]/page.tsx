import { headers } from "next/headers";
import CompanyDetailClient from "./detail-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default function CompanyDetailPage() {
  const locale = getLocaleFromHeaders(headers());
  return <CompanyDetailClient locale={locale} />;
}

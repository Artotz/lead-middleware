import { headers } from "next/headers";
import CompanyDetailClient from "./detail-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default async function CompanyDetailPage() {
  const locale = getLocaleFromHeaders(await headers());
  return <CompanyDetailClient locale={locale} />;
}


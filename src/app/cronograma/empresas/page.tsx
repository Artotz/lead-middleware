import { headers } from "next/headers";
import CronogramaClient from "../cronograma-client";
import { getLocaleFromHeaders } from "@/lib/i18n";

export default function CronogramaEmpresasPage() {
  const locale = getLocaleFromHeaders(headers());
  return <CronogramaClient locale={locale} initialTab="empresas" />;
}

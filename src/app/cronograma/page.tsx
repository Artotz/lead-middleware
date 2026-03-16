import CronogramaClient from "./cronograma-client";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default function CronogramaPage() {
  return <CronogramaClient locale={DEFAULT_LOCALE} />;
}


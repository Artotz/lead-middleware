const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateTimePtBR = (
  value: string | null | undefined,
  fallback = "N/A",
) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateTimeFormatter.format(date);
};

export const safeText = (
  value: string | number | null | undefined,
  fallback = "N/A",
) => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length ? text : fallback;
};

export const stringifyUnknown = (value: unknown, fallback = "N/A"): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return safeText(value, fallback);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => stringifyUnknown(item, ""))
      .map((item) => item.trim())
      .filter(Boolean);
    return parts.length ? parts.join(", ") : fallback;
  }
  try {
    const json = JSON.stringify(value);
    return json && json !== "{}" ? json : fallback;
  } catch {
    return fallback;
  }
};

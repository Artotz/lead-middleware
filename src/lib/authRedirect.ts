export const LOGIN_NEXT_PARAM = "next";

const INTERNAL_URL_BASE = "http://localhost";

export const resolveSafeNextPath = (
  value: string | null | undefined,
  fallback = "/",
) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, INTERNAL_URL_BASE);
    if (url.origin !== INTERNAL_URL_BASE) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

export const buildLoginPath = (options?: {
  next?: string | null;
}) => {
  const searchParams = new URLSearchParams();
  const next = resolveSafeNextPath(options?.next, "");

  if (next) {
    searchParams.set(LOGIN_NEXT_PARAM, next);
  }

  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
};

export const getCurrentPathWithSearch = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

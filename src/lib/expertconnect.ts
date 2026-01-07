type ExpertConnectConfig = {
  apiBaseUrl: string;
  companyId: string;
  subscriptionKey: string;
  oauthTokenUrl: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthScope?: string;
  fieldsInclude?: string;
};

const readEnv = (key: string) => {
  const value = process.env[key];
  return value && value.trim().length ? value.trim() : null;
};

export const getExpertConnectConfig = (): ExpertConnectConfig => {
  const apiBaseUrl =
    readEnv("EXPERTCONNECT_API_BASE_URL") ??
    "https://service-api.expertconnect.deere.com";
  const companyId = readEnv("EXPERTCONNECT_COMPANY_ID");
  const subscriptionKey = readEnv("EXPERTCONNECT_SUBSCRIPTION_KEY");
  const oauthTokenUrl = readEnv("EXPERTCONNECT_OAUTH_TOKEN_URL");
  const oauthClientId = readEnv("EXPERTCONNECT_OAUTH_CLIENT_ID");
  const oauthClientSecret = readEnv("EXPERTCONNECT_OAUTH_CLIENT_SECRET");
  const oauthScope = readEnv("EXPERTCONNECT_OAUTH_SCOPE") ?? undefined;
  // const fieldsInclude =
  //   readEnv("EXPERTCONNECT_FIELDS_INCLUDE") ??
  //   "webhooks,watchers,fields";

  const missing: string[] = [];
  if (!companyId) missing.push("EXPERTCONNECT_COMPANY_ID");
  if (!subscriptionKey) missing.push("EXPERTCONNECT_SUBSCRIPTION_KEY");
  if (!oauthTokenUrl) missing.push("EXPERTCONNECT_OAUTH_TOKEN_URL");
  if (!oauthClientId) missing.push("EXPERTCONNECT_OAUTH_CLIENT_ID");
  if (!oauthClientSecret) missing.push("EXPERTCONNECT_OAUTH_CLIENT_SECRET");

  if (missing.length) {
    throw new Error(`Missing ExpertConnect env vars: ${missing.join(", ")}`);
  }

  return {
    apiBaseUrl,
    companyId: companyId!,
    subscriptionKey: subscriptionKey!,
    oauthTokenUrl: oauthTokenUrl!,
    oauthClientId: oauthClientId!,
    oauthClientSecret: oauthClientSecret!,
    oauthScope,
    // fieldsInclude,
  };
};

type OAuthClientCredentialsResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

export type TicketResourceUpdateInput = {
  title?: string;
  description?: string;
  product?: string;
  machineHours?: string;
  serialNumber?: string;
  misc?: string;
  resolution?: string;
  isArchived?: boolean;
  priority?: number;
};

export type TicketResourceTagsAddInput = {
  tagIds: string[];
};

declare global {
  // eslint-disable-next-line no-var
  var __expertConnectTokenCache: TokenCache | undefined;
}

const getTokenCache = () => globalThis.__expertConnectTokenCache ?? null;
const setTokenCache = (cache: TokenCache | null) => {
  if (cache) globalThis.__expertConnectTokenCache = cache;
  else globalThis.__expertConnectTokenCache = undefined;
};

const buildTicketUrl = (
  config: ExpertConnectConfig,
  ticketId: string,
  suffix?: string
) => {
  const basePath = `/api/v1/companies/${encodeURIComponent(
    config.companyId
  )}/tickets/${encodeURIComponent(ticketId)}`;
  const path = suffix ? `${basePath}/${suffix}` : basePath;
  return new URL(path, config.apiBaseUrl);
};

const parseExpertConnectPayload = async (resp: Response) => {
  const contentType = resp.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  return isJson
    ? await resp.json().catch(() => null)
    : await resp.text().catch(() => null);
};

const unwrapExpertConnectPayload = (payload: unknown) => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
};

const handleExpertConnectResponse = async (
  resp: Response,
  actionLabel: string
) => {
  const payload = await parseExpertConnectPayload(resp);
  if (!resp.ok) {
    const error = new Error(`ExpertConnect ${actionLabel} failed (${resp.status})`);
    (error as any).status = resp.status;
    (error as any).payload = payload;
    throw error;
  }
  return unwrapExpertConnectPayload(payload);
};

export const getExpertConnectAccessToken = async (
  config: ExpertConnectConfig
): Promise<string> => {
  const cached = getTokenCache();
  if (cached && Date.now() < cached.expiresAtMs) {
    return cached.accessToken;
  }

  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", config.oauthClientId);
  form.set("client_secret", config.oauthClientSecret);
  if (config.oauthScope) form.set("scope", config.oauthScope);

  const resp = await fetch(config.oauthTokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: form.toString(),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `ExpertConnect OAuth token request failed (${resp.status}): ${text.slice(
        0,
        300
      )}`
    );
  }

  const tokenJson = (await resp.json()) as OAuthClientCredentialsResponse;
  if (!tokenJson?.access_token) {
    throw new Error("ExpertConnect OAuth token response missing access_token");
  }

  const expiresInSec =
    typeof tokenJson.expires_in === "number" && tokenJson.expires_in > 0
      ? tokenJson.expires_in
      : 300;
  const expiresAtMs = Date.now() + Math.max(0, expiresInSec - 30) * 1000;
  setTokenCache({ accessToken: tokenJson.access_token, expiresAtMs });
  return tokenJson.access_token;
};

export const fetchExpertConnectTicketById = async (
  ticketId: string
): Promise<unknown> => {
  const config = getExpertConnectConfig();
  const accessToken = await getExpertConnectAccessToken(config);

  const url = buildTicketUrl(config, ticketId);
  if (config.fieldsInclude) {
    url.searchParams.set("Fields.Include", config.fieldsInclude);
  }

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Subscription-Key": config.subscriptionKey,
      "Cache-Control": "no-cache",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return handleExpertConnectResponse(resp, "ticket fetch");
};

export const updateExpertConnectTicketById = async (
  ticketId: string,
  input: TicketResourceUpdateInput
): Promise<unknown> => {
  const config = getExpertConnectConfig();
  const accessToken = await getExpertConnectAccessToken(config);
  const url = buildTicketUrl(config, ticketId);

  const resp = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Subscription-Key": config.subscriptionKey,
      "Cache-Control": "no-cache",
      Accept: "application/json",
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  return handleExpertConnectResponse(resp, "ticket update");
};

export const addExpertConnectTicketTags = async (
  ticketId: string,
  input: TicketResourceTagsAddInput
): Promise<unknown> => {
  const config = getExpertConnectConfig();
  const accessToken = await getExpertConnectAccessToken(config);
  const url = buildTicketUrl(config, ticketId, "tags");

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Subscription-Key": config.subscriptionKey,
      "Cache-Control": "no-cache",
      Accept: "application/json",
      "Content-Type": "application/json-patch+json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  return handleExpertConnectResponse(resp, "ticket tags add");
};

export const closeExpertConnectTicketById = async (
  ticketId: string
): Promise<unknown> => {
  const config = getExpertConnectConfig();
  const accessToken = await getExpertConnectAccessToken(config);
  const url = buildTicketUrl(config, ticketId, "close");

  const resp = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Subscription-Key": config.subscriptionKey,
      "Cache-Control": "no-cache",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return handleExpertConnectResponse(resp, "ticket close");
};

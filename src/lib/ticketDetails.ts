export type TicketDetailsApiError = {
  message: string;
  code: string;
  details?: unknown;
};

export type ExpertConnectTag =
  | string
  | {
      name?: string | null;
      subTags?: Array<string | { name?: string | null }> | null;
    };

export type ExpertConnectWatcher = {
  name?: string | null;
  type?: string | null;
  watchType?: string | null;
};

export type ExpertConnectCustomField = {
  definition?: { name?: string | null } | null;
  value?: unknown;
};

export type ExpertConnectMachineDetail = {
  date?: string | null;
  data?: string | null;
  machineHours?: number | string | null;
};

export type ExpertConnectMachine = {
  serialNumber?: string | null;
  productNote?: string | null;
  details?: ExpertConnectMachineDetail[] | null;
};

export type ExpertConnectTicketDetails = {
  id?: string | null;
  ticketId?: string | null;
  number?: string | null;
  title?: string | null;
  url?: string | null;

  status?: string | { name?: string | null; code?: number | null } | null;
  priority?: string | { name?: string | null; code?: number | null } | null;

  createdDate?: string | null;
  updatedDate?: string | null;
  closedDate?: string | null;

  customer?:
    | {
        name?: string | null;
        phone?: string | null;
        email?: string | null;
        organization?: string | null;
        account?: string | null;
        externalId?: string | null;
        segments?: Array<string | { name?: string | null }> | null;
      }
    | null;

  advisor?:
    | {
        name?: string | null;
        email?: string | null;
        racfid?: string | null;
        team?: string | null;
        division?: string | null;
        template?: string | null;
      }
    | null;

  product?:
    | {
        name?: string | null;
        serialNumber?: string | null;
        machineHours?: number | string | null;
      }
    | null;

  source?: string | null;
  support?: string | null;
  timeToFirstResponse?: string | number | null;

  tags?: ExpertConnectTag[] | null;
  machines?: ExpertConnectMachine[] | null;

  description?: string | null;
  resolution?: string | null;
  misc?: unknown;

  watchers?: ExpertConnectWatcher[] | null;
  fields?: ExpertConnectCustomField[] | null;

  webhooks?: unknown;
} & Record<string, unknown>;

export async function fetchTicketDetails(
  ticketId: string,
  options?: { signal?: AbortSignal },
): Promise<ExpertConnectTicketDetails> {
  const resp = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}`, {
    method: "GET",
    cache: "no-store",
    signal: options?.signal,
  });

  if (!resp.ok) {
    const maybeJson = await resp.json().catch(() => null);
    const message =
      (maybeJson && typeof maybeJson === "object" && "message" in maybeJson
        ? String((maybeJson as any).message)
        : null) ?? "Falha ao buscar detalhes do ticket";
    const error: TicketDetailsApiError = {
      message,
      code:
        (maybeJson && typeof maybeJson === "object" && "code" in maybeJson
          ? String((maybeJson as any).code)
          : "unknown") ?? "unknown",
      details:
        maybeJson && typeof maybeJson === "object" && "details" in maybeJson
          ? (maybeJson as any).details
          : undefined,
    };
    throw Object.assign(new Error(error.message), { status: resp.status, error });
  }

  return (await resp.json()) as ExpertConnectTicketDetails;
}


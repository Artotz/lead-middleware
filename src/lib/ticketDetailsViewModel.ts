import {
  ExpertConnectCustomField,
  ExpertConnectMachine,
  ExpertConnectTag,
  ExpertConnectTicketDetails,
  ExpertConnectWatcher,
} from "@/lib/ticketDetails";
import { formatDateTimePtBR, safeText, stringifyUnknown } from "@/lib/format";

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const pickString = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const found = asNonEmptyString(obj[key]);
    if (found) return found;
  }
  return null;
};

const pickDateString = (obj: Record<string, unknown>, keys: string[]) =>
  pickString(obj, keys);

const pickNested = (obj: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === "object") return val as Record<string, unknown>;
  }
  return null;
};

const normalizeStatusOrPriority = (
  value:
    | string
    | { name?: string | null; code?: number | null }
    | null
    | undefined,
) => {
  if (!value) return null;
  if (typeof value === "string") return asNonEmptyString(value);
  return asNonEmptyString(value.name) ?? (value.code !== null && value.code !== undefined ? String(value.code) : null);
};

const normalizeSegments = (segments: unknown): string[] => {
  if (!segments) return [];
  if (Array.isArray(segments)) {
    return segments
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const name = asNonEmptyString((item as any).name);
          return name ?? "";
        }
        return "";
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeTags = (tags: ExpertConnectTag[] | null | undefined) => {
  if (!tags || !Array.isArray(tags)) return [];
  return tags
    .map((t) => {
      if (typeof t === "string") return { name: t.trim(), subTags: [] as string[] };
      const name = (t?.name ?? "")?.toString().trim();
      const subTagsRaw = t?.subTags ?? [];
      const subTags = Array.isArray(subTagsRaw)
        ? subTagsRaw
            .map((st) => (typeof st === "string" ? st : (st as any)?.name))
            .map((v) => (typeof v === "string" ? v.trim() : ""))
            .filter(Boolean)
        : [];
      return { name, subTags };
    })
    .filter((t) => t.name.length);
};

const normalizeMachines = (machines: ExpertConnectMachine[] | null | undefined) => {
  if (!machines || !Array.isArray(machines)) return [];
  return machines.map((m) => ({
    serialNumber: safeText(m.serialNumber, "Sem serial"),
    productNote: safeText(m.productNote, "N/A"),
    details: (m.details ?? [])
      ?.filter(Boolean)
      .map((d) => ({
        date: safeText(d.date ?? d.data, "N/A"),
        machineHours: safeText(d.machineHours as any, "N/A"),
      })) ?? [],
  }));
};

const normalizeWatchers = (watchers: ExpertConnectWatcher[] | null | undefined) => {
  if (!watchers || !Array.isArray(watchers)) return [];
  return watchers.map((w) => ({
    name: safeText(w.name, "N/A"),
    type: safeText(w.type, "N/A"),
    watchType: safeText(w.watchType, "N/A"),
  }));
};

const normalizeFields = (fields: ExpertConnectCustomField[] | null | undefined) => {
  if (!fields || !Array.isArray(fields)) return [];
  return fields
    .map((f) => ({
      name: safeText(f.definition?.name, "Campo"),
      value: stringifyUnknown(f.value, "N/A"),
    }))
    .filter((item) => item.name !== "Campo" || item.value !== "N/A");
};

export type TicketDetailsViewModel = {
  header: {
    number: string;
    title: string;
    status: string;
    priority: string;
    url: string | null;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
    organization: string;
    account: string;
    externalId: string;
    segments: string[];
  };
  advisor: {
    name: string;
    email: string;
    racfid: string;
    team: string;
    division: string;
    template: string;
  };
  meta: {
    createdAt: string;
    updatedAt: string;
    closedAt: string;
    product: string;
    serialNumber: string;
    machineHours: string;
    status: string;
    source: string;
    support: string;
    timeToFirstResponse: string;
  };
  tags: { name: string; subTags: string[] }[];
  machines: ReturnType<typeof normalizeMachines>;
  description: {
    description: string;
    resolution: string;
    misc: string;
  };
  watchers: ReturnType<typeof normalizeWatchers>;
  customFields: ReturnType<typeof normalizeFields>;
};

export const buildTicketDetailsViewModel = (
  ticket: ExpertConnectTicketDetails,
): TicketDetailsViewModel => {
  const root = ticket as Record<string, unknown>;
  const customer =
    (ticket.customer as any) ??
    pickNested(root, ["customer", "contact", "requestor", "requester"]) ??
    {};
  const advisor =
    (ticket.advisor as any) ??
    pickNested(root, ["advisor", "consultant", "assignee", "owner"]) ??
    {};
  const product =
    (ticket.product as any) ??
    pickNested(root, ["product", "machine", "asset"]) ??
    {};

  const number =
    asNonEmptyString(ticket.number) ??
    pickString(root, ["ticketNumber", "number", "id"]) ??
    "N/A";
  const title =
    asNonEmptyString(ticket.title) ??
    pickString(root, ["subject", "title", "name"]) ??
    "N/A";

  const status =
    normalizeStatusOrPriority(ticket.status) ??
    pickString(root, ["statusName", "status"]) ??
    "N/A";

  const priority =
    normalizeStatusOrPriority(ticket.priority) ??
    pickString(root, ["priorityName", "priority"]) ??
    "N/A";

  const url =
    asNonEmptyString(ticket.url) ??
    pickString(root, ["url", "webUrl", "link"]) ??
    null;

  const createdIso =
    ticket.createdDate ??
    pickDateString(root, ["createdDate", "createdAt", "created_date", "created"]) ??
    null;
  const updatedIso =
    ticket.updatedDate ??
    pickDateString(root, ["updatedDate", "updatedAt", "updated_date", "updated"]) ??
    null;
  const closedIso =
    ticket.closedDate ??
    pickDateString(root, ["closedDate", "closedAt", "closed_date", "closed"]) ??
    null;

  const customerName =
    pickString(customer, ["name", "fullName", "customerName"]) ??
    pickString(root, ["customerName"]) ??
    "N/A";
  const customerPhone =
    pickString(customer, ["phone", "phoneNumber", "mobile"]) ??
    pickString(root, ["customerPhone", "phone"]) ??
    "N/A";
  const customerEmail =
    pickString(customer, ["email", "emailAddress"]) ??
    pickString(root, ["customerEmail", "email"]) ??
    "N/A";
  const organization =
    pickString(customer, ["organization", "company", "orgName"]) ??
    pickString(root, ["organization", "customerOrganization"]) ??
    "N/A";
  const account =
    pickString(customer, ["account", "accountName"]) ??
    pickString(root, ["account", "customerAccount"]) ??
    "N/A";
  const externalId =
    pickString(customer, ["externalId", "externalID", "external_id", "id"]) ??
    pickString(root, ["externalId", "external_id"]) ??
    "N/A";
  const segments = normalizeSegments(
    (customer as any).segments ?? (root as any).segments,
  );

  const advisorName =
    pickString(advisor, ["name", "fullName", "advisorName"]) ??
    pickString(root, ["advisorName"]) ??
    "N/A";
  const advisorEmail =
    pickString(advisor, ["email", "emailAddress"]) ??
    pickString(root, ["advisorEmail"]) ??
    "N/A";
  const racfid =
    pickString(advisor, ["racfid", "racfId", "racf", "userId"]) ??
    pickString(root, ["advisorRacfid", "racfid"]) ??
    "N/A";
  const team =
    pickString(advisor, ["team", "teamName"]) ??
    pickString(root, ["team", "teamName"]) ??
    "N/A";
  const division =
    pickString(advisor, ["division", "divisionName"]) ??
    pickString(root, ["division", "divisionName"]) ??
    "N/A";
  const template =
    pickString(advisor, ["template", "templateName"]) ??
    pickString(root, ["template", "templateName"]) ??
    "N/A";

  const productName =
    pickString(product, ["name", "product", "model", "modelName"]) ??
    pickString(root, ["product", "productName", "modelName"]) ??
    "N/A";
  const serialNumber =
    asNonEmptyString((product as any).serialNumber) ??
    pickString(root, ["serialNumber", "serial_number", "machineSerialNumber"]) ??
    "N/A";
  const machineHours = safeText(
    (product as any).machineHours ?? (root as any).machineHours,
    "N/A",
  );

  const source = safeText((root as any).source, "N/A");
  const support = safeText((root as any).support, "N/A");
  const timeToFirstResponse = safeText((root as any).timeToFirstResponse, "N/A");

  const description = safeText((root as any).description, "N/A");
  const resolution = safeText((root as any).resolution, "N/A");
  const miscValue = (root as any).misc ?? null;
  const misc = stringifyUnknown(miscValue, "N/A");

  return {
    header: {
      number: safeText(number, "N/A"),
      title: safeText(title, "N/A"),
      status: safeText(status, "N/A"),
      priority: safeText(priority, "N/A"),
      url,
    },
    contact: {
      name: safeText(customerName, "N/A"),
      phone: safeText(customerPhone, "N/A"),
      email: safeText(customerEmail, "N/A"),
      organization: safeText(organization, "N/A"),
      account: safeText(account, "N/A"),
      externalId: safeText(externalId, "N/A"),
      segments,
    },
    advisor: {
      name: safeText(advisorName, "N/A"),
      email: safeText(advisorEmail, "N/A"),
      racfid: safeText(racfid, "N/A"),
      team: safeText(team, "N/A"),
      division: safeText(division, "N/A"),
      template: safeText(template, "N/A"),
    },
    meta: {
      createdAt: formatDateTimePtBR(createdIso, "N/A"),
      updatedAt: formatDateTimePtBR(updatedIso, "N/A"),
      closedAt: closedIso ? formatDateTimePtBR(closedIso, "N/A") : "—",
      product: safeText(productName, "N/A"),
      serialNumber: safeText(serialNumber, "N/A"),
      machineHours,
      status: safeText(status, "N/A"),
      source,
      support,
      timeToFirstResponse,
    },
    tags: normalizeTags(ticket.tags),
    machines: normalizeMachines(ticket.machines),
    description: {
      description,
      resolution: resolution === "N/A" ? "—" : resolution,
      misc: misc === "N/A" ? "—" : misc,
    },
    watchers: normalizeWatchers(ticket.watchers),
    customFields: normalizeFields(ticket.fields),
  };
};


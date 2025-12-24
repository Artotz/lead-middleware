export type LeadEventAction =
  | "register_contact"
  | "assign"
  | "close_without_os"
  | "close_with_os"
  | "discard"
  | "convert_to_ticket";

export type TicketEventAction =
  | "view"
  | "add_note"
  | "add_tags"
  | "remove_tags"
  | "close"
  | "reopen"
  | "assign"
  | "external_update_detected";

export type EventPayload = {
  reason?: string;
  note?: string;
  tags?: string[];
  assignee?: string;
  method?: string;
  os?: string;
  valor?: string;
  changed_fields?: Record<string, string>;
  [key: string]: unknown;
};

export type ActionDefinition<Action extends string> = {
  id: Action;
  label: string;
  description: string;
  requiresNote?: boolean;
  requiresReason?: boolean;
  requiresTags?: boolean;
  requiresAssignee?: boolean;
  requiresOs?: boolean;
  requiresValor?: boolean;
  requiresChangedFields?: boolean;
  payloadDefaults?: Partial<EventPayload>;
  disabled?: boolean;
};

export const LEAD_ACTION_DEFINITIONS: ActionDefinition<LeadEventAction>[] = [
  {
    id: "register_contact",
    label: "Registrar contato",
    description: "Registra o contato realizado com descricao obrigatoria.",
    requiresNote: true,
  },
  {
    id: "assign",
    label: "Atribuir",
    description: "Atribui o lead a um responsavel.",
    requiresAssignee: true,
  },
  {
    id: "discard",
    label: "Descartar",
    description: "Descarta o lead (exige motivo).",
    requiresReason: true,
  },
  {
    id: "close_without_os",
    label: "Fechar (sem OS)",
    description: "Fecha o lead sem OS (exige motivo).",
    requiresReason: true,
  },
  {
    id: "close_with_os",
    label: "Fechar (com OS)",
    description: "Fecha o lead com OS e valor.",
    requiresOs: true,
    requiresValor: true,
  },
  {
    id: "convert_to_ticket",
    label: "Converter em ticket",
    description: "Registra intencao de converter esse lead em ticket.",
    payloadDefaults: { method: "manual" },
    disabled: true,
  },
];

export const TICKET_ACTION_DEFINITIONS: ActionDefinition<TicketEventAction>[] =
  [
    {
      id: "view",
      label: "Visualizar",
      description: "Marca que vocǻ visualizou/avaliou o ticket.",
    },
    {
      id: "add_note",
      label: "Adicionar nota",
      description: "Registra uma observaǧǜo interna.",
    },
    {
      id: "add_tags",
      label: "Adicionar tags",
      description: "Adiciona tags ao ticket (exige pelo menos 1 tag).",
      requiresTags: true,
    },
    {
      id: "remove_tags",
      label: "Remover tags",
      description: "Remove tags do ticket (exige pelo menos 1 tag).",
      requiresTags: true,
    },
    {
      id: "close",
      label: "Fechar",
      description: "Registra fechamento do ticket.",
    },
    {
      id: "reopen",
      label: "Reabrir",
      description: "Registra reabertura do ticket.",
    },
    {
      id: "assign",
      label: "Atribuir",
      description: "Atribui o ticket a um responsǭvel.",
      requiresAssignee: true,
    },
    {
      id: "external_update_detected",
      label: "Atualizaǧǜo externa detectada",
      description: "Marca que houve mudanǧa fora do middleware.",
    },
  ];

export type LeadEventInput = {
  leadId: number;
  action: LeadEventAction;
  payload: EventPayload;
};

export type TicketEventInput = {
  ticketId: string;
  action: TicketEventAction;
  payload: EventPayload;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; details?: Record<string, unknown> };

export const MAX_NOTE_CHARS = 2000;
export const MAX_REASON_CHARS = 500;
export const MAX_TAG_CHARS = 50;
export const MAX_TAGS = 20;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  return Object.getPrototypeOf(value) === Object.prototype;
};

const coercePayload = (value: unknown): EventPayload => {
  if (!isPlainObject(value)) return {};
  return value as EventPayload;
};

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeTags = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const tags = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_TAGS)
    .map((tag) => tag.slice(0, MAX_TAG_CHARS));
  return tags.length ? tags : undefined;
};

const normalizeChangedFields = (
  value: unknown,
): Record<string, string> | undefined => {
  if (!isPlainObject(value)) return undefined;
  const entries = Object.entries(value)
    .map(([k, v]) => [String(k).trim(), typeof v === "string" ? v.trim() : String(v)] as const)
    .filter(([k, v]) => Boolean(k) && Boolean(v));
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
};

const applyActionDefaults = <A extends string>(
  defs: ActionDefinition<A>[],
  action: A,
  payload: EventPayload,
): EventPayload => {
  const def = defs.find((item) => item.id === action);
  if (!def?.payloadDefaults) return payload;
  return { ...def.payloadDefaults, ...payload };
};

const validatePayloadCommon = (payload: EventPayload): ValidationResult<EventPayload> => {
  const note = normalizeText(payload.note);
  if (note && note.length > MAX_NOTE_CHARS) {
    return { ok: false, error: `Campo note deve ter atǻ ${MAX_NOTE_CHARS} caracteres.` };
  }
  const reason = normalizeText(payload.reason);
  if (reason && reason.length > MAX_REASON_CHARS) {
    return { ok: false, error: `Campo reason deve ter atǻ ${MAX_REASON_CHARS} caracteres.` };
  }

  const tags = normalizeTags(payload.tags);
  const changed_fields = normalizeChangedFields(payload.changed_fields);

  const next: EventPayload = {
    ...payload,
    note,
    reason,
    tags,
    changed_fields,
  };

  return { ok: true, value: next };
};

export function validateLeadEventInput(raw: unknown): ValidationResult<LeadEventInput> {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Body invǭlido (esperado objeto JSON)." };
  }

  const leadIdRaw = (raw as any).leadId;
  const actionRaw = (raw as any).action;
  const payload = applyActionDefaults(
    LEAD_ACTION_DEFINITIONS,
    actionRaw as LeadEventAction,
    coercePayload((raw as any).payload),
  );

  const leadId = typeof leadIdRaw === "number" ? leadIdRaw : Number(leadIdRaw);
  if (!Number.isFinite(leadId) || !Number.isInteger(leadId) || leadId <= 0) {
    return { ok: false, error: "leadId invǭlido (esperado bigint/id numǻrico)." };
  }

  const action = normalizeText(actionRaw);
  if (!action) return { ok: false, error: "action ǻ obrigatǭrio." };
  const allowed = new Set(LEAD_ACTION_DEFINITIONS.map((d) => d.id));
  if (!allowed.has(action as LeadEventAction)) {
    return { ok: false, error: "action nǜo permitido para lead." };
  }

  const common = validatePayloadCommon(payload);
  if (!common.ok) return common;

  const def = LEAD_ACTION_DEFINITIONS.find((d) => d.id === action)!;
  if (def.requiresNote && !common.value.note) {
    return {
      ok: false,
      error: "Descricao do contato (payload.note) e obrigatoria para register_contact.",
    };
  }
  if (def.requiresReason && !common.value.reason) {
    return { ok: false, error: "Motivo (payload.reason) ǻ obrigatǭrio para discard." };
  }
  if (def.requiresAssignee && !normalizeText(common.value.assignee)) {
    return { ok: false, error: "Responsǭvel (payload.assignee) ǻ obrigatǭrio para assign." };
  }
  if (def.requiresOs && !normalizeText(common.value.os)) {
    return { ok: false, error: "OS (payload.os) e obrigatoria para essa acao." };
  }
  if (def.requiresValor && !normalizeText(common.value.valor)) {
    return { ok: false, error: "Valor (payload.valor) e obrigatorio para essa acao." };
  }
  if (def.requiresChangedFields && !normalizeChangedFields(common.value.changed_fields)) {
    return {
      ok: false,
      error: "Campos alterados (payload.changed_fields) ǻ obrigatǭrio para update_field.",
    };
  }

  const normalized: EventPayload = {
    ...common.value,
    assignee: normalizeText(common.value.assignee),
    method: normalizeText(common.value.method),
    os: normalizeText(common.value.os),
    valor: normalizeText(common.value.valor),
    changed_fields: normalizeChangedFields(common.value.changed_fields),
  };

  return {
    ok: true,
    value: {
      leadId,
      action: action as LeadEventAction,
      payload: normalized,
    },
  };
}

export function validateTicketEventInput(
  raw: unknown,
): ValidationResult<TicketEventInput> {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Body invǭlido (esperado objeto JSON)." };
  }

  const ticketIdRaw = (raw as any).ticketId;
  const actionRaw = (raw as any).action;
  const payload = applyActionDefaults(
    TICKET_ACTION_DEFINITIONS,
    actionRaw as TicketEventAction,
    coercePayload((raw as any).payload),
  );

  const ticketId = normalizeText(ticketIdRaw);
  if (!ticketId) return { ok: false, error: "ticketId ǻ obrigatǭrio." };
  if (!isUuid(ticketId)) {
    return { ok: false, error: "ticketId invǭlido (esperado uuid)." };
  }

  const action = normalizeText(actionRaw);
  if (!action) return { ok: false, error: "action ǻ obrigatǭrio." };
  const allowed = new Set(TICKET_ACTION_DEFINITIONS.map((d) => d.id));
  if (!allowed.has(action as TicketEventAction)) {
    return { ok: false, error: "action nǜo permitido para ticket." };
  }

  const common = validatePayloadCommon(payload);
  if (!common.ok) return common;

  const def = TICKET_ACTION_DEFINITIONS.find((d) => d.id === action)!;
  if (def.requiresTags && !normalizeTags(common.value.tags)) {
    return { ok: false, error: "Tags (payload.tags) ǻ obrigatǭrio para essa aǧǜo." };
  }
  if (def.requiresAssignee && !normalizeText(common.value.assignee)) {
    return { ok: false, error: "Responsǭvel (payload.assignee) ǻ obrigatǭrio para assign." };
  }

  const normalized: EventPayload = {
    ...common.value,
    tags: normalizeTags(common.value.tags),
    assignee: normalizeText(common.value.assignee),
  };

  return {
    ok: true,
    value: {
      ticketId,
      action: action as TicketEventAction,
      payload: normalized,
    },
  };
}

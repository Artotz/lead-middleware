import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function loadDotEnvLocal() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith("\"") && val.endsWith("\"")) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  });
}

loadDotEnvLocal();

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Env obrigatǭrias: NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const parseCsv = (value) =>
  String(value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const seedLeadIdsFromEnv = () =>
  parseCsv(process.env.SEED_LEAD_IDS).map((v) => Number(v)).filter((n) => Number.isFinite(n));

const seedTicketIdsFromEnv = () => parseCsv(process.env.SEED_TICKET_IDS);

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomOccurredAt = () => {
  const now = Date.now();
  const days = Math.floor(Math.random() * 25); // last ~25 days
  const minutes = Math.floor(Math.random() * 24 * 60);
  return new Date(now - days * 24 * 60 * 60 * 1000 - minutes * 60 * 1000).toISOString();
};

async function fetchLeadIds(limit = 10) {
  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function fetchTicketIds(limit = 10) {
  const { data, error } = await supabase
    .from("tickets")
    .select("ticket_id")
    .not("ticket_id", "is", null)
    .order("ticket_id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => row.ticket_id).filter(Boolean);
}

async function tryCreateLeadsIfMissing(targetCount) {
  const rows = Array.from({ length: targetCount }).map((_, i) => ({
    regional: randomFrom(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]),
    estado: "SP",
    city: "Sǜo Paulo",
    chassi: `SEED-CHASSI-${Date.now()}-${i}`,
    model_name: "Modelo Seed",
    cliente_base_enriquecida: "Cliente Seed",
    horimetro_atual_machine_list: 1234,
    last_called_group: "seed",
    lead_preventiva: "SIM",
    lead_garantia_basica: null,
    lead_garantia_estendida: null,
    lead_reforma_de_componentes: null,
    lead_lamina: null,
    lead_dentes: null,
    lead_rodante: null,
    lead_disponibilidade: null,
    lead_reconexao: null,
    lead_transferencia_de_aor: null,
    status: "novo",
    imported_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("leads").insert(rows).select("id");
  if (error) {
    console.warn("Nǜo foi possǭvel criar leads seed automaticamente:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id).filter(Boolean);
}

async function tryCreateTicketsIfMissing(targetCount) {
  const rows = Array.from({ length: targetCount }).map((_, i) => ({
    ticket_id: crypto.randomUUID(),
    number: `SEED-${Date.now()}-${i}`,
    title: "Ticket Seed",
    status: 1,
    serial_number: `SN-${Date.now()}-${i}`,
    updated_date: new Date().toISOString(),
    created_date: new Date().toISOString(),
    url: null,
  }));

  const { data, error } = await supabase
    .from("tickets")
    .insert(rows)
    .select("ticket_id");
  if (error) {
    console.warn("Nǜo foi possǭvel criar tickets seed automaticamente:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.ticket_id).filter(Boolean);
}

const users = [
  { id: crypto.randomUUID(), email: "ana.seed@example.com", name: "Ana Seed" },
  { id: crypto.randomUUID(), email: "bruno.seed@example.com", name: "Bruno Seed" },
  { id: crypto.randomUUID(), email: "carla.seed@example.com", name: "Carla Seed" },
];

async function main() {
  let leadIds = seedLeadIdsFromEnv();
  let ticketIds = seedTicketIdsFromEnv();

  if (leadIds.length === 0) {
    leadIds = await fetchLeadIds(10);
  }
  if (ticketIds.length === 0) {
    ticketIds = await fetchTicketIds(10);
  }

  if (leadIds.length < 10 && seedLeadIdsFromEnv().length === 0) {
    const created = await tryCreateLeadsIfMissing(10 - leadIds.length);
    leadIds = leadIds.concat(created).slice(0, 10);
  }

  if (ticketIds.length < 10 && seedTicketIdsFromEnv().length === 0) {
    const created = await tryCreateTicketsIfMissing(10 - ticketIds.length);
    ticketIds = ticketIds.concat(created).slice(0, 10);
  }

  if (leadIds.length === 0 || ticketIds.length === 0) {
    console.error(
      "Nǜo encontrei leads/tickets suficientes. Use SEED_LEAD_IDS e SEED_TICKET_IDS para informar IDs existentes.",
    );
    process.exit(1);
  }

  const leadActions = [
    "view",
    "qualify",
    "add_note",
    "assign",
    "update_field",
    "convert_to_ticket",
    "discard",
  ];
  const ticketActions = [
    "view",
    "add_note",
    "add_tags",
    "remove_tags",
    "assign",
    "close",
    "reopen",
    "external_update_detected",
  ];

  const leadEvents = [];
  for (const leadId of leadIds.slice(0, 10)) {
    for (let i = 0; i < 2; i += 1) {
      const user = randomFrom(users);
      const action = randomFrom(leadActions);
      const payload = {};
      if (action === "discard") payload.reason = "Lead fora do perfil (seed)";
      if (action === "add_note") payload.note = "Contato feito (seed)";
      if (action === "assign") payload.assignee = "owner.seed@example.com";
      if (action === "update_field") payload.changed_fields = { status: "em_andamento" };
      if (action === "convert_to_ticket") payload.method = "manual";
      leadEvents.push({
        lead_id: leadId,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_name: user.name,
        action,
        source: "seed",
        occurred_at: randomOccurredAt(),
        payload,
      });
    }
  }

  const ticketEvents = [];
  for (const ticketId of ticketIds.slice(0, 10)) {
    for (let i = 0; i < 2; i += 1) {
      const user = randomFrom(users);
      const action = randomFrom(ticketActions);
      const payload = {};
      if (action === "add_note") payload.note = "Atualizaǧǜo interna (seed)";
      if (action === "add_tags") payload.tags = ["seed", "vip"];
      if (action === "remove_tags") payload.tags = ["old"];
      if (action === "assign") payload.assignee = "owner.seed@example.com";
      ticketEvents.push({
        ticket_id: ticketId,
        actor_user_id: user.id,
        actor_email: user.email,
        actor_name: user.name,
        action,
        source: "seed",
        occurred_at: randomOccurredAt(),
        payload,
      });
    }
  }

  const { error: leadErr } = await supabase.from("lead_events").insert(leadEvents);
  if (leadErr) throw leadErr;

  const { error: ticketErr } = await supabase.from("ticket_events").insert(ticketEvents);
  if (ticketErr) throw ticketErr;

  console.log("Seed concluǭdo.");
  console.log(`- lead_events: ${leadEvents.length} eventos (${leadIds.length} leads)`);
  console.log(`- ticket_events: ${ticketEvents.length} eventos (${ticketIds.length} tickets)`);
  console.log("- Usuǭrios seed:");
  users.forEach((u) => console.log(`  - ${u.name} <${u.email}> (${u.id})`));
}

main().catch((err) => {
  console.error("Seed falhou:", err?.message ?? err);
  process.exit(1);
});


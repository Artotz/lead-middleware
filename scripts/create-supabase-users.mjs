#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_ROLE = "standard";
const ALLOWED_ROLES = new Set(["standard", "admin"]);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
    } else {
      result[key] = next;
      i += 1;
    }
  }
  return result;
}

function parseEmails(raw) {
  if (!raw) return [];
  const tokens = raw
    .split(/[,\n\r;\t ]+/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(tokens));
}

function readEmailsFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de e-mails não encontrado: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return parseEmails(lines.join(","));
}

function printUsage() {
  console.log(`
Uso:
  node scripts/create-supabase-users.mjs --file ./emails.txt --password "Senha@123"
  node scripts/create-supabase-users.mjs --emails "a@x.com,b@x.com" --password "Senha@123"

Opções:
  --file <path>          Arquivo com 1 e-mail por linha
  --emails <lista>       Lista separada por vírgula/espaco/ponto-e-vírgula
  --password <senha>     Senha padrão para todos os usuários (obrigatório)
  --role <role>          standard | admin (padrão: standard)
  --dry-run              Não cria usuários; apenas mostra o que faria
`);
}

async function listAllUsersByEmail(supabase) {
  const byEmail = new Map();
  let page = 1;
  const perPage = 1000;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`Erro ao listar usuários: ${error.message}`);
    const users = data?.users ?? [];
    for (const user of users) {
      const email = (user.email ?? "").trim().toLowerCase();
      if (!email) continue;
      byEmail.set(email, user.id);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  return byEmail;
}

async function ensureRoleRow(supabase, userId, role) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) {
    throw new Error(`Erro ao gravar role em user_roles: ${error.message}`);
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true" || args.h === "true") {
    printUsage();
    return;
  }

  const role = (args.role ?? DEFAULT_ROLE).trim().toLowerCase();
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error(`Role inválida: ${role}. Use standard ou admin.`);
  }

  const password = args.password?.trim();
  if (!password) {
    printUsage();
    throw new Error("Informe --password.");
  }

  const fileEmails = args.file ? readEmailsFromFile(path.resolve(args.file)) : [];
  const inlineEmails = parseEmails(args.emails ?? "");
  const emails = Array.from(new Set([...fileEmails, ...inlineEmails]));

  if (!emails.length) {
    printUsage();
    throw new Error("Nenhum e-mail informado.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dryRun = args["dry-run"] === "true";
  const existingUsersByEmail = await listAllUsersByEmail(supabase);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      const existingUserId = existingUsersByEmail.get(email);
      if (existingUserId) {
        if (!dryRun) {
          await ensureRoleRow(supabase, existingUserId, role);
        }
        skipped += 1;
        console.log(`[skip] ${email} (já existe)`);
        continue;
      }

      if (dryRun) {
        console.log(`[dry-run] criaria ${email} com role=${role}`);
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error || !data.user?.id) {
        failed += 1;
        console.error(`[erro] ${email}: ${error?.message ?? "sem user_id"}`);
        continue;
      }

      await ensureRoleRow(supabase, data.user.id, role);
      existingUsersByEmail.set(email, data.user.id);
      created += 1;
      console.log(`[ok] ${email} criado com role=${role}`);
    } catch (error) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : "falha não identificada";
      console.error(`[erro] ${email}: ${message}`);
    }
  }

  console.log("");
  console.log("Resumo:");
  console.log(`- total lidos: ${emails.length}`);
  console.log(`- criados: ${created}`);
  console.log(`- já existentes (skip): ${skipped}`);
  console.log(`- falhas: ${failed}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha fatal: ${message}`);
  process.exitCode = 1;
});

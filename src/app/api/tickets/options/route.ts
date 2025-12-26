import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const normalize = (value: string | null) => value?.trim() ?? "";

const dedupe = (items: (string | null)[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of items) {
    const val = normalize(raw);
    if (!val) continue;
    if (seen.has(val)) continue;
    seen.add(val);
    result.push(val);
  }
  return result;
};

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "Não autenticado" },
        { status: 401 },
      );
    }

    const [advisorsResp, customersResp, teamsResp] = await Promise.all([
      supabase
        .from("tickets")
        .select("advisor_first_name, advisor_last_name, advisor_email, advisor_racfid"),
      supabase
        .from("tickets")
        .select("customer_organization"),
      supabase.from("tickets").select("team_name"),
    ]);

    if (advisorsResp.error || customersResp.error || teamsResp.error) {
      const error = advisorsResp.error ?? customersResp.error ?? teamsResp.error;
      console.error("Supabase ticket options error", error);
      return NextResponse.json(
        { message: "Erro ao buscar opções de filtro", details: error?.message },
        { status: 500 },
      );
    }

    const consultores = dedupe(
      (advisorsResp.data ?? []).map((row) => {
        const first = normalize(row.advisor_first_name);
        const last = normalize(row.advisor_last_name);
        if (first && last) return `${first} ${last}`;
        return first || last || normalize(row.advisor_email) || normalize(row.advisor_racfid);
      }),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const clientes = dedupe(
      (customersResp.data ?? []).map((row) => normalize(row.customer_organization)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    const equipes = dedupe(
      (teamsResp.data ?? []).map((row) => normalize(row.team_name)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return NextResponse.json({ consultores, clientes, equipes });
  } catch (err) {
    console.error("Unexpected error fetching ticket options", err);
    return NextResponse.json(
      { message: "Erro inesperado ao buscar opções de filtro" },
      { status: 500 },
    );
  }
}

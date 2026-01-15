"use client";

import { Badge } from "@/components/Badge";
import { PageShell } from "@/components/PageShell";

type ScheduleType =
  | "Inspecao"
  | "Revisao"
  | "Manutencao"
  | "Entrega"
  | "Treinamento"
  | "Visita"
  | "Instalacao";

type ScheduleStatus = "Confirmado" | "Pendente" | "Critico";

type ScheduleItem = {
  id: string;
  time: string;
  duration: string;
  title: string;
  client: string;
  location: string;
  consultant: string;
  type: ScheduleType;
  status: ScheduleStatus;
};

type BadgeTone = NonNullable<Parameters<typeof Badge>[0]["tone"]>;

type ScheduleDay = {
  id: string;
  label: string;
  dateLabel: string;
  tone: BadgeTone;
  items: ScheduleItem[];
};

const typeTone: Record<ScheduleType, BadgeTone> = {
  Inspecao: "sky",
  Revisao: "amber",
  Manutencao: "violet",
  Entrega: "emerald",
  Treinamento: "slate",
  Visita: "stone",
  Instalacao: "sky",
};

const statusTone: Record<ScheduleStatus, BadgeTone> = {
  Confirmado: "emerald",
  Pendente: "amber",
  Critico: "rose",
};

const weekDayIds = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;

const weekSchedule: ScheduleDay[] = [
  {
    id: "seg",
    label: "Segunda",
    dateLabel: "15 Jan",
    tone: "sky",
    items: [
      {
        id: "seg-1",
        time: "08:00",
        duration: "1h30",
        title: "Inspecao preventiva - D8T",
        client: "Construtora Vale",
        location: "Belo Horizonte / MG",
        consultant: "Carlos Lima",
        type: "Inspecao",
        status: "Confirmado",
      },
      {
        id: "seg-2",
        time: "10:30",
        duration: "1h",
        title: "Revisao de garantia - 320GX",
        client: "Mineradora Azul",
        location: "Itabira / MG",
        consultant: "Marina Souza",
        type: "Revisao",
        status: "Pendente",
      },
      {
        id: "seg-3",
        time: "14:00",
        duration: "2h",
        title: "Entrega de laudo - 140K",
        client: "Logistica Norte",
        location: "Contagem / MG",
        consultant: "Carlos Lima",
        type: "Entrega",
        status: "Confirmado",
      },
    ],
  },
  {
    id: "ter",
    label: "Terca",
    dateLabel: "16 Jan",
    tone: "sky",
    items: [
      {
        id: "ter-1",
        time: "09:00",
        duration: "2h",
        title: "Manutencao programada - 938K",
        client: "Construtora Delta",
        location: "Betim / MG",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Confirmado",
      },
      {
        id: "ter-2",
        time: "13:30",
        duration: "1h",
        title: "Visita comercial - Frota CAT",
        client: "Transporte Sol",
        location: "Sete Lagoas / MG",
        consultant: "Ana Cruz",
        type: "Visita",
        status: "Pendente",
      },
    ],
  },
  {
    id: "qua",
    label: "Quarta",
    dateLabel: "17 Jan",
    tone: "sky",
    items: [
      {
        id: "qua-1",
        time: "07:30",
        duration: "1h",
        title: "Checklist de entrega - 320",
        client: "Terraplenagem Lima",
        location: "Sabara / MG",
        consultant: "Juliana Prado",
        type: "Entrega",
        status: "Confirmado",
      },
      {
        id: "qua-2",
        time: "09:30",
        duration: "1h30",
        title: "Treinamento operador - 950L",
        client: "Mina Serra",
        location: "Santa Luzia / MG",
        consultant: "Rafael Dias",
        type: "Treinamento",
        status: "Confirmado",
      },
      {
        id: "qua-3",
        time: "13:00",
        duration: "2h",
        title: "Inspecao de seguranca - 336",
        client: "Pedreira Oeste",
        location: "Itauna / MG",
        consultant: "Juliana Prado",
        type: "Inspecao",
        status: "Critico",
      },
      {
        id: "qua-4",
        time: "16:00",
        duration: "1h",
        title: "Revisao pos-venda - 416F",
        client: "Agro Campo",
        location: "Nova Lima / MG",
        consultant: "Rafael Dias",
        type: "Revisao",
        status: "Pendente",
      },
    ],
  },
  {
    id: "qui",
    label: "Quinta",
    dateLabel: "18 Jan",
    tone: "sky",
    items: [
      {
        id: "qui-1",
        time: "08:30",
        duration: "1h",
        title: "Instalacao telemetria - D6R",
        client: "Construtora Horizonte",
        location: "Vespasiano / MG",
        consultant: "Carlos Lima",
        type: "Instalacao",
        status: "Confirmado",
      },
      {
        id: "qui-2",
        time: "15:30",
        duration: "1h30",
        title: "Manutencao emergencia - 988H",
        client: "Porto Seco",
        location: "Santa Rita / MG",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Critico",
      },
    ],
  },
  {
    id: "sex",
    label: "Sexta",
    dateLabel: "19 Jan",
    tone: "sky",
    items: [
      {
        id: "sex-1",
        time: "08:00",
        duration: "1h",
        title: "Revisao trimestral - 140M",
        client: "Prefeitura Sul",
        location: "Lavras / MG",
        consultant: "Marina Souza",
        type: "Revisao",
        status: "Confirmado",
      },
      {
        id: "sex-2",
        time: "11:00",
        duration: "2h",
        title: "Inspecao preventiva - 950H",
        client: "Rodovias Minas",
        location: "Pouso Alegre / MG",
        consultant: "Ana Cruz",
        type: "Inspecao",
        status: "Confirmado",
      },
      {
        id: "sex-3",
        time: "15:00",
        duration: "1h",
        title: "Visita de follow-up - 312D",
        client: "Rural Terra",
        location: "Formiga / MG",
        consultant: "Ana Cruz",
        type: "Visita",
        status: "Pendente",
      },
    ],
  },
  {
    id: "sab",
    label: "Sabado",
    dateLabel: "20 Jan",
    tone: "sky",
    items: [
      {
        id: "sab-1",
        time: "09:00",
        duration: "1h30",
        title: "Manutencao leve - 420F",
        client: "Cia Estradas",
        location: "Sete Lagoas / MG",
        consultant: "Paulo Reis",
        type: "Manutencao",
        status: "Confirmado",
      },
      {
        id: "sab-2",
        time: "11:30",
        duration: "1h",
        title: "Entrega de checklist - 320",
        client: "Construtora Vale",
        location: "Belo Horizonte / MG",
        consultant: "Carlos Lima",
        type: "Entrega",
        status: "Confirmado",
      },
    ],
  },
  {
    id: "dom",
    label: "Domingo",
    dateLabel: "21 Jan",
    tone: "sky",
    items: [],
  },
];

const totalAppointments = weekSchedule.reduce(
  (total, day) => total + day.items.length,
  0
);

function ScheduleCard({ item, order }: { item: ScheduleItem; order: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm">
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-start gap-1.5">
          <input
            type="checkbox"
            defaultChecked={item.status === "Confirmado"}
            aria-label={`Marcar agendamento ${item.title}`}
            className="mt-0.5 h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <Badge tone="slate">#{order}</Badge>
        </div>
        <div className="text-right text-[10px] text-slate-400">
          <div className="font-semibold text-slate-600">{item.time}</div>
          <div>{item.duration}</div>
        </div>
      </div>

      <div className="mt-2 min-w-0">
        <div className="text-xs font-semibold text-slate-900 line-clamp-2">
          {item.title}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
          {item.client}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={typeTone[item.type]}>{item.type}</Badge>
        <Badge tone={statusTone[item.status]}>{item.status}</Badge>
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
        <div>{item.location}</div>
        <div>Consultor: {item.consultant}</div>
      </div>
    </div>
  );
}

export default function CronogramaClient() {
  const todayId = weekDayIds[new Date().getDay()];

  return (
    <PageShell
      title="Cronograma semanal"
      subtitle="Agendamentos mockados por dia, em ordem de execucao."
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Semana atual</span>
          <span>{totalAppointments} agendamentos</span>
        </div>

        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-full gap-1">
            {weekSchedule.map((day) => {
              const isToday = day.id === todayId;

              return (
                <div
                  key={day.id}
                  className={`min-w-[170px] max-w-[220px] flex-1 rounded-xl border p-1 ${
                    isToday
                      ? "border-sky-200 bg-sky-100/80"
                      : "border-transparent"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between rounded-lg border px-2 py-1.5 shadow-sm ${
                      isToday
                        ? "border-sky-200 bg-sky-50 ring-2 ring-sky-200"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge tone={day.tone}>{day.label}</Badge>
                        {isToday ? <Badge tone="emerald">Hoje</Badge> : null}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {day.dateLabel}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {day.items.length}
                    </span>
                  </div>

                  <div className="mt-2 space-y-2">
                    {day.items.length ? (
                      day.items.map((item, index) => (
                        <ScheduleCard
                          key={item.id}
                          item={item}
                          order={index + 1}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-2 py-4 text-center text-[11px] text-slate-400">
                        Sem agendamentos.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

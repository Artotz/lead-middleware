"use client";

import React from "react";
import { KeyValueGrid } from "@/components/ticket-details/KeyValueGrid";

type TicketMetaInfoProps = {
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
};

export function TicketMetaInfo({ meta }: TicketMetaInfoProps) {
  return (
    <KeyValueGrid
      items={[
        { label: "Criado em", value: meta.createdAt },
        { label: "Atualizado em", value: meta.updatedAt },
        { label: "Fechado em", value: meta.closedAt },
        { label: "Produto", value: meta.product },
        { label: "Número de série", value: meta.serialNumber },
        { label: "Horas da máquina", value: meta.machineHours },
        { label: "Status", value: meta.status },
        { label: "Source", value: meta.source },
        { label: "Support", value: meta.support },
        { label: "Time to first response", value: meta.timeToFirstResponse },
      ]}
    />
  );
}


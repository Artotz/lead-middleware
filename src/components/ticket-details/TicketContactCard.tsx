"use client";

import React from "react";
import { Badge } from "@/components/Badge";
import { KeyValueGrid } from "@/components/ticket-details/KeyValueGrid";

type TicketContactCardProps = {
  contact: {
    name: string;
    phone: string;
    email: string;
    organization: string;
    account: string;
    externalId: string;
    segments: string[];
  };
};

export function TicketContactCard({ contact }: TicketContactCardProps) {
  return (
    <div className="space-y-3">
      <KeyValueGrid
        items={[
          { label: "Nome do cliente", value: contact.name },
          { label: "Telefone", value: contact.phone },
          { label: "Email", value: contact.email },
          { label: "Organização", value: contact.organization },
          { label: "Conta", value: contact.account },
          { label: "ID Externo", value: contact.externalId },
        ]}
      />

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Segmentos
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {contact.segments.length ? (
            contact.segments.map((seg) => (
              <Badge key={seg} tone="stone">
                {seg}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-600">N/A</span>
          )}
        </div>
      </div>
    </div>
  );
}


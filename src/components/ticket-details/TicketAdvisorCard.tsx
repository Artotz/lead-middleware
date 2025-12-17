"use client";

import React from "react";
import { KeyValueGrid } from "@/components/ticket-details/KeyValueGrid";

type TicketAdvisorCardProps = {
  advisor: {
    name: string;
    email: string;
    racfid: string;
    team: string;
    division: string;
    template: string;
  };
};

export function TicketAdvisorCard({ advisor }: TicketAdvisorCardProps) {
  return (
    <KeyValueGrid
      items={[
        { label: "Nome do advisor", value: advisor.name },
        { label: "Email", value: advisor.email },
        { label: "RACFID", value: advisor.racfid },
        { label: "Equipe", value: advisor.team },
        { label: "Divisão", value: advisor.division },
        { label: "Template", value: advisor.template },
      ]}
    />
  );
}


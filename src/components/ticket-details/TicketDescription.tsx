"use client";

import React from "react";

type TicketDescriptionProps = {
  description: {
    description: string;
    resolution: string;
    misc: string;
  };
};

const Block = ({ title, text }: { title: string; text: string }) => (
  <div className="space-y-1">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {title}
    </div>
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap break-words">
      {text}
    </div>
  </div>
);

export function TicketDescription({ description }: TicketDescriptionProps) {
  return (
    <div className="space-y-3">
      <Block title="Description" text={description.description} />
      <Block title="Resolution" text={description.resolution} />
      <Block title="Misc" text={description.misc} />
    </div>
  );
}


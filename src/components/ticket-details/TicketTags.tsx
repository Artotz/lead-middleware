"use client";

import React from "react";
import { Badge } from "@/components/Badge";

type TicketTagsProps = {
  tags: { name: string; subTags: string[] }[];
};

export function TicketTags({ tags }: TicketTagsProps) {
  if (!tags.length) {
    return <div className="text-sm text-slate-600">N/A</div>;
  }

  return (
    <div className="space-y-3">
      {tags.map((tag) => (
        <div key={tag.name} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">{tag.name}</Badge>
            {tag.subTags.length ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Subtags
              </span>
            ) : null}
          </div>
          {tag.subTags.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {tag.subTags.map((sub) => (
                <Badge key={`${tag.name}::${sub}`} tone="stone">
                  {sub}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}


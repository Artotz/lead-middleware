"use client";

type BadgeTone =
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate"
  | "violet"
  | "stone";

type BadgeProps = {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
};

const toneClasses: Record<BadgeTone, string> = {
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
  slate: "bg-slate-100 text-slate-800 border-slate-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  stone: "bg-stone-100 text-stone-800 border-stone-200",
};

export function Badge({ tone = "slate", children, className }: BadgeProps) {
  const classes = [
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
    toneClasses[tone],
  ];

  if (className) {
    classes.push(className);
  }

  return <span className={classes.join(" ")}>{children}</span>;
}

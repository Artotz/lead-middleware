"use client";

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  variant?: "pill" | "header";
};

export function Tabs({
  tabs,
  activeTabId,
  onTabChange,
  variant = "pill",
}: TabsProps) {
  const wrapperClass =
    variant === "header"
      ? "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1"
      : "inline-flex items-center divide-x divide-slate-200 rounded-full border border-slate-200 bg-white shadow-sm";
  const buttonBase =
    "border border-transparent px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]/50 focus-visible:z-10 first:rounded-l-full last:rounded-r-full";
  const activeClass =
    variant === "header"
      ? "border-white/30 bg-white/20 text-white shadow-sm"
      : "border-[#F2A900] bg-[#FFDE00] text-slate-900 shadow-sm";
  const inactiveClass =
    variant === "header"
      ? "bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
      : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900";
  return (
    <div className={wrapperClass}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`${buttonBase} ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

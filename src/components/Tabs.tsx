"use client";

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
};

export function Tabs({ tabs, activeTabId, onTabChange }: TabsProps) {
  return (
    <div className="inline-flex items-center divide-x divide-slate-200 rounded-full border border-slate-200 bg-white shadow-sm">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2A900]/50 focus-visible:z-10 first:rounded-l-full last:rounded-r-full ${
              isActive
                ? "bg-[#FFDE00] text-slate-900 shadow-sm"
                : "bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
      );
      })}
    </div>
  );
}

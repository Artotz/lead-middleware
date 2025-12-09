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
    <div className="flex items-center gap-3">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300/80 focus:ring-offset-0 ${
              isActive
                ? "border-sky-400 bg-sky-100 text-sky-800 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

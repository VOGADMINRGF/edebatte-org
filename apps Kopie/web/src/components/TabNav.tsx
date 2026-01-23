// components/TabNav.tsx

import { useState } from "react";

/**
 * Ein universelles Tab-Navigations-Layout für alle Dashboards.
 * @param tabs Die Tab-Beschriftungen
 * @param children Jeweils ein Child pro Tab (Reihenfolge beachten!)
 */
export default function TabNav({
  tabs,
  children,
}: {
  tabs: string[];
  children: React.ReactNode[];
}) {
  const [tab, setTab] = useState(0);
  return (
    <div>
      <div className="flex mb-4 gap-2">
        {tabs.map((label, i) => (
          <button
            key={label}
            className={`px-4 py-2 rounded ${i === tab ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div>{children[tab]}</div>
    </div>
  );
}

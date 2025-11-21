"use client";

import { useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { getFaqTabs } from "./strings";

export function FAQTabs() {
  const { locale } = useLocale();
  const faqTabs = getFaqTabs(locale);
  const [tab, setTab] = useState(0);
  return (
    <section className="mb-10">
      <div className="flex gap-2 justify-center mb-4 flex-wrap">
        {faqTabs.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => setTab(idx)}
            className={`px-4 py-2 rounded-full font-semibold
              ${tab === idx ? "bg-coral text-white shadow" : "bg-gray-50 text-coral border border-coral"}
              transition`}
            style={{ minWidth: 170 }}
            aria-selected={tab === idx}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-coral text-gray-800 min-h-[80px]">
        <p>{faqTabs[tab].body}</p>
      </div>
    </section>
  );
}

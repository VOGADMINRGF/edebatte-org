"use client";
import React, { useState } from "react";
import { getNationalFlag } from "@features/stream/utils/nationalFlag";
import { colors } from "../theme";

function VoteBarMini({ agree = 0, neutral = 0, disagree = 0 }) {
  const sum = agree + neutral + disagree;
  const pc = (n: number) => sum ? ((n / sum) * 100).toFixed(1) : "0.0";
  return (
    <div className="flex-1 h-2 rounded bg-gray-200 overflow-hidden flex">
      <div style={{ width: pc(agree) + "%", background: colors.turquoise }} />
      <div style={{ width: pc(neutral) + "%", background: colors.warning }} />
      <div style={{ width: pc(disagree) + "%", background: colors.coral }} />
    </div>
  );
}

// Typisierung beachten! (optional mit TS)
export default function CountryAccordion({ countries, regionScope = [], userCountry }: { countries: any; regionScope?: any[]; userCountry?: any }) {
  // Fallback: regionScope nach countries mappen
  const countriesData = countries
    || (Array.isArray(regionScope) ? regionScope.map(r =>
        typeof r === "string" ? { code: r, name: r, agree: 0, neutral: 0, disagree: 0, cities: [] } : r
      ) : []);

  const [openCountry, setOpenCountry] = useState<string | null>(null);

  if (!countriesData || countriesData.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-3">
      {countriesData.map((country: any) => (
        <div key={country.code || country.name} className="border rounded-lg p-2 bg-neutral-50">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setOpenCountry(openCountry === (country.code || country.name) ? null : (country.code || country.name))}
          >
            <span className="text-lg">{getNationalFlag(country.code || country.name)}</span>
            <span className={userCountry === country.code ? "font-bold underline" : "font-semibold"}>
              {country.name || country.code}
            </span>
            <VoteBarMini {...country} />
            <span className="ml-2 text-xs text-neutral-500">{(country.agree + country.neutral + country.disagree) || 0} Stimmen</span>
            <span className="ml-auto">{country.cities?.length > 0 && (
              <span className="text-indigo-400 text-sm">{openCountry === (country.code || country.name) ? "▲" : "▼"}</span>
            )}</span>
          </div>
          {/* Städte/Landkreise */}
          {openCountry === (country.code || country.name) && country.cities?.length > 0 && (
            <div className="pl-7 pt-2 flex flex-col gap-1">
              {country.cities.map((city: any) => (
                <div key={city.name} className="flex items-center gap-2">
                  <span className="font-medium w-32 truncate">{city.name}</span>
                  <VoteBarMini {...city} />
                  <span className="ml-2 text-xs text-neutral-500">{(city.agree + city.neutral + city.disagree) || 0} Stimmen</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

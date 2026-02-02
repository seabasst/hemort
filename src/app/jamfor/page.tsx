"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { municipalities, Municipality, formatNumber, formatCurrency } from "@/data/municipalities";
import { Suspense } from "react";
import RadarChart from "@/components/RadarChart";
import HousingBarChart from "@/components/HousingBarChart";

const RADAR_COLORS = ["#059669", "#2563eb", "#d97706", "#9333ea"];

function getRadarData(m: Municipality) {
  return [
    { label: "Kollektivtrafik", value: m.publicTransportScore, fullMark: 10 },
    { label: "Trygghet", value: m.safetyIndex, fullMark: 10 },
    { label: "Kultur", value: m.culturalOfferScore, fullMark: 10 },
    { label: "Friluftsliv", value: m.outdoorScore, fullMark: 10 },
    { label: "Familj", value: m.familyFriendlyScore, fullMark: 10 },
    { label: "Jobb", value: m.jobMarketScore, fullMark: 10 },
  ];
}

function CompareContent() {
  const searchParams = useSearchParams();
  const initialSlugs = searchParams.get("kommuner")?.split(",").filter(Boolean) || [];

  const [selected, setSelected] = useState<string[]>(
    initialSlugs.filter((s) => municipalities.some((m) => m.slug === s))
  );
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedMunicipalities = selected
    .map((s) => municipalities.find((m) => m.slug === s))
    .filter(Boolean) as Municipality[];

  const filtered = search.length >= 1
    ? municipalities.filter(
        (m) =>
          !selected.includes(m.slug) &&
          (m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.county.toLowerCase().includes(search.toLowerCase()))
      )
    : municipalities.filter((m) => !selected.includes(m.slug));

  const addMunicipality = (slug: string) => {
    if (selected.length < 4 && !selected.includes(slug)) {
      setSelected([...selected, slug]);
    }
    setSearch("");
    setDropdownOpen(false);
  };

  const removeMunicipality = (slug: string) => {
    setSelected(selected.filter((s) => s !== slug));
  };

  const rows: { label: string; getValue: (m: Municipality) => string; highlight?: "low" | "high" }[] = [
    { label: "Län", getValue: (m) => m.county },
    { label: "Invånare", getValue: (m) => formatNumber(m.population), highlight: "high" },
    { label: "Yta (km²)", getValue: (m) => formatNumber(m.area) },
    { label: "Bostadspris/m²", getValue: (m) => formatCurrency(m.avgHousingPrice), highlight: "low" },
    { label: "Hyra 2 rum/mån", getValue: (m) => formatCurrency(m.avgRentApartment), highlight: "low" },
    { label: "Skattesats", getValue: (m) => `${m.taxRate}%`, highlight: "low" },
    { label: "Medianinkomst", getValue: (m) => formatCurrency(m.avgIncome), highlight: "high" },
    { label: "Arbetslöshet", getValue: (m) => `${m.unemployment}%`, highlight: "low" },
    { label: "Natur", getValue: (m) => m.nature },
    { label: "Kust", getValue: (m) => m.coastline ? "Ja" : "Nej" },
    { label: "Kollektivtrafik", getValue: (m) => `${m.publicTransportScore}/10`, highlight: "high" },
    { label: "Trygghet", getValue: (m) => `${m.safetyIndex}/10`, highlight: "high" },
    { label: "Kulturutbud", getValue: (m) => `${m.culturalOfferScore}/10`, highlight: "high" },
    { label: "Friluftsliv", getValue: (m) => `${m.outdoorScore}/10`, highlight: "high" },
    { label: "Familjevänlighet", getValue: (m) => `${m.familyFriendlyScore}/10`, highlight: "high" },
    { label: "Arbetsmarknad", getValue: (m) => `${m.jobMarketScore}/10`, highlight: "high" },
    { label: "Skolor", getValue: (m) => String(m.schools) },
    { label: "Vårdcentraler", getValue: (m) => String(m.healthcareCenters) },
  ];

  const radarSeries = selectedMunicipalities.map((m, i) => ({
    name: m.name,
    data: getRadarData(m),
    color: RADAR_COLORS[i % RADAR_COLORS.length],
  }));

  const barData = selectedMunicipalities.map((m) => ({
    name: m.name,
    value: m.avgHousingPrice,
    slug: m.slug,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Jämför kommuner</h1>
        <p className="text-gray-500 max-w-2xl">
          Välj upp till fyra kommuner och jämför dem sida vid sida. Se allt från bostadspriser till trygghet.
        </p>
      </div>

      {/* Selector */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {selectedMunicipalities.map((m, i) => (
            <span
              key={m.slug}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: `${RADAR_COLORS[i % RADAR_COLORS.length]}15`,
                color: RADAR_COLORS[i % RADAR_COLORS.length],
              }}
            >
              {m.name}
              <button
                onClick={() => removeMunicipality(m.slug)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}

          {selected.length < 4 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Lägg till kommun..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                className="pl-3 pr-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-52"
              />
              {dropdownOpen && (
                <div className="absolute top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto z-10">
                  {filtered.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">Inga kommuner hittades</div>
                  ) : (
                    filtered.map((m) => (
                      <button
                        key={m.slug}
                        onMouseDown={() => addMunicipality(m.slug)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{m.name}</span>
                        <span className="text-gray-400 ml-2">{m.county}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {selected.length === 0 && (
          <p className="text-sm text-gray-400">Välj minst två kommuner för att jämföra</p>
        )}
      </div>

      {/* Charts */}
      {selectedMunicipalities.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Radar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Betygsöversikt</h2>
            <RadarChart series={radarSeries} height={320} />
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Bostadspris/m²</h2>
            <HousingBarChart
              data={barData}
              height={320}
              colors={RADAR_COLORS}
            />
          </div>
        </div>
      )}

      {/* Compare table */}
      {selectedMunicipalities.length >= 2 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4 bg-gray-50 w-48">
                    Egenskap
                  </th>
                  {selectedMunicipalities.map((m, i) => (
                    <th key={m.slug} className="text-left px-6 py-4 bg-gray-50">
                      <Link
                        href={`/kommun/${m.slug}`}
                        className="text-sm font-semibold hover:opacity-80 transition-opacity"
                        style={{ color: RADAR_COLORS[i % RADAR_COLORS.length] }}
                      >
                        {m.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-6 py-3 text-sm text-gray-500 font-medium">{row.label}</td>
                    {selectedMunicipalities.map((m) => (
                      <td key={m.slug} className="px-6 py-3 text-sm text-gray-900 font-medium">
                        {row.getValue(m)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedMunicipalities.length === 1 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500">Lägg till minst en kommun till för att jämföra</p>
        </div>
      )}

      {selectedMunicipalities.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Börja jämföra</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Sök och lägg till kommuner ovan för att se en detaljerad jämförelse sida vid sida.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-96" />
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}

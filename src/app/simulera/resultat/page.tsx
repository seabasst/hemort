"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runSimulation, type SimulationInput, type SimulationResult } from "@/lib/simulation";
import SimuleraResultCard from "@/components/SimuleraResultCard";
import HousingBarChart from "@/components/HousingBarChart";
import SwedenMap from "@/components/SwedenMap";

const STORAGE_KEY = "hemort-simulation";

export default function SimuleraResultatPage() {
  const router = useRouter();
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [currentSize, setCurrentSize] = useState(65);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        router.push("/simulera");
        return;
      }
      const input = JSON.parse(saved) as Partial<SimulationInput>;
      if (!input.work || !input.family || !input.housing || !input.priorities) {
        router.push("/simulera");
        return;
      }
      setCurrentSize(input.housing.size);
      const simResults = runSimulation(input as SimulationInput);
      setResults(simResults);
    } catch {
      router.push("/simulera");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || !results) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Beräknar dina resultat...</p>
      </div>
    );
  }

  const topFive = results.slice(0, 5);
  const topThree = results.slice(0, 3).map((r) => r.municipality.slug).join(",");

  const barData = topFive.map((r) => ({
    name: r.municipality.name,
    value: r.housingDelta.costDelta,
    slug: r.municipality.slug,
  }));

  const mapHighlights = topFive.map((r, i) => ({
    slug: r.municipality.slug,
    label: String(i + 1),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Dina bästa matchningar</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Baserat på din livssituation har vi rankat {results.length} kommuner.
          Här är de som passar dig bäst.
        </p>
      </div>

      {/* Summary charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Housing cost delta bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Boendekostnad (skillnad/mån)</h2>
          <HousingBarChart
            data={barData}
            height={200}
            valueLabel="kr/mån"
          />
        </div>

        {/* Small map with top results */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 self-start">Dina toppkommuner</h2>
          <SwedenMap highlights={mapHighlights} compact />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {results.slice(0, 10).map((r, i) => (
          <SimuleraResultCard key={r.municipality.slug} result={r} rank={i + 1} currentSize={currentSize} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
        <Link
          href="/simulera"
          className="w-full sm:w-auto bg-white text-gray-700 px-6 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        >
          Ändra dina svar
        </Link>
        <Link
          href={`/jamfor?kommuner=${topThree}`}
          className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Jämför topp 3
        </Link>
      </div>
    </div>
  );
}

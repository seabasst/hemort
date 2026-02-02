"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/data/municipalities";
import type { SimulationResult } from "@/lib/simulation";
import RadarChart from "@/components/RadarChart";

interface Props {
  result: SimulationResult;
  rank: number;
  currentSize: number;
}

function DeltaValue({ value, unit, invert }: { value: number; unit: string; invert?: boolean }) {
  const isGood = invert ? value < 0 : value > 0;
  const isBad = invert ? value > 0 : value < 0;
  const absVal = Math.abs(value);

  return (
    <span className={`font-medium ${isGood ? "text-emerald-600" : isBad ? "text-red-500" : "text-gray-500"}`}>
      {value > 0 ? "+" : value < 0 ? "\u2212" : "\u00b1"}
      {unit === "kr" ? formatCurrency(absVal) : unit === "%" ? `${absVal.toFixed(1)}%` : `${absVal} ${unit}`}
    </span>
  );
}

const schoolRatingLabels: Record<string, string> = {
  above: "Over rikssnitt",
  average: "Rikssnitt",
  below: "Under rikssnitt",
};

export default function SimuleraResultCard({ result, rank, currentSize }: Props) {
  const { municipality: m, matchScore, housingDelta, commuteDelta, jobInfo, familyInfo, lifestyleDelta, summary, topPositives, topNegatives } = result;
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `Ditt liv i ${m.name} - ${matchScore}% match. ${summary}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Ditt liv i ${m.name}`, text, url: `/kommun/${m.slug}` });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const sqmDelta = housingDelta.sqmForSameBudget - currentSize;
  const densityPct = Math.round(lifestyleDelta.populationDensityRatio * 100);

  const radarData = [
    { label: "Kollektivtrafik", value: m.publicTransportScore, fullMark: 10 },
    { label: "Trygghet", value: m.safetyIndex, fullMark: 10 },
    { label: "Kultur", value: m.culturalOfferScore, fullMark: 10 },
    { label: "Friluftsliv", value: m.outdoorScore, fullMark: 10 },
    { label: "Familj", value: m.familyFriendlyScore, fullMark: 10 },
    { label: "Jobb", value: m.jobMarketScore, fullMark: 10 },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-emerald-200 transition-all">
      {/* Header — "Ditt liv i [Kommun]" */}
      <div className="flex items-center gap-4 p-5 border-b border-gray-50">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
          rank === 1 ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"
        }`}>
          {rank}
        </div>
        <img
          src={m.imageUrl}
          alt={m.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-lg">Ditt liv i {m.name}</h3>
            <span className="text-xs text-gray-400">{m.county}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{summary}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-emerald-600">{matchScore}%</div>
          <div className="text-xs text-gray-400">match</div>
        </div>
      </div>

      {/* Compact radar chart */}
      <div className="flex justify-center py-2 border-b border-gray-50">
        <RadarChart
          series={[{ name: m.name, data: radarData, color: "#059669" }]}
          width={170}
          height={150}
        />
      </div>

      {/* Delta sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-50">
        {/* Housing */}
        <div className="bg-white p-4">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Boende</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pris/m²</span>
              <span className="font-medium text-gray-900">{formatCurrency(housingDelta.pricePerSqm)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uppskattad månadskostnad</span>
              <span className="font-medium text-gray-900">{formatCurrency(housingDelta.estimatedMonthly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Du sparar/betalar</span>
              <DeltaValue value={housingDelta.costDelta} unit="kr" invert />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Yta för samma budget</span>
              <span className="font-medium text-gray-900">
                {housingDelta.sqmForSameBudget} kvm{" "}
                <span className={sqmDelta >= 0 ? "text-emerald-600" : "text-red-500"}>
                  ({sqmDelta >= 0 ? "+" : ""}{sqmDelta} kvm)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Commute */}
        <div className="bg-white p-4">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Pendling</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restid till jobb</span>
              <span className="font-medium text-gray-900">{commuteDelta.estimatedMinutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Förändring</span>
              <DeltaValue value={commuteDelta.changeFromCurrent} unit="min" invert />
            </div>
          </div>
        </div>

        {/* Job */}
        <div className="bg-white p-4">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Jobb</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Arbetsmarknad</span>
              <span className="font-medium text-gray-900">{jobInfo.marketScore}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medellön skillnad</span>
              <DeltaValue value={jobInfo.incomeDelta} unit="kr" />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Arbetslöshet</span>
              <span className="font-medium text-gray-900">{jobInfo.unemployment}%</span>
            </div>
          </div>
        </div>

        {/* Family (only if relevant) */}
        {familyInfo && (
          <div className="bg-white p-4">
            <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Familj</h4>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Förskolor i närheten</span>
                <span className="font-medium text-gray-900">~{familyInfo.forskolorNearby}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Skolor</span>
                <span className="font-medium text-gray-900">{familyInfo.schoolCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Skolbetyg</span>
                <span className={`font-medium ${familyInfo.schoolRatingVsNational === "above" ? "text-emerald-600" : familyInfo.schoolRatingVsNational === "below" ? "text-red-500" : "text-gray-900"}`}>
                  {schoolRatingLabels[familyInfo.schoolRatingVsNational]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Familjevänlighet</span>
                <span className="font-medium text-gray-900">{familyInfo.familyFriendlyScore}/10</span>
              </div>
            </div>
          </div>
        )}

        {/* Lifestyle — always shown */}
        <div className="bg-white p-4">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Livskvalitet</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{lifestyleDelta.nearestNature}</span>
              <span className="font-medium text-gray-900">{lifestyleDelta.nearestNatureMinutes} min bort</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Befolkningstäthet</span>
              <span className="font-medium text-gray-900">{densityPct}% av din nuvarande</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Kommunalskatt</span>
              <DeltaValue value={lifestyleDelta.taxDifference} unit="%" invert />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trygghet</span>
              <span className="font-medium text-gray-900">{lifestyleDelta.safetyScore}/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      {(topPositives.length > 0 || topNegatives.length > 0) && (
        <div className="p-4 border-t border-gray-50">
          <div className="flex flex-wrap gap-2">
            {topPositives.map((p, i) => (
              <span key={`pos-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {p}
              </span>
            ))}
            {topNegatives.map((n, i) => (
              <span key={`neg-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
                </svg>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Se kommun / Lägg till jämförelse / Dela */}
      <div className="px-4 pb-4 flex flex-col sm:flex-row gap-2">
        <Link
          href={`/kommun/${m.slug}`}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
        >
          Se kommun &rarr;
        </Link>
        <Link
          href={`/jamfor?kommuner=${m.slug}`}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          Lägg till jämförelse
        </Link>
        <button
          onClick={handleShare}
          className="flex-1 text-center py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          {copied ? "Kopierat!" : "Dela"}
        </button>
      </div>
    </div>
  );
}

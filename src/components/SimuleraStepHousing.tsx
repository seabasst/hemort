"use client";

import { useState, useMemo } from "react";
import { municipalities } from "@/data/municipalities";
import type { HousingInput } from "@/lib/simulation";

interface Props {
  initial?: HousingInput;
  onComplete: (data: HousingInput) => void;
  onBack: () => void;
}

const HOUSING_TYPES: { value: HousingInput["housingType"]; label: string; icon: string }[] = [
  { value: "apartment", label: "Lägenhet", icon: "🏢" },
  { value: "house", label: "Villa", icon: "🏡" },
  { value: "townhouse", label: "Radhus", icon: "🏘️" },
];

const COST_PRESETS = [
  { value: 5000, label: "5k" },
  { value: 8000, label: "8k" },
  { value: 10000, label: "10k" },
  { value: 12000, label: "12k" },
  { value: 15000, label: "15k" },
  { value: 20000, label: "20k+" },
];

const SIZE_PRESETS = [
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 65, label: "65" },
  { value: 80, label: "80" },
  { value: 100, label: "100" },
  { value: 130, label: "130+" },
];

export default function SimuleraStepHousing({ initial, onComplete, onBack }: Props) {
  const [currentKommun, setCurrentKommun] = useState(initial?.currentKommun ?? "");
  const [kommunQuery, setKommunQuery] = useState("");
  const [showKommunList, setShowKommunList] = useState(false);
  const [housingType, setHousingType] = useState<HousingInput["housingType"]>(initial?.housingType ?? "apartment");
  const [monthlyCost, setMonthlyCost] = useState(initial?.monthlyCost ?? 10000);
  const [size, setSize] = useState(initial?.size ?? 65);
  const [hasCar, setHasCar] = useState(initial?.hasCar ?? true);

  const filteredKommuner = useMemo(() => {
    if (kommunQuery.length < 1) return municipalities;
    const q = kommunQuery.toLowerCase();
    return municipalities.filter((m) => m.name.toLowerCase().includes(q));
  }, [kommunQuery]);

  const selectedKommunName = municipalities.find((m) => m.slug === currentKommun)?.name ?? "";

  const canSubmit = currentKommun.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({ currentKommun, housingType, monthlyCost, size, hasCar });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Ditt boende idag</h2>
      <p className="text-gray-400 text-sm mb-6">Vi jämför med ditt nuvarande boende.</p>

      {/* Current kommun — search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Var bor du?</label>
        <div className="relative">
          <input
            type="text"
            value={showKommunList ? kommunQuery : selectedKommunName}
            onChange={(e) => {
              setKommunQuery(e.target.value);
              setShowKommunList(true);
            }}
            onFocus={() => {
              setShowKommunList(true);
              if (currentKommun) setKommunQuery(selectedKommunName);
            }}
            onBlur={() => setTimeout(() => setShowKommunList(false), 200)}
            placeholder="Sök kommun..."
            className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              currentKommun ? "border-emerald-500" : "border-gray-200"
            }`}
          />
          {showKommunList && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 max-h-40 overflow-y-auto">
              {filteredKommuner.map((m) => (
                <button
                  key={m.slug}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCurrentKommun(m.slug);
                    setKommunQuery("");
                    setShowKommunList(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    currentKommun === m.slug
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-700 hover:bg-emerald-50"
                  }`}
                >
                  {m.name}
                  <span className="text-gray-400 ml-1.5 text-xs">{m.county}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Housing type — icon cards */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Typ av boende</label>
        <div className="grid grid-cols-3 gap-2">
          {HOUSING_TYPES.map((ht) => (
            <button
              key={ht.value}
              onClick={() => setHousingType(ht.value)}
              className={`flex flex-col items-center gap-1 py-4 rounded-xl border transition-all ${
                housingType === ht.value
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className="text-2xl">{ht.icon}</span>
              <span className={`text-sm font-medium ${housingType === ht.value ? "text-emerald-700" : "text-gray-700"}`}>
                {ht.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Monthly cost — tap presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Boendekostnad <span className="text-gray-400 font-normal">kr/mån</span>
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {COST_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setMonthlyCost(p.value)}
              className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all ${
                monthlyCost === p.value
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className={`text-sm font-bold ${
                monthlyCost === p.value ? "text-emerald-700" : "text-gray-900"
              }`}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Hyra eller bolån + avgift</p>
      </div>

      {/* Size — tap presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Storlek <span className="text-gray-400 font-normal">m²</span>
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {SIZE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setSize(p.value)}
              className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all ${
                size === p.value
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className={`text-sm font-bold ${
                size === p.value ? "text-emerald-700" : "text-gray-900"
              }`}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Car — emoji toggle */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Har du bil?</label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: true, label: "Ja, har bil", icon: "🚗" },
            { value: false, label: "Nej", icon: "🚶" },
          ] as const).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setHasCar(opt.value)}
              className={`flex flex-col items-center gap-1 py-4 rounded-xl border transition-all ${
                hasCar === opt.value
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className={`text-sm font-medium ${hasCar === opt.value ? "text-emerald-700" : "text-gray-700"}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        >
          &larr;
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`flex-1 py-3.5 rounded-xl text-base font-medium transition-all ${
            canSubmit
              ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Nästa &rarr;
        </button>
      </div>
    </div>
  );
}

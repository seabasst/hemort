"use client";

import { useState, useMemo } from "react";
import { municipalities } from "@/data/municipalities";
import type { PriorityInput } from "@/lib/simulation";

interface Props {
  initial?: PriorityInput;
  onComplete: (data: PriorityInput) => void;
  onBack: () => void;
}

const PRIORITIES: { key: keyof Omit<PriorityInput, "familyLocation">; label: string; icon: string }[] = [
  { key: "space", label: "Utrymme", icon: "🏠" },
  { key: "costs", label: "Låga kostnader", icon: "💰" },
  { key: "schools", label: "Bra skolor", icon: "🎓" },
  { key: "nature", label: "Natur", icon: "🌲" },
  { key: "commute", label: "Kort pendling", icon: "🚆" },
  { key: "calm", label: "Lugn & trygghet", icon: "🛡️" },
  { key: "culture", label: "Kultur & nöje", icon: "🎭" },
];

export default function SimuleraStepPriorities({ initial, onComplete, onBack }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    space: initial?.space ?? 3,
    costs: initial?.costs ?? 3,
    schools: initial?.schools ?? 3,
    nature: initial?.nature ?? 3,
    commute: initial?.commute ?? 3,
    calm: initial?.calm ?? 3,
    culture: initial?.culture ?? 3,
  });
  const [familyLocation, setFamilyLocation] = useState(initial?.familyLocation ?? "");
  const [familyQuery, setFamilyQuery] = useState("");
  const [showFamilyList, setShowFamilyList] = useState(false);

  const filteredKommuner = useMemo(() => {
    if (familyQuery.length < 1) return municipalities;
    const q = familyQuery.toLowerCase();
    return municipalities.filter((m) => m.name.toLowerCase().includes(q));
  }, [familyQuery]);

  const selectedFamilyName = municipalities.find((m) => m.slug === familyLocation)?.name ?? "";

  const handleRate = (key: string, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onComplete({
      space: values.space,
      costs: values.costs,
      schools: values.schools,
      nature: values.nature,
      commute: values.commute,
      calm: values.calm,
      culture: values.culture,
      familyLocation: familyLocation || undefined,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Dina prioriteringar</h2>
      <p className="text-gray-400 text-sm mb-6">Tryck 1–5 för att visa vad som är viktigt.</p>

      {/* Tap-to-rate grid */}
      <div className="space-y-3 mb-6">
        {PRIORITIES.map((p) => (
          <div key={p.key} className="flex items-center gap-3">
            {/* Label */}
            <div className="flex items-center gap-2 w-[140px] shrink-0">
              <span className="text-lg">{p.icon}</span>
              <span className="text-sm font-medium text-gray-700 truncate">{p.label}</span>
            </div>

            {/* Rating dots */}
            <div className="flex gap-1.5 flex-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => handleRate(p.key, n)}
                  className={`flex-1 h-9 rounded-lg border text-sm font-bold transition-all ${
                    values[p.key] >= n
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-white border-gray-100 text-gray-300 hover:border-emerald-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[10px] text-gray-300 mb-6 pl-[152px]">
        <span>Oviktigt</span>
        <span>Jätteviktigt</span>
      </div>

      {/* Family location — search */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bo nära familj/vänner? <span className="text-gray-400 font-normal">(valfritt)</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={showFamilyList ? familyQuery : selectedFamilyName}
            onChange={(e) => {
              setFamilyQuery(e.target.value);
              setShowFamilyList(true);
            }}
            onFocus={() => {
              setShowFamilyList(true);
              if (familyLocation) setFamilyQuery(selectedFamilyName);
            }}
            onBlur={() => setTimeout(() => setShowFamilyList(false), 200)}
            placeholder="Sök kommun..."
            className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              familyLocation ? "border-emerald-500" : "border-gray-200"
            }`}
          />
          {/* Clear button */}
          {familyLocation && !showFamilyList && (
            <button
              onClick={() => { setFamilyLocation(""); setFamilyQuery(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
            >
              ×
            </button>
          )}
          {showFamilyList && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 max-h-40 overflow-y-auto">
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFamilyLocation("");
                  setFamilyQuery("");
                  setShowFamilyList(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 ${
                  !familyLocation ? "bg-emerald-50 text-emerald-700 font-medium" : ""
                }`}
              >
                Ingen specifik ort
              </button>
              {filteredKommuner.map((m) => (
                <button
                  key={m.slug}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setFamilyLocation(m.slug);
                    setFamilyQuery("");
                    setShowFamilyList(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    familyLocation === m.slug
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

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
        >
          &larr;
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3.5 rounded-xl text-base font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
        >
          Visa resultat &rarr;
        </button>
      </div>
    </div>
  );
}

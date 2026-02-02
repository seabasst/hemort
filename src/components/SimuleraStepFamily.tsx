"use client";

import { useState } from "react";
import type { FamilyInput } from "@/lib/simulation";

interface Props {
  initial?: FamilyInput;
  onComplete: (data: FamilyInput) => void;
  onBack: () => void;
}

const AGE_GROUPS: { value: FamilyInput["childrenAges"][number]; label: string; icon: string }[] = [
  { value: "0-1", label: "0–1 år", icon: "👶" },
  { value: "1-3", label: "1–3 år", icon: "🧒" },
  { value: "3-6", label: "3–6 år", icon: "🎒" },
  { value: "6-12", label: "6–12 år", icon: "📖" },
  { value: "13-18", label: "13–18 år", icon: "🎓" },
];

export default function SimuleraStepFamily({ initial, onComplete, onBack }: Props) {
  const [adults, setAdults] = useState<1 | 2>(initial?.adults ?? 2);
  const [childrenAges, setChildrenAges] = useState<FamilyInput["childrenAges"]>(initial?.childrenAges ?? []);
  const [planningChildren, setPlanningChildren] = useState<FamilyInput["planningChildren"]>(initial?.planningChildren ?? "no");

  const toggleAge = (age: FamilyInput["childrenAges"][number]) => {
    setChildrenAges((prev) =>
      prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
    );
  };

  const handleSubmit = () => {
    onComplete({ adults, childrenAges, planningChildren });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Din familj</h2>
      <p className="text-gray-400 text-sm mb-6">Hjälper oss matcha skolor och familjevänlighet.</p>

      {/* Adults — big visual cards */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Vuxna i hushållet</label>
        <div className="grid grid-cols-2 gap-3">
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              onClick={() => setAdults(n)}
              className={`flex flex-col items-center gap-1 py-4 rounded-xl border transition-all ${
                adults === n
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className="text-2xl">{n === 1 ? "🧑" : "👫"}</span>
              <span className={`text-sm font-medium ${adults === n ? "text-emerald-700" : "text-gray-700"}`}>
                {n === 1 ? "1 vuxen" : "2 vuxna"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Children */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Har du barn?</label>

        {/* No children pill */}
        <button
          onClick={() => setChildrenAges([])}
          className={`w-full mb-2 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            childrenAges.length === 0
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500"
              : "border-gray-100 bg-white text-gray-600 hover:border-emerald-200"
          }`}
        >
          Inga barn
        </button>

        {/* Age group chips */}
        <div className="grid grid-cols-5 gap-1.5">
          {AGE_GROUPS.map((ag) => (
            <button
              key={ag.value}
              onClick={() => toggleAge(ag.value)}
              className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-center transition-all ${
                childrenAges.includes(ag.value)
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200"
              }`}
            >
              <span className="text-lg">{ag.icon}</span>
              <span className={`text-[11px] font-medium ${
                childrenAges.includes(ag.value) ? "text-emerald-700" : "text-gray-600"
              }`}>
                {ag.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Planning children — inline toggle */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Planerar fler barn?</label>
        <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
          {([
            { value: "yes" as const, label: "Ja" },
            { value: "maybe" as const, label: "Kanske" },
            { value: "no" as const, label: "Nej" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPlanningChildren(opt.value)}
              className={`px-5 py-2.5 text-sm font-medium transition-all ${
                planningChildren === opt.value
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
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
          className="flex-1 py-3.5 rounded-xl text-base font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] transition-all"
        >
          Nästa &rarr;
        </button>
      </div>
    </div>
  );
}

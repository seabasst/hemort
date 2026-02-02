"use client";

import { useState, useMemo } from "react";
import { municipalities } from "@/data/municipalities";
import { professions, type WorkInput } from "@/lib/simulation";

interface Props {
  initial?: WorkInput;
  onComplete: (data: WorkInput) => void;
}

const POPULAR_PROFESSIONS = [
  { label: "IT / Tech", icon: "💻", matches: ["IT-konsult", "Mjukvaruutvecklare", "Civilingenjör"] },
  { label: "Vård", icon: "🏥", matches: ["Sjuksköterska", "Läkare", "Undersköterska", "Barnmorska", "Tandläkare", "Psykolog", "Veterinär"] },
  { label: "Utbildning", icon: "📚", matches: ["Lärare", "Förskollärare"] },
  { label: "Ekonomi", icon: "📊", matches: ["Ekonom", "Redovisningskonsult"] },
  { label: "Bygg / Hantverk", icon: "🔨", matches: ["Byggarbetare", "Elektriker", "Snickare", "VVS-montör"] },
  { label: "Kontor", icon: "🏢", matches: ["Administratör", "Projektledare", "Chef/Ledare"] },
  { label: "Kreativ", icon: "🎨", matches: ["Designer", "Arkitekt", "Kommunikatör"] },
  { label: "Sälj / Handel", icon: "🛒", matches: ["Säljare", "Butiksäljare", "Marknadsförare"] },
  { label: "Juridik", icon: "⚖️", matches: ["Jurist", "Socionom"] },
  { label: "Lager / Logistik", icon: "📦", matches: ["Lagerarbetare"] },
];

const COMMUTE_PRESETS = [
  { value: 0, label: "0", sub: "Hemma" },
  { value: 15, label: "15", sub: "min" },
  { value: 30, label: "30", sub: "min" },
  { value: 45, label: "45", sub: "min" },
  { value: 60, label: "60", sub: "min" },
  { value: 90, label: "90+", sub: "min" },
];

export default function SimuleraStepWork({ initial, onComplete }: Props) {
  const [profession, setProfession] = useState(initial?.profession ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [workKommun, setWorkKommun] = useState(initial?.workKommun ?? "");
  const [kommunQuery, setKommunQuery] = useState("");
  const [showKommunList, setShowKommunList] = useState(false);
  const [currentCommuteMinutes, setCurrentCommuteMinutes] = useState(initial?.currentCommuteMinutes ?? 30);
  const [openToNewJob, setOpenToNewJob] = useState<WorkInput["openToNewJob"]>(initial?.openToNewJob ?? "maybe");

  // Find category from initial profession
  useState(() => {
    if (initial?.profession) {
      const cat = POPULAR_PROFESSIONS.find((c) => c.matches.includes(initial.profession));
      if (cat) setSelectedCategory(cat.label);
    }
  });

  const filteredKommuner = useMemo(() => {
    if (kommunQuery.length < 1) return municipalities;
    const q = kommunQuery.toLowerCase();
    return municipalities.filter((m) => m.name.toLowerCase().includes(q));
  }, [kommunQuery]);

  const selectedKommunName = workKommun === "remote"
    ? "Distans"
    : municipalities.find((m) => m.slug === workKommun)?.name ?? "";

  const canSubmit = profession.length > 0 && workKommun.length > 0;

  const handleCategorySelect = (cat: typeof POPULAR_PROFESSIONS[number]) => {
    setSelectedCategory(cat.label);
    // Auto-select first profession in category
    setProfession(cat.matches[0]);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onComplete({
      profession,
      workKommun,
      currentCommuteMinutes,
      openToNewJob,
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Vad jobbar du med?</h2>
      <p className="text-gray-400 text-sm mb-6">Välj det som stämmer bäst.</p>

      {/* Profession category grid */}
      <div className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POPULAR_PROFESSIONS.map((cat) => (
            <button
              key={cat.label}
              onClick={() => handleCategorySelect(cat)}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-center transition-all ${
                selectedCategory === cat.label
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                  : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span className={`text-xs font-medium leading-tight ${
                selectedCategory === cat.label ? "text-emerald-700" : "text-gray-600"
              }`}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Sub-profession pills */}
        {selectedCategory && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {POPULAR_PROFESSIONS.find((c) => c.label === selectedCategory)?.matches.map((p) => (
              <button
                key={p}
                onClick={() => setProfession(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  profession === p
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Work location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Var jobbar du?</label>

        {/* Remote option prominent */}
        <button
          onClick={() => { setWorkKommun("remote"); setKommunQuery(""); setShowKommunList(false); }}
          className={`w-full mb-2 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            workKommun === "remote"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500"
              : "border-gray-100 bg-white text-gray-700 hover:border-emerald-200"
          }`}
        >
          <span className="text-lg">🏠</span>
          Distans / flexibelt
        </button>

        {/* Kommun search */}
        <div className="relative">
          <input
            type="text"
            value={workKommun === "remote" ? "" : (showKommunList ? kommunQuery : selectedKommunName)}
            onChange={(e) => {
              setKommunQuery(e.target.value);
              setShowKommunList(true);
              if (workKommun === "remote") setWorkKommun("");
            }}
            onFocus={() => {
              setShowKommunList(true);
              if (workKommun !== "remote" && workKommun) setKommunQuery(selectedKommunName);
            }}
            onBlur={() => setTimeout(() => setShowKommunList(false), 200)}
            placeholder="Sök kommun..."
            className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
              workKommun && workKommun !== "remote" ? "border-emerald-500" : "border-gray-200"
            }`}
          />
          {showKommunList && (
            <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 max-h-40 overflow-y-auto">
              {filteredKommuner.map((m) => (
                <button
                  key={m.slug}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setWorkKommun(m.slug);
                    setKommunQuery("");
                    setShowKommunList(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    workKommun === m.slug
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

      {/* Commute time — only if not remote */}
      {workKommun !== "remote" && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Pendlingstid idag (enkel väg)</label>
          <div className="grid grid-cols-6 gap-1.5">
            {COMMUTE_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCurrentCommuteMinutes(p.value)}
                className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all ${
                  currentCommuteMinutes === p.value
                    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                    : "border-gray-100 bg-white hover:border-emerald-200"
                }`}
              >
                <span className={`text-base font-bold ${
                  currentCommuteMinutes === p.value ? "text-emerald-700" : "text-gray-900"
                }`}>
                  {p.label}
                </span>
                <span className="text-[10px] text-gray-400">{p.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Open to new job — compact inline toggle */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">Öppen för nytt jobb?</label>
        <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
          {([
            { value: "yes" as const, label: "Ja" },
            { value: "maybe" as const, label: "Kanske" },
            { value: "no" as const, label: "Nej" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOpenToNewJob(opt.value)}
              className={`px-5 py-2.5 text-sm font-medium transition-all ${
                openToNewJob === opt.value
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3.5 rounded-xl text-base font-medium transition-all ${
          canSubmit
            ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        Nästa &rarr;
      </button>
    </div>
  );
}

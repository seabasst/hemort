"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { municipalities } from "@/data/municipalities";
import MunicipalityCard from "@/components/MunicipalityCard";
import type { SimulationInput, WorkInput, FamilyInput, HousingInput, PriorityInput } from "@/lib/simulation";
import SimuleraStepWork from "@/components/SimuleraStepWork";
import SimuleraStepFamily from "@/components/SimuleraStepFamily";
import SimuleraStepHousing from "@/components/SimuleraStepHousing";
import SimuleraStepPriorities from "@/components/SimuleraStepPriorities";
import SwedenMap from "@/components/SwedenMap";

const STORAGE_KEY = "hemort-simulation";
const stepLabels = ["Arbete", "Familj", "Boende", "Prioriteringar"];

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<Partial<SimulationInput>>({});
  const [hasSaved, setHasSaved] = useState(false);

  const popular = municipalities.slice(0, 8);

  // Check for saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SimulationInput>;
        if (parsed.work || parsed.family || parsed.housing || parsed.priorities) {
          setInput(parsed);
          setHasSaved(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToStorage = (data: Partial<SimulationInput>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  };

  const handleWorkComplete = (work: WorkInput) => {
    const updated = { ...input, work };
    setInput(updated);
    saveToStorage(updated);
    setStep(1);
    setHasSaved(false);
  };

  const handleFamilyComplete = (family: FamilyInput) => {
    const updated = { ...input, family };
    setInput(updated);
    saveToStorage(updated);
    setStep(2);
  };

  const handleHousingComplete = (housing: HousingInput) => {
    const updated = { ...input, housing };
    setInput(updated);
    saveToStorage(updated);
    setStep(3);
  };

  const handlePrioritiesComplete = (priorities: PriorityInput) => {
    const updated = { ...input, priorities };
    setInput(updated);
    saveToStorage(updated);
    router.push("/simulera/resultat");
  };

  const handleContinue = () => {
    if (input.priorities) setStep(3);
    else if (input.housing) setStep(3);
    else if (input.family) setStep(2);
    else if (input.work) setStep(1);
    else setStep(0);
    setHasSaved(false);
  };

  const handleStartOver = () => {
    setInput({});
    setStep(0);
    setHasSaved(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const progress = ((step + 1) / 4) * 100;

  return (
    <div>
      {/* Hero + Simulator */}
      <section id="simulera" className="bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
              Simulera din flytt till en ny{" "}
              <span className="text-emerald-600">hemort</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Berätta om jobb, familj och boende — och få personliga rekommendationer med konkreta siffror.
            </p>
          </div>

          {/* Simulator form */}
          <div className="max-w-2xl mx-auto">
            {hasSaved && step === 0 ? (
              /* Continue prompt */
              <div className="text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Fortsätt där du slutade?
                </h2>
                <p className="text-gray-500 mb-8">
                  Du har en påbörjad simulering sparad. Vill du fortsätta eller börja om?
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={handleContinue}
                    className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-base font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Fortsätt &rarr;
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="w-full sm:w-auto bg-white text-gray-700 px-8 py-3.5 rounded-xl text-base font-medium border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                  >
                    Börja om
                  </button>
                </div>
              </div>
            ) : (
              /* Active simulator */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                {/* Progress */}
                <div className="mb-8">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Steg {step + 1} av 4 — {stepLabels[step]}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3">
                    {stepLabels.map((label, i) => (
                      <button
                        key={label}
                        onClick={() => { if (i < step) setStep(i); }}
                        disabled={i >= step}
                        className={`text-xs font-medium transition-colors ${
                          i === step
                            ? "text-emerald-600"
                            : i < step
                              ? "text-emerald-400 hover:text-emerald-600 cursor-pointer"
                              : "text-gray-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                {step === 0 && (
                  <SimuleraStepWork
                    initial={input.work}
                    onComplete={handleWorkComplete}
                  />
                )}
                {step === 1 && (
                  <SimuleraStepFamily
                    initial={input.family}
                    onComplete={handleFamilyComplete}
                    onBack={() => setStep(0)}
                  />
                )}
                {step === 2 && (
                  <SimuleraStepHousing
                    initial={input.housing}
                    onComplete={handleHousingComplete}
                    onBack={() => setStep(1)}
                  />
                )}
                {step === 3 && (
                  <SimuleraStepPriorities
                    initial={input.priorities}
                    onComplete={handlePrioritiesComplete}
                    onBack={() => setStep(2)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold text-emerald-600">290</p>
              <p className="text-sm text-gray-500 mt-1">Kommuner i Sverige</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">20</p>
              <p className="text-sm text-gray-500 mt-1">Kommuner i databasen</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">15+</p>
              <p className="text-sm text-gray-500 mt-1">Jämförbara datapunkter</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">100%</p>
              <p className="text-sm text-gray-500 mt-1">Gratis att använda</p>
            </div>
          </div>
        </div>
      </section>

      {/* Map section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Utforska kommuner på kartan
              </h2>
              <p className="text-gray-500 mb-6 max-w-lg">
                Se var Sveriges kommuner ligger och klicka dig vidare för att utforska statistik,
                betyg och boendekostnader.
              </p>
              <div className="space-y-3">
                {[
                  { icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", text: "20 kommuner från norr till söder" },
                  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", text: "Jämför bostadspriser och livskvalitet" },
                  { icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", text: "Hitta din perfekta hemort" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <SwedenMap />
            </div>
          </div>
        </div>
      </section>

      {/* Popular municipalities */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Populära kommuner</h2>
              <p className="text-gray-500 mt-2">Utforska några av Sveriges mest eftertraktade kommuner</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popular.map((m) => (
              <MunicipalityCard key={m.slug} municipality={m} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Redo att hitta din hemort?
          </h2>
          <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
            Ta vårt quiz och få personliga rekommendationer baserade på vad som är viktigt för dig.
          </p>
          <Link
            href="/quiz"
            className="inline-block bg-white text-emerald-700 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-50 transition-colors shadow-sm"
          >
            Starta quizet &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SimulationInput, WorkInput, FamilyInput, HousingInput, PriorityInput } from "@/lib/simulation";
import SimuleraStepWork from "@/components/SimuleraStepWork";
import SimuleraStepFamily from "@/components/SimuleraStepFamily";
import SimuleraStepHousing from "@/components/SimuleraStepHousing";
import SimuleraStepPriorities from "@/components/SimuleraStepPriorities";

const STORAGE_KEY = "hemort-simulation";

const stepLabels = ["Arbete", "Familj", "Boende", "Prioriteringar"];

export default function SimuleraPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<Partial<SimulationInput>>({});
  const [hasSaved, setHasSaved] = useState(false);

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

  // Show "continue" prompt
  if (hasSaved && step === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Fortsätt där du slutade?
          </h1>
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
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Progress */}
      <div className="mb-10">
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
        {/* Step indicators */}
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
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { municipalities, Municipality, formatNumber, formatCurrency } from "@/data/municipalities";

interface QuizQuestion {
  id: string;
  question: string;
  options: { label: string; value: string }[];
}

const questions: QuizQuestion[] = [
  {
    id: "size",
    question: "Hur stor vill du att kommunen ska vara?",
    options: [
      { label: "Storstad (200 000+)", value: "large" },
      { label: "Mellanstor stad (80 000–200 000)", value: "medium" },
      { label: "Mindre stad (40 000–80 000)", value: "small" },
      { label: "Spelar ingen roll", value: "any" },
    ],
  },
  {
    id: "nature",
    question: "Vilken typ av natur föredrar du?",
    options: [
      { label: "Kust & hav", value: "coast" },
      { label: "Skog & sjöar", value: "forest" },
      { label: "Fjäll & berg", value: "mountain" },
      { label: "Spelar ingen roll", value: "any" },
    ],
  },
  {
    id: "budget",
    question: "Vad är viktigast kring ekonomi?",
    options: [
      { label: "Låga bostadspriser", value: "low_housing" },
      { label: "Låg skatt", value: "low_tax" },
      { label: "Hög medianinkomst", value: "high_income" },
      { label: "Spelar ingen roll", value: "any" },
    ],
  },
  {
    id: "lifestyle",
    question: "Vad värderar du mest i vardagen?",
    options: [
      { label: "Rikt kulturliv", value: "culture" },
      { label: "Friluftsliv & natur", value: "outdoor" },
      { label: "Familjevänligt", value: "family" },
      { label: "Stark arbetsmarknad", value: "jobs" },
    ],
  },
  {
    id: "transport",
    question: "Hur viktig är kollektivtrafik?",
    options: [
      { label: "Mycket viktigt", value: "high" },
      { label: "Ganska viktigt", value: "medium" },
      { label: "Inte så viktigt", value: "low" },
    ],
  },
  {
    id: "safety",
    question: "Hur viktig är trygghet?",
    options: [
      { label: "Mycket viktigt", value: "high" },
      { label: "Ganska viktigt", value: "medium" },
      { label: "Inte så viktigt", value: "low" },
    ],
  },
];

function scoreMunicipality(m: Municipality, answers: Record<string, string>): number {
  let score = 0;

  // Size
  const sizeAnswer = answers.size;
  if (sizeAnswer === "large" && m.population >= 200000) score += 3;
  else if (sizeAnswer === "medium" && m.population >= 80000 && m.population < 200000) score += 3;
  else if (sizeAnswer === "small" && m.population >= 40000 && m.population < 80000) score += 3;
  else if (sizeAnswer === "any") score += 1;

  // Nature
  const natureAnswer = answers.nature;
  if (natureAnswer === "coast" && (m.nature === "kust" || m.nature === "skärgård" || m.coastline)) score += 3;
  else if (natureAnswer === "forest" && (m.nature === "skog" || m.nature === "sjö")) score += 3;
  else if (natureAnswer === "mountain" && m.nature === "fjäll") score += 3;
  else if (natureAnswer === "any") score += 1;

  // Budget
  const budgetAnswer = answers.budget;
  if (budgetAnswer === "low_housing" && m.avgHousingPrice <= 28000) score += 3;
  else if (budgetAnswer === "low_housing" && m.avgHousingPrice <= 35000) score += 1;
  if (budgetAnswer === "low_tax" && m.taxRate <= 32) score += 3;
  else if (budgetAnswer === "low_tax" && m.taxRate <= 33) score += 1;
  if (budgetAnswer === "high_income" && m.avgIncome >= 360000) score += 3;
  else if (budgetAnswer === "high_income" && m.avgIncome >= 330000) score += 1;
  if (budgetAnswer === "any") score += 1;

  // Lifestyle
  const lifestyleAnswer = answers.lifestyle;
  if (lifestyleAnswer === "culture") score += m.culturalOfferScore * 0.3;
  if (lifestyleAnswer === "outdoor") score += m.outdoorScore * 0.3;
  if (lifestyleAnswer === "family") score += m.familyFriendlyScore * 0.3;
  if (lifestyleAnswer === "jobs") score += m.jobMarketScore * 0.3;

  // Transport
  const transportAnswer = answers.transport;
  if (transportAnswer === "high" && m.publicTransportScore >= 8) score += 2;
  else if (transportAnswer === "high" && m.publicTransportScore >= 6) score += 1;
  else if (transportAnswer === "medium" && m.publicTransportScore >= 5) score += 1;
  else if (transportAnswer === "low") score += 0.5;

  // Safety
  const safetyAnswer = answers.safety;
  if (safetyAnswer === "high" && m.safetyIndex >= 9) score += 2;
  else if (safetyAnswer === "high" && m.safetyIndex >= 7) score += 1;
  else if (safetyAnswer === "medium" && m.safetyIndex >= 7) score += 1;
  else if (safetyAnswer === "low") score += 0.5;

  return score;
}

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<{ municipality: Municipality; score: number }[] | null>(null);

  const handleAnswer = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate results
      const scored = municipalities
        .map((m) => ({ municipality: m, score: scoreMunicipality(m, newAnswers) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setResults(scored);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setAnswers({});
    setResults(null);
  };

  const progress = ((currentStep + (results ? 1 : 0)) / questions.length) * 100;

  if (results) {
    const best = results[0];
    const maxScore = best.score;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Dina toppkommuner</h1>
          <p className="text-gray-500">Baserat på dina svar har vi hittat dessa matchningar</p>
        </div>

        <div className="space-y-4">
          {results.map((r, i) => {
            const matchPct = Math.round((r.score / maxScore) * 100);
            return (
              <Link
                key={r.municipality.slug}
                href={`/kommun/${r.municipality.slug}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-emerald-200 transition-all"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                  i === 0
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{r.municipality.name}</h3>
                    <span className="text-xs text-gray-400">{r.municipality.county}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{r.municipality.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{formatNumber(r.municipality.population)} inv.</span>
                    <span>{formatCurrency(r.municipality.avgHousingPrice)}/m²</span>
                    <span>{r.municipality.taxRate}% skatt</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-emerald-600">{matchPct}%</div>
                  <div className="text-xs text-gray-400">match</div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <button
            onClick={restart}
            className="w-full sm:w-auto bg-white text-gray-700 px-6 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            Ta quizet igen
          </button>
          <Link
            href={`/jamfor?kommuner=${results.slice(0, 3).map((r) => r.municipality.slug).join(",")}`}
            className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Jämför topp 3
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Progress */}
      <div className="mb-10">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Fråga {currentStep + 1} av {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
          {currentQuestion.question}
        </h1>
        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleAnswer(currentQuestion.id, option.value)}
              className="w-full text-left px-6 py-4 rounded-xl border border-gray-200 bg-white text-gray-900 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-base font-medium group"
            >
              <span className="group-hover:text-emerald-700 transition-colors">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <button
          onClick={() => setCurrentStep(currentStep - 1)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Föregående fråga
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { saveLead, getLead } from "@/lib/leads";

interface Props {
  municipalitySlug: string;
  municipalityName: string;
  variant?: "full" | "compact";
}

export default function LeadCaptureForm({ municipalitySlug, municipalityName, variant = "full" }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const existing = getLead(municipalitySlug);
    if (existing) setSubmitted(true);
  }, [municipalitySlug]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveLead({
      slug: municipalitySlug,
      name: name || undefined,
      email,
      message: message || undefined,
      submittedAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`${variant === "full" ? "bg-emerald-50 rounded-xl p-6" : "bg-emerald-50 rounded-lg px-4 py-3"}`}>
        <div className={`flex items-center gap-2 ${variant === "full" ? "justify-start" : "justify-center"}`}>
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-emerald-800">
            Tack! {municipalityName} kontaktar dig snart.
          </p>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="email"
          required
          placeholder="Din e-postadress"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="shrink-0 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Skicka
        </button>
      </form>
    );
  }

  return (
    <div className="bg-emerald-50 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-1">Intresserad av {municipalityName}?</h3>
      <p className="text-sm text-gray-500 mb-4">Lämna dina uppgifter så hör kommunen av sig.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Ditt namn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
        />
        <input
          type="email"
          required
          placeholder="Din e-postadress"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
        />
        <textarea
          placeholder="Meddelande (valfritt)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white resize-none"
        />
        <button
          type="submit"
          className="w-full py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Kontakta {municipalityName}
        </button>
      </form>
    </div>
  );
}

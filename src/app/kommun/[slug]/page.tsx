import { notFound } from "next/navigation";
import Link from "next/link";
import { municipalities, getMunicipality, formatNumber, formatCurrency } from "@/data/municipalities";
import MunicipalityRadar from "./MunicipalityRadar";
import PremiumBadge from "@/components/PremiumBadge";
import SponsorSection from "@/components/SponsorSection";
import LeadCaptureForm from "@/components/LeadCaptureForm";

export function generateStaticParams() {
  return municipalities.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = getMunicipality(slug);
  if (!m) return { title: "Kommun ej hittad" };
  return {
    title: `${m.name} - Hemort.se`,
    description: m.description,
  };
}

function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const highlightIcons: Record<string, string> = {
  strand: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  kust: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  fiske: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  skatt: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  jobb: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  universitet: "M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  natur: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  slott: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  familj: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
};

function getHighlightIcon(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, path] of Object.entries(highlightIcons)) {
    if (lower.includes(keyword)) return path;
  }
  // Default star icon
  return "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z";
}

export default async function MunicipalityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = getMunicipality(slug);
  if (!m) notFound();

  const radarData = [
    { label: "Kollektivtrafik", value: m.publicTransportScore, fullMark: 10 },
    { label: "Trygghet", value: m.safetyIndex, fullMark: 10 },
    { label: "Kultur", value: m.culturalOfferScore, fullMark: 10 },
    { label: "Friluftsliv", value: m.outdoorScore, fullMark: 10 },
    { label: "Familj", value: m.familyFriendlyScore, fullMark: 10 },
    { label: "Jobb", value: m.jobMarketScore, fullMark: 10 },
  ];

  return (
    <div>
      {/* Hero with background image */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${m.imageUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="flex items-center gap-2 text-sm text-gray-200 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Hem</Link>
            <span>/</span>
            <span className="text-white">{m.name}</span>
          </div>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs bg-emerald-600 text-white px-3 py-1 rounded-full font-medium">
                {m.nature}
              </span>
              <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-medium">
                {m.county}
              </span>
              {m.premium && <PremiumBadge size="md" />}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{m.name}</h1>
            <p className="text-lg text-gray-200 mb-8 max-w-2xl">{m.description}</p>
            <div className="flex flex-wrap gap-2">
              {m.highlights.map((h) => (
                <span key={h} className="text-sm bg-white/15 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg">
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* "Varför flytta hit?" section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Varför flytta till {m.name}?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {m.highlights.map((h) => (
            <div key={h} className="flex items-start gap-3 bg-emerald-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={getHighlightIcon(h)} />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{h}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main stats */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key numbers */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Nyckeltal</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: "Invånare", value: formatNumber(m.population) },
                  { label: "Yta", value: `${formatNumber(m.area)} km²` },
                  { label: "Bostadspris/m²", value: formatCurrency(m.avgHousingPrice) },
                  { label: "Hyra (2 rum)", value: `${formatCurrency(m.avgRentApartment)}/mån` },
                  { label: "Skattesats", value: `${m.taxRate}%` },
                  { label: "Medianinkomst", value: formatCurrency(m.avgIncome) },
                  { label: "Arbetslöshet", value: `${m.unemployment}%` },
                  { label: "Skolor", value: String(m.schools) },
                  { label: "Vårdcentraler", value: String(m.healthcareCenters) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-base font-semibold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scores with Radar Chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Betyg & Index</h2>
              <MunicipalityRadar name={m.name} data={radarData} />
              <div className="space-y-4 mt-6">
                <ScoreBar label="Kollektivtrafik" value={m.publicTransportScore} />
                <ScoreBar label="Trygghet" value={m.safetyIndex} />
                <ScoreBar label="Kulturutbud" value={m.culturalOfferScore} />
                <ScoreBar label="Friluftsliv" value={m.outdoorScore} />
                <ScoreBar label="Familjevänlighet" value={m.familyFriendlyScore} />
                <ScoreBar label="Arbetsmarknad" value={m.jobMarketScore} />
              </div>
            </div>

            {/* Sponsors (premium only) */}
            {m.premium && m.sponsors && m.sponsors.length > 0 && (
              <SponsorSection sponsors={m.sponsors} municipalityName={m.name} />
            )}

            {/* Location */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Läge & Anslutning</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Närmaste storstad</p>
                    <p className="font-medium text-gray-900">
                      {m.nearestCity}
                      {m.distanceToCity > 0 && ` (${m.distanceToCity} km)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Kustlinje</p>
                    <p className="font-medium text-gray-900">{m.coastline ? "Ja" : "Nej"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {m.premium && (
              <LeadCaptureForm
                municipalitySlug={m.slug}
                municipalityName={m.name}
                variant="full"
              />
            )}

            <div className="bg-emerald-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Snabbfakta</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Län</dt>
                  <dd className="font-medium text-gray-900">{m.county}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Natur</dt>
                  <dd className="font-medium text-gray-900 capitalize">{m.nature}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Invånare</dt>
                  <dd className="font-medium text-gray-900">{formatNumber(m.population)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Skattesats</dt>
                  <dd className="font-medium text-gray-900">{m.taxRate}%</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Jämför med andra</h3>
              <p className="text-sm text-gray-500 mb-4">
                Se hur {m.name} står sig mot andra kommuner
              </p>
              <Link
                href={`/jamfor?kommuner=${m.slug}`}
                className="block text-center bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Jämför {m.name}
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Hitta din match</h3>
              <p className="text-sm text-gray-500 mb-4">
                Ta quizet och se om {m.name} matchar dina preferenser
              </p>
              <Link
                href="/quiz"
                className="block text-center bg-white text-emerald-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-emerald-200 hover:bg-emerald-50 transition-colors"
              >
                Starta quizet
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

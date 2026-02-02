import { notFound } from "next/navigation";
import Link from "next/link";
import { municipalities, getMunicipality, formatNumber, formatCurrency } from "@/data/municipalities";
import MunicipalityRadar from "./MunicipalityRadar";

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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

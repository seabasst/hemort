import type { Sponsor } from "@/data/municipalities";

interface Props {
  sponsors: Sponsor[];
  municipalityName: string;
}

export default function SponsorSection({ sponsors, municipalityName }: Props) {
  if (sponsors.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Lokala företag i {municipalityName}</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Annons</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.name}
            href={sponsor.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-gray-50 rounded-xl p-4 hover:bg-emerald-50 transition-colors"
          >
            <img
              src={sponsor.logoUrl}
              alt={sponsor.name}
              className="h-10 object-contain mb-3"
              loading="lazy"
            />
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">
                {sponsor.name}
              </h3>
              <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded font-medium">
                {sponsor.category}
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{sponsor.description}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium group-hover:text-emerald-700">
              Besök webbplats
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

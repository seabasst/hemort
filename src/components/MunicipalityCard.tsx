import Link from "next/link";
import { Municipality, formatNumber, formatCurrency } from "@/data/municipalities";

export default function MunicipalityCard({ municipality }: { municipality: Municipality }) {
  return (
    <Link
      href={`/kommun/${municipality.slug}`}
      className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-200"
    >
      <div className="h-40 relative bg-gradient-to-br from-emerald-50 to-emerald-100 overflow-hidden">
        <img
          src={municipality.imageUrl}
          alt={municipality.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <span className="absolute bottom-3 left-3 text-sm font-semibold text-white drop-shadow-md">
          {municipality.name}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {municipality.name}
            </h3>
            <p className="text-sm text-gray-500">{municipality.county}</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
            {municipality.nature}
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">
          {municipality.description}
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-400">Invånare</span>
            <p className="font-medium text-gray-700">{formatNumber(municipality.population)}</p>
          </div>
          <div>
            <span className="text-gray-400">Bostadspris/m²</span>
            <p className="font-medium text-gray-700">{formatCurrency(municipality.avgHousingPrice)}</p>
          </div>
          <div>
            <span className="text-gray-400">Skattesats</span>
            <p className="font-medium text-gray-700">{municipality.taxRate}%</p>
          </div>
          <div>
            <span className="text-gray-400">Trygghet</span>
            <p className="font-medium text-gray-700">{municipality.safetyIndex}/10</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

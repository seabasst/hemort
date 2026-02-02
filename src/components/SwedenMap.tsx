"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { municipalities, formatNumber } from "@/data/municipalities";

// Approximate lat/lng for each municipality, mapped to SVG viewBox (0-400 x 0-600)
// Sweden roughly: lat 55.3-69.1, lng 11.0-24.2
function coordToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - 11.0) / (24.2 - 11.0)) * 380 + 10;
  const y = ((69.1 - lat) / (69.1 - 55.3)) * 570 + 15;
  return { x, y };
}

const municipalityCoords: Record<string, { lat: number; lng: number }> = {
  stockholm: { lat: 59.33, lng: 18.07 },
  goteborg: { lat: 57.71, lng: 11.97 },
  malmo: { lat: 55.61, lng: 13.0 },
  uppsala: { lat: 59.86, lng: 17.64 },
  linkoping: { lat: 58.41, lng: 15.63 },
  umea: { lat: 63.83, lng: 20.26 },
  lund: { lat: 55.7, lng: 13.19 },
  vasteras: { lat: 59.61, lng: 16.54 },
  orebro: { lat: 59.27, lng: 15.21 },
  helsingborg: { lat: 56.05, lng: 12.69 },
  norrkoping: { lat: 58.59, lng: 16.18 },
  jonkoping: { lat: 57.78, lng: 14.16 },
  lulea: { lat: 65.58, lng: 22.15 },
  visby: { lat: 57.64, lng: 18.3 },
  sundsvall: { lat: 62.39, lng: 17.31 },
  karlstad: { lat: 59.38, lng: 13.5 },
  vaxjo: { lat: 56.88, lng: 14.81 },
  kalmar: { lat: 56.66, lng: 16.36 },
  ostersund: { lat: 63.18, lng: 14.64 },
  falkenberg: { lat: 56.91, lng: 12.49 },
};

interface SwedenMapProps {
  highlights?: { slug: string; label?: string }[];
  compact?: boolean;
}

export default function SwedenMap({ highlights, compact = false }: SwedenMapProps) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    name: string;
    population: number;
    x: number;
    y: number;
  } | null>(null);

  const highlightSlugs = highlights?.map((h) => h.slug) ?? [];
  const highlightLabels = highlights?.reduce(
    (acc, h) => ({ ...acc, [h.slug]: h.label }),
    {} as Record<string, string | undefined>
  ) ?? {};

  const size = compact ? { width: 200, height: 300 } : { width: 400, height: 600 };

  return (
    <div className="relative" style={{ width: size.width, height: size.height }}>
      <svg
        viewBox="0 0 400 600"
        width={size.width}
        height={size.height}
        className="select-none"
      >
        {/* Sweden outline - simplified */}
        <path
          d="M200 15 C220 15, 280 30, 290 50 C310 90, 320 120, 310 160 C305 185, 295 200, 290 220 C285 240, 300 260, 310 280 C320 300, 325 320, 310 340 C300 355, 280 360, 270 380 C260 400, 255 420, 250 440 C245 460, 230 470, 220 490 C210 510, 200 520, 190 530 C175 545, 155 555, 140 560 C120 565, 100 555, 90 540 C80 525, 75 510, 80 490 C85 470, 95 460, 100 440 C108 415, 90 400, 80 380 C70 360, 55 340, 50 320 C45 300, 50 280, 60 260 C70 240, 80 220, 85 200 C90 180, 95 160, 100 140 C110 100, 130 70, 150 45 C165 28, 180 15, 200 15Z"
          fill="#f0fdf4"
          stroke="#bbf7d0"
          strokeWidth="2"
        />

        {/* County boundary hints */}
        <line x1="60" y1="360" x2="280" y2="360" stroke="#dcfce7" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="80" y1="450" x2="260" y2="450" stroke="#dcfce7" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="100" y1="260" x2="310" y2="260" stroke="#dcfce7" strokeWidth="1" strokeDasharray="4,4" />
        <line x1="120" y1="160" x2="300" y2="160" stroke="#dcfce7" strokeWidth="1" strokeDasharray="4,4" />

        {/* Municipality dots */}
        {municipalities.map((m) => {
          const coords = municipalityCoords[m.slug];
          if (!coords) return null;
          const { x, y } = coordToSvg(coords.lat, coords.lng);
          const isHighlighted = highlightSlugs.includes(m.slug);
          const label = highlightLabels[m.slug];
          const dotR = compact ? 5 : 7;

          return (
            <g
              key={m.slug}
              className="cursor-pointer"
              onClick={() => router.push(`/kommun/${m.slug}`)}
              onMouseEnter={() => setTooltip({ name: m.name, population: m.population, x, y })}
              onMouseLeave={() => setTooltip(null)}
            >
              {isHighlighted && (
                <circle cx={x} cy={y} r={dotR + 4} fill="#059669" fillOpacity={0.2}>
                  <animate attributeName="r" values={`${dotR + 4};${dotR + 8};${dotR + 4}`} dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={x}
                cy={y}
                r={dotR}
                fill={isHighlighted ? "#059669" : "#34d399"}
                stroke="white"
                strokeWidth={2}
                className="hover:fill-emerald-700 transition-colors"
              />
              {label && (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-bold pointer-events-none"
                  fontSize={compact ? 8 : 10}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && !compact && (
        <div
          className="absolute z-10 bg-white shadow-lg rounded-lg border border-gray-100 px-3 py-2 pointer-events-none"
          style={{
            left: (tooltip.x / 400) * size.width + 12,
            top: (tooltip.y / 600) * size.height - 10,
          }}
        >
          <p className="text-sm font-semibold text-gray-900">{tooltip.name}</p>
          <p className="text-xs text-gray-500">{formatNumber(tooltip.population)} invånare</p>
        </div>
      )}
    </div>
  );
}

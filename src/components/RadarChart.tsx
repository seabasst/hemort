"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DataPoint {
  label: string;
  value: number;
  fullMark: number;
}

interface Series {
  name: string;
  data: DataPoint[];
  color: string;
}

interface RadarChartProps {
  series: Series[];
  width?: number;
  height?: number;
}

export default function RadarChart({ series, width, height = 300 }: RadarChartProps) {
  if (series.length === 0) return null;

  // Merge all series into a single data array keyed by label
  const labels = series[0].data.map((d) => d.label);
  const merged = labels.map((label) => {
    const point: Record<string, string | number> = {
      label,
      fullMark: series[0].data.find((d) => d.label === label)?.fullMark ?? 10,
    };
    series.forEach((s) => {
      const found = s.data.find((d) => d.label === label);
      point[s.name] = found?.value ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width={width ?? "100%"} height={height}>
      <RechartsRadarChart data={merged} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} />
        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
        {series.map((s) => (
          <Radar
            key={s.name}
            name={s.name}
            dataKey={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.15 : 0.25}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: "13px" }}
          />
        )}
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarData {
  name: string;
  value: number;
  slug?: string;
}

interface HousingBarChartProps {
  data: BarData[];
  height?: number;
  valueLabel?: string;
  colors?: string[];
}

const DEFAULT_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"];

export default function HousingBarChart({
  data,
  height = 300,
  valueLabel = "kr/m²",
  colors = DEFAULT_COLORS,
}: HousingBarChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          tickFormatter={(v: number) => v.toLocaleString("sv-SE")}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 13, fill: "#374151" }}
          width={100}
        />
        <Tooltip
          formatter={(value) => [
            `${Number(value).toLocaleString("sv-SE")} ${valueLabel}`,
            "Värde",
          ]}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

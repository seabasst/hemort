"use client";

import RadarChart from "@/components/RadarChart";

interface Props {
  name: string;
  data: { label: string; value: number; fullMark: number }[];
}

export default function MunicipalityRadar({ name, data }: Props) {
  return (
    <RadarChart
      series={[{ name, data, color: "#059669" }]}
      height={280}
    />
  );
}

"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UsageBreakdown } from "@/lib/business-hours";

const COLORS = {
  Usage: "#2563eb",
  "Maintenance Required": "#f59e0b",
  Downtime: "#d1d5db",
};

export function UsagePieChart({ title, breakdown }: { title: string; breakdown: UsageBreakdown }) {
  const data = [
    { name: "Usage", value: Math.round(breakdown.usageMinutes) },
    { name: "Maintenance Required", value: Math.round(breakdown.maintenanceRequiredMinutes) },
    { name: "Downtime", value: Math.round(breakdown.downtimeMinutes) },
  ].filter((d) => d.value > 0);

  const totalHours = breakdown.businessMinutes / 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No business hours in this range.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${(Number(value) / 60).toFixed(1)} hrs`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {totalHours.toFixed(1)} business hours in range
        </p>
      </CardContent>
    </Card>
  );
}

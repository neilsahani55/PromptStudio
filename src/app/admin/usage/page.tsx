"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Clock,
  Cpu,
  ImageIcon,
  Type,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type UsageData = {
  totalGenerations: number;
  avgDuration: number;
  byModel: { model: string; count: number }[];
  byDay: { date: string; count: number }[];
  byInputType: { text: number; screenshot: number };
  topUsers: { name: string; email: string; count: number }[];
};

const periods = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

export default function AdminUsagePage() {
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UsageData | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/usage?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch usage");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch usage data:', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchUsage();
  }, [fetchUsage]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  const mostUsedModel =
    data?.byModel && data.byModel.length > 0
      ? data.byModel[0].model
      : "N/A";

  const textCount = data?.byInputType?.text || 0;
  const screenshotCount = data?.byInputType?.screenshot || 0;
  const totalInput = textCount + screenshotCount;
  const textRatio =
    totalInput > 0 ? `${Math.round((textCount / totalInput) * 100)}%` : "N/A";
  const screenshotRatio =
    totalInput > 0
      ? `${Math.round((screenshotCount / totalInput) * 100)}%`
      : "N/A";

  const isEmpty =
    !data || (data.totalGenerations === 0 && data.byDay.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-body">Usage Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor generation activity and trends
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {periods.map((p) => (
            <Button
              key={p.key}
              variant={period === p.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p.key)}
              className={
                period === p.key
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : ""
              }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Generations
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-body">
                {data?.totalGenerations?.toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold font-body">
                {data?.avgDuration
                  ? `${(data.avgDuration / 1000).toFixed(1)}s`
                  : "0s"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Used Model
            </CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-lg font-bold font-body truncate">
                {mostUsedModel}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Text vs Screenshot
            </CardTitle>
            <div className="flex gap-1">
              <Type className="h-4 w-4 text-primary" />
              <ImageIcon className="h-4 w-4 text-primary/80" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <div className="text-lg font-bold font-body">
                {textRatio} / {screenshotRatio}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isEmpty && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold font-body">No usage data yet</h3>
            <p className="text-muted-foreground mt-1">
              Usage data will appear here once users start generating prompts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Line Chart: Generations per day */}
          <Card>
            <CardHeader>
              <CardTitle className="font-body">Generations per Day</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a8a29e", fontSize: 12 }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fill: "#a8a29e", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1917",
                        border: "1px solid #44403c",
                        borderRadius: "8px",
                        color: "#fafaf9",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart: Usage by model */}
          <Card>
            <CardHeader>
              <CardTitle className="font-body">Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.byModel || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                    <XAxis
                      dataKey="model"
                      tick={{ fill: "#a8a29e", fontSize: 12 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fill: "#a8a29e", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1c1917",
                        border: "1px solid #44403c",
                        borderRadius: "8px",
                        color: "#fafaf9",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#f97316"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="font-body">Top Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data?.topUsers && data.topUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                          #
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">
                          Generations
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topUsers.map((user, index) => (
                        <tr
                          key={user.email}
                          className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {user.name}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                            {user.count.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No user data available for this period.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

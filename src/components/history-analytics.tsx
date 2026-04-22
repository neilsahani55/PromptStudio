"use client";

import { useMemo } from "react";
import { BarChart3, TrendingUp, Star, Clock, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HistoryItem } from "@/hooks/use-history";

interface HistoryAnalyticsProps {
  history: HistoryItem[];
}

interface AnalyticsData {
  totalGenerations: number;
  averageScore: number;
  scoreImprovement: number; // trend: positive = improving
  topImageTypes: { type: string; count: number; percentage: number }[];
  favoriteCount: number;
  recentActivity: { label: string; count: number }[];
  qualityDistribution: { label: string; count: number; color: string }[];
  bestPrompt: HistoryItem | null;
}

function computeAnalytics(history: HistoryItem[]): AnalyticsData {
  const total = history.length;

  if (total === 0) {
    return {
      totalGenerations: 0,
      averageScore: 0,
      scoreImprovement: 0,
      topImageTypes: [],
      favoriteCount: 0,
      recentActivity: [],
      qualityDistribution: [],
      bestPrompt: null,
    };
  }

  // Average score
  const scores = history.filter(h => h.qualityScore > 0).map(h => h.qualityScore);
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Score trend: compare recent 10 vs older 10
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
  const recent = sorted.slice(0, Math.min(10, Math.floor(total / 2))).filter(h => h.qualityScore > 0);
  const older = sorted.slice(Math.min(10, Math.floor(total / 2))).filter(h => h.qualityScore > 0);
  const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b.qualityScore, 0) / recent.length : 0;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b.qualityScore, 0) / older.length : 0;
  const scoreImprovement = older.length > 0 ? recentAvg - olderAvg : 0;

  // Image type breakdown
  const typeMap = new Map<string, number>();
  history.forEach(h => typeMap.set(h.imageType, (typeMap.get(h.imageType) || 0) + 1));
  const topImageTypes = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Favorites
  const favoriteCount = history.filter(h => h.favorite).length;

  // Recent activity (last 7 days, last 30 days, all time)
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last7 = history.filter(h => now - h.timestamp < 7 * day).length;
  const last30 = history.filter(h => now - h.timestamp < 30 * day).length;
  const recentActivity = [
    { label: 'Last 7 days', count: last7 },
    { label: 'Last 30 days', count: last30 },
    { label: 'All time', count: total },
  ];

  // Quality distribution
  const excellent = scores.filter(s => s >= 8).length;
  const good = scores.filter(s => s >= 6 && s < 8).length;
  const fair = scores.filter(s => s >= 4 && s < 6).length;
  const poor = scores.filter(s => s > 0 && s < 4).length;
  const qualityDistribution = [
    { label: 'Excellent (8+)', count: excellent, color: 'bg-green-500' },
    { label: 'Good (6-8)', count: good, color: 'bg-amber-500' },
    { label: 'Fair (4-6)', count: fair, color: 'bg-yellow-500' },
    { label: 'Needs Work (<4)', count: poor, color: 'bg-red-500' },
  ].filter(d => d.count > 0);

  // Best prompt
  const bestPrompt = scores.length > 0
    ? history.reduce((best, h) => h.qualityScore > best.qualityScore ? h : best, history[0])
    : null;

  return {
    totalGenerations: total,
    averageScore,
    scoreImprovement,
    topImageTypes,
    favoriteCount,
    recentActivity,
    qualityDistribution,
    bestPrompt,
  };
}

export function HistoryAnalytics({ history }: HistoryAnalyticsProps) {
  const analytics = useMemo(() => computeAnalytics(history), [history]);

  if (analytics.totalGenerations === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Total"
          value={analytics.totalGenerations.toString()}
          sub="generations"
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Avg Score"
          value={analytics.averageScore.toFixed(1)}
          sub="/10"
          accent={analytics.averageScore >= 7}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Trend"
          value={analytics.scoreImprovement > 0 ? `+${analytics.scoreImprovement.toFixed(1)}` : analytics.scoreImprovement.toFixed(1)}
          sub="recent vs older"
          accent={analytics.scoreImprovement > 0}
        />
        <StatCard
          icon={<Star className="w-4 h-4" />}
          label="Favorites"
          value={analytics.favoriteCount.toString()}
          sub="saved"
        />
      </div>

      {/* Image Type Breakdown */}
      {analytics.topImageTypes.length > 0 && (
        <div className="p-3 rounded-lg border bg-card/50">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Most Used Types
          </h4>
          <div className="space-y-1.5">
            {analytics.topImageTypes.map(t => (
              <div key={t.type} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="truncate">{t.type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2">{t.percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all duration-500"
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 min-w-[28px] justify-center">
                  {t.count}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Distribution */}
      {analytics.qualityDistribution.length > 0 && (
        <div className="p-3 rounded-lg border bg-card/50">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            Quality Distribution
          </h4>
          <div className="flex gap-1 h-4 rounded-full overflow-hidden">
            {analytics.qualityDistribution.map(d => {
              const totalScored = analytics.qualityDistribution.reduce((a, b) => a + b.count, 0);
              const pct = totalScored > 0 ? (d.count / totalScored) * 100 : 0;
              return (
                <div
                  key={d.label}
                  className={`${d.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                  title={`${d.label}: ${d.count}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {analytics.qualityDistribution.map(d => (
              <span key={d.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${d.color}`} />
                {d.label} ({d.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
        <Clock className="w-3 h-3" />
        {analytics.recentActivity.map((a, i) => (
          <span key={a.label}>
            {a.label}: <span className="text-foreground font-medium">{a.count}</span>
            {i < analytics.recentActivity.length - 1 && <span className="mx-1">·</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg border bg-card/50 text-center">
      <div className={`mb-1 ${accent ? 'text-green-500' : 'text-muted-foreground'}`}>{icon}</div>
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
      <span className={`text-lg font-bold ${accent ? 'text-green-500' : 'text-foreground'}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  );
}

// Shared severity scale — ONE mono-heat ramp (single warm family ramping by
// luminosity + saturation), reused across the map, hero, leaderboard and
// sparklines. Deliberately NOT a rainbow: calm recedes as a desaturated
// neutral; intensity rises ember -> burnt orange -> vermilion -> deep red.
// Reads as a scientific instrument, not a generic AI dashboard.

export type SeverityLevel = 'calm' | 'moderate' | 'elevated' | 'high' | 'extreme';

export interface Severity {
  level: SeverityLevel;
  label: string;
  color: string; // hex for SVG / inline styles
  text: string; // tailwind text class
  badge: string; // tailwind pill classes
  rank: number; // 0..4
}

export const SEVERITIES: Record<SeverityLevel, Severity> = {
  extreme: { level: 'extreme', label: 'Extreme', color: '#b01616', text: 'text-red-300', badge: 'bg-red-600/20 text-red-100 ring-1 ring-red-600/50', rank: 4 },
  high: { level: 'high', label: 'High', color: '#d6361f', text: 'text-red-400', badge: 'bg-red-500/15 text-red-200 ring-1 ring-red-500/40', rank: 3 },
  elevated: { level: 'elevated', label: 'Elevated', color: '#d4571d', text: 'text-orange-400', badge: 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/40', rank: 2 },
  moderate: { level: 'moderate', label: 'Moderate', color: '#b8702e', text: 'text-amber-500', badge: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40', rank: 1 },
  calm: { level: 'calm', label: 'Calm', color: '#566072', text: 'text-slate-400', badge: 'bg-slate-600/15 text-slate-300 ring-1 ring-slate-600/30', rank: 0 },
};

/** Map a z-score (higher = more anomalous) to a severity stop. */
export function severityFor(zScore: number): Severity {
  if (zScore >= 4) return SEVERITIES.extreme;
  if (zScore >= 3) return SEVERITIES.high;
  if (zScore >= 2) return SEVERITIES.elevated;
  if (zScore >= 1) return SEVERITIES.moderate;
  return SEVERITIES.calm;
}

/** Ordered ramp for legends (calm -> extreme). */
export const SEVERITY_RAMP: Severity[] = [
  SEVERITIES.calm,
  SEVERITIES.moderate,
  SEVERITIES.elevated,
  SEVERITIES.high,
  SEVERITIES.extreme,
];

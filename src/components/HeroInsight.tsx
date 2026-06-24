import type { AnomalyRegion, EarthquakeEvent } from '../types';
import { severityFor } from '../lib/severity';
import { cellKey } from '../lib/seismic';

interface HeroInsightProps {
  regions: AnomalyRegion[];
  onSelectRegion?: (region: AnomalyRegion) => void;
  pinnedKeys?: Set<string>;
}

function shortPlace(region: AnomalyRegion): string {
  const p = region.largestRecentQuake?.place;
  if (p) {
    const parts = p.split(' of ');
    return parts.length > 1 ? parts[parts.length - 1] : p;
  }
  return region.label;
}

function multiplier(cur: number, base: number): string | null {
  if (base <= 0.05) return null;
  const m = cur / base;
  if (!isFinite(m) || m < 1.1) return null;
  return `${m.toFixed(1)}×`;
}

interface Kpi {
  label: string;
  value: string;
  sub: string;
  accent: string;
}

export default function HeroInsight({ regions, onSelectRegion, pinnedKeys }: HeroInsightProps) {
  const top = regions[0];
  const calm = !top || top.zScore < 1;
  const sev = severityFor(top?.zScore ?? 0);
  const topIsPinned = top && pinnedKeys ? pinnedKeys.has(cellKey(top.cell)) : false;

  const anomalousCount = regions.filter((r) => r.zScore >= 2).length;
  const totalQuakes7d = regions.reduce((s, r) => s + r.totalEvents7d, 0);
  const strongest = regions.reduce<EarthquakeEvent | null>((max, r) => {
    const q = r.largestRecentQuake;
    if (q && (!max || q.magnitude > max.magnitude)) return q;
    return max;
  }, null);

  const mult = top ? multiplier(top.currentRate, top.baselineRate) : null;

  const kpis: Kpi[] = [
    {
      label: 'Abnormally active zones',
      value: String(anomalousCount),
      sub: anomalousCount === 1 ? 'region above z 2.0' : 'regions above z 2.0',
      accent: anomalousCount > 0 ? 'text-amber-300' : 'text-sky-300',
    },
    {
      label: 'Strongest anomaly',
      value: top ? `z ${top.zScore >= 0 ? '+' : ''}${top.zScore.toFixed(1)}` : '—',
      sub: top ? shortPlace(top) : 'no data',
      accent: sev.text,
    },
    {
      label: 'Quakes tracked · 7d',
      value: totalQuakes7d.toLocaleString(),
      sub: `${regions.length} monitored regions`,
      accent: 'text-slate-100',
    },
    {
      label: 'Largest recent quake',
      value: strongest ? `M${strongest.magnitude.toFixed(1)}` : '—',
      sub: strongest ? (strongest.place.split(' of ').pop() ?? '') : 'none',
      accent: strongest && strongest.magnitude >= 6 ? 'text-red-400' : 'text-slate-200',
    },
  ];

  return (
    <section className="space-y-5">
      {/* spoon-fed headline */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950 p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.1] blur-3xl"
          style={{ backgroundColor: sev.color }}
        />
        <div className="relative flex items-start gap-3">
          <span
            className="mt-1.5 inline-flex h-3 w-3 shrink-0 rounded-full live-dot"
            style={{ backgroundColor: sev.color, boxShadow: `0 0 7px ${sev.color}` }}
          />
          <div>
            <p className="mb-2.5 text-[13px] font-medium leading-snug text-primary-300/90">
              Know where the earth is unusually active right now — ranked live from public USGS
              data, before it reaches the headlines.
            </p>
            {calm ? (
              <p className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
                All monitored regions are within their normal seismic range right now.
              </p>
            ) : (
              <p className="text-lg font-semibold leading-snug text-slate-100 sm:text-2xl">
                {onSelectRegion && top ? (
                  <button
                    type="button"
                    onClick={() => onSelectRegion(top)}
                    aria-pressed={topIsPinned}
                    aria-label={`${topIsPinned ? 'Unpin' : 'Pin'} ${shortPlace(top)} — the most abnormally active region`}
                    data-testid="hero-pin-toggle"
                    className="inline-flex items-center gap-1.5 text-left transition-opacity hover:opacity-80"
                  >
                    <span style={{ color: sev.color }}>{shortPlace(top)}</span>
                    <span className="text-base" aria-hidden="true">{topIsPinned ? '★' : '☆'}</span>
                  </button>
                ) : (
                  <span style={{ color: sev.color }}>{top ? shortPlace(top) : ''}</span>
                )}
                <span> is the most abnormally active zone right now</span>
                {mult ? (
                  <>
                    {' '}— running{' '}
                    <span className="font-bold text-white">{mult}</span> its normal rate
                  </>
                ) : (
                  <> ({sev.label.toLowerCase()} anomaly)</>
                )}
                .
              </p>
            )}
            <p className="mt-1.5 text-sm text-slate-400">
              {calm
                ? 'No region is meaningfully above its own 30-day baseline. Check back as activity evolves.'
                : `Ranked by z-score — how far each region's current 7-day rate sits above its own 30-day baseline.`}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3.5 transition-colors hover:border-slate-700"
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${k.accent}`}>{k.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500" title={k.sub}>
              {k.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

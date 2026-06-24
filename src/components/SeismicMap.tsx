import { useMemo } from 'react';
import type { AnomalyRegion } from '../types';
import { cellCentroid, project } from '../lib/geo';
import { severityFor, SEVERITY_RAMP } from '../lib/severity';
import landData from '../assets/world-land.json';

const W = 720;
const H = 360;

// Build-time embedded world basemap (Natural Earth 110m land, ~1° simplified).
// No runtime map-tile fetch — the coastline ships with the product.
const LAND_RINGS = landData as number[][][];

interface SeismicMapProps {
  regions: AnomalyRegion[];
  onSelectRegion?: (region: AnomalyRegion) => void;
}

// Coarse longitude orientation labels — honest geographic context without
// pretending to draw precise coastlines.
const LNG_BANDS = [
  { lng: -100, label: 'AMERICAS' },
  { lng: -25, label: 'ATLANTIC' },
  { lng: 22, label: 'EUR · AFRICA' },
  { lng: 90, label: 'ASIA' },
  { lng: 165, label: 'PACIFIC' },
];

function placeName(region: AnomalyRegion): string {
  const p = region.largestRecentQuake?.place;
  if (p) {
    // USGS place strings look like "120km SSW of Tonga" — keep the tail.
    const parts = p.split(' of ');
    return parts.length > 1 ? parts[parts.length - 1] : p;
  }
  return region.label;
}

export default function SeismicMap({ regions, onSelectRegion }: SeismicMapProps) {
  const blips = useMemo(
    () =>
      regions.map((r) => {
        const c = cellCentroid(r.cell);
        const { x, y } = project(c.lat, c.lng, W, H);
        const sev = severityFor(r.zScore);
        const radius = 2.5 + Math.min(Math.max(r.zScore, 0.2), 6) * 2.3;
        return { r, x, y, sev, radius };
      }),
    [regions],
  );

  // Project the embedded coastline into one SVG path (break subpaths that
  // would otherwise streak across the antimeridian).
  const landPath = useMemo(() => {
    let d = '';
    for (const ring of LAND_RINGS) {
      let started = false;
      let prevLng = 0;
      for (const pt of ring) {
        const lng = pt[0];
        const lat = pt[1];
        const p = project(lat, lng, W, H);
        if (!started || Math.abs(lng - prevLng) > 180) {
          d += 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        } else {
          d += 'L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        }
        started = true;
        prevLng = lng;
      }
      d += 'Z';
    }
    return d;
  }, []);

  // Draw weakest first so the strongest anomalies render on top.
  const ordered = [...blips].sort((a, b) => a.r.zScore - b.r.zScore);
  const top = ordered[ordered.length - 1];

  const lngLines: number[] = [];
  for (let lng = -150; lng <= 150; lng += 30) lngLines.push(project(0, lng, W, H).x);
  const latLines: { y: number; lat: number }[] = [];
  for (let lat = -60; lat <= 60; lat += 30) latLines.push({ y: project(lat, 0, W, H).y, lat });

  return (
    <section
      aria-label="Global seismic anomaly map"
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#070b16] shadow-2xl shadow-black/40"
    >
      {/* overlay header */}
      <div className="pointer-events-none absolute left-4 top-3.5 z-10 flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-primary-500 live-dot shadow-[0_0_6px_rgba(214,54,31,0.6)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Live Anomaly Map
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map of regions with statistically unusual earthquake activity"
      >
        <defs>
          <radialGradient id="map-vignette" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="#15161a" />
            <stop offset="100%" stopColor="#08080b" />
          </radialGradient>
          <filter id="blip-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="url(#map-vignette)" />

        {/* land basemap (embedded coastline) */}
        <path d={landPath} fill="#1d1e23" fillOpacity={0.92} stroke="#30313a" strokeWidth={0.35} strokeLinejoin="round" />

        {/* graticule */}
        <g stroke="#272830" strokeWidth={0.5}>
          {lngLines.map((x, i) => (
            <line key={`v${i}`} x1={x} y1={0} x2={x} y2={H} />
          ))}
          {latLines.map((l, i) => (
            <line key={`h${i}`} x1={0} y1={l.y} x2={W} y2={l.y} />
          ))}
        </g>
        {/* equator emphasis */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#383a40" strokeWidth={0.8} strokeDasharray="2 4" />

        {/* longitude orientation labels */}
        {LNG_BANDS.map((b) => (
          <text
            key={b.label}
            x={project(0, b.lng, W, H).x}
            y={H - 8}
            textAnchor="middle"
            className="fill-slate-600"
            style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 600 }}
          >
            {b.label}
          </text>
        ))}

        {/* blips */}
        {ordered.map(({ r, x, y, sev, radius }) => {
          const key = `${r.cell.latIndex},${r.cell.lngIndex}`;
          const anomalous = r.zScore >= 1;
          return (
            <g
              key={key}
              transform={`translate(${x} ${y})`}
              className={onSelectRegion ? 'cursor-pointer' : ''}
              onClick={onSelectRegion ? () => onSelectRegion(r) : undefined}
            >
              {anomalous && (
                <circle r={radius + 3} fill={sev.color} opacity={0.16} filter="url(#blip-glow)" />
              )}
              <circle
                r={radius}
                fill={sev.color}
                opacity={anomalous ? 0.92 : 0.4}
                stroke="#05080f"
                strokeWidth={0.6}
              />
              <title>{`${placeName(r)} — z ${r.zScore.toFixed(1)} (${sev.label})`}</title>
            </g>
          );
        })}

        {/* strongest-anomaly crosshair + callout */}
        {top && top.r.zScore >= 1 && (
          <g transform={`translate(${top.x} ${top.y})`}>
            <circle r={top.radius + 9} fill="none" stroke={top.sev.color} strokeWidth={1.2} opacity={0.7} className="ping-ring" />
            <line x1={-top.radius - 14} y1={0} x2={top.radius + 14} y2={0} stroke={top.sev.color} strokeWidth={0.7} opacity={0.5} />
            <line x1={0} y1={-top.radius - 14} x2={0} y2={top.radius + 14} stroke={top.sev.color} strokeWidth={0.7} opacity={0.5} />
            <g transform={`translate(${top.x > W - 150 ? -12 : 12} ${-top.radius - 12})`} textAnchor={top.x > W - 150 ? 'end' : 'start'}>
              <text className="fill-slate-100" style={{ fontSize: 11, fontWeight: 700 }}>
                {placeName(top.r)}
              </text>
              <text y={13} fill={top.sev.color} style={{ fontSize: 10, fontWeight: 600 }}>
                z +{top.r.zScore.toFixed(1)} · most active
              </text>
            </g>
          </g>
        )}
      </svg>

      {/* legend */}
      <div className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Calm</span>
        <div className="flex items-center gap-1">
          {SEVERITY_RAMP.map((s) => (
            <span key={s.level} className="h-2 w-4 rounded-sm" style={{ backgroundColor: s.color }} title={s.label} />
          ))}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Extreme</span>
      </div>
    </section>
  );
}

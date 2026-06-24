import Sparkline from './Sparkline';
import type { AnomalyRegion } from '../types';
import { cellKey } from '../lib/seismic';

interface RegionRowProps {
  region: AnomalyRegion;
  isPinned: boolean;
  onPin: (region: AnomalyRegion) => void;
}

/**
 * Get severity badge classes based on z-score.
 * Returns tailwind classes for a pill badge.
 */
function getSeverityBadge(zScore: number): { label: string; className: string } {
  const abs = Math.abs(zScore);
  if (abs >= 4) return { label: 'Critical', className: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' };
  if (abs >= 3) return { label: 'High', className: 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30' };
  if (abs >= 2) return { label: 'Elevated', className: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' };
  if (abs >= 1) return { label: 'Moderate', className: 'bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/30' };
  return { label: 'Normal', className: 'bg-slate-600/15 text-slate-400 ring-1 ring-slate-600/30' };
}

/**
 * Get row accent color (left border indicator).
 */
function getRowAccent(zScore: number): string {
  const abs = Math.abs(zScore);
  if (abs >= 4) return 'before:bg-red-500';
  if (abs >= 3) return 'before:bg-orange-500';
  if (abs >= 2) return 'before:bg-amber-500';
  if (abs >= 1) return 'before:bg-yellow-500';
  return 'before:bg-transparent';
}

function formatZ(z: number, baseline: number): string {
  if (z === 0 && baseline === 0) return '—';
  return z.toFixed(2);
}

export default function RegionRow({ region, isPinned, onPin }: RegionRowProps) {
  const severity = getSeverityBadge(region.zScore);
  const rowAccent = getRowAccent(region.zScore);
  const key = cellKey(region.cell);
  const zDisplay = formatZ(region.zScore, region.baselineRate);
  const mag = region.largestRecentQuake?.magnitude ?? null;

  return (
    <tr
      data-testid="region-row"
      data-cell-key={key}
      className={`group relative transition-colors hover:bg-slate-800/40 ${rowAccent} before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-['']`}
    >
      {/* Pin button */}
      <td className="px-3 py-3 text-center">
        <button
          data-testid="pin-button"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${region.label}` : `Pin ${region.label}`}
          onClick={() => onPin(region)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-base transition-all hover:bg-slate-700/50 active:scale-90 ${
            isPinned
              ? 'text-primary-400 hover:text-primary-300'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {isPinned ? '★' : '☆'}
        </button>
      </td>

      {/* Region label */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-200">
            {region.label}
          </span>
          <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severity.className}`}>
            {severity.label}
          </span>
        </div>
      </td>

      {/* Z-score */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm font-bold text-slate-100 tabular-nums">
          {zDisplay}
        </span>
      </td>

      {/* Current rate (7d) */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm font-medium text-red-300 tabular-nums">
          {region.currentRate.toFixed(1)}
        </span>
      </td>

      {/* Baseline rate */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm text-slate-400 tabular-nums">
          {region.baselineRate.toFixed(1)}
        </span>
      </td>

      {/* Largest recent quake */}
      <td className="px-3 py-3 text-right">
        {mag !== null ? (
          <span className={`font-mono text-sm font-medium tabular-nums ${
            mag >= 6 ? 'text-red-400' : mag >= 4 ? 'text-orange-300' : 'text-slate-200'
          }`}>
            M{mag.toFixed(1)}
          </span>
        ) : (
          <span className="text-sm text-slate-600">—</span>
        )}
      </td>

      {/* Sparkline */}
      <td className="px-3 py-3">
        <div className="flex justify-center">
          <Sparkline data={region.dailyCounts14d} width={80} height={24} />
        </div>
      </td>

      {/* Events 7d count */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {region.totalEvents7d}
        </span>
      </td>
    </tr>
  );
}

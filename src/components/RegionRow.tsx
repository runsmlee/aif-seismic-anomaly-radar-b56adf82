import Sparkline from './Sparkline';
import type { AnomalyRegion } from '../types';
import { cellKey } from '../lib/seismic';
import { severityFor } from '../lib/severity';

interface RegionRowProps {
  region: AnomalyRegion;
  isPinned: boolean;
  onPin: (region: AnomalyRegion) => void;
}

function formatZ(z: number, baseline: number): string {
  if (z === 0 && baseline === 0) return '—';
  return `${z >= 0 ? '+' : ''}${z.toFixed(2)}`;
}

export default function RegionRow({ region, isPinned, onPin }: RegionRowProps) {
  const sev = severityFor(region.zScore);
  const key = cellKey(region.cell);
  const zDisplay = formatZ(region.zScore, region.baselineRate);
  const mag = region.largestRecentQuake?.magnitude ?? null;
  // z-score bar width, normalized to a 0..5 visual range
  const barPct = Math.max(0, Math.min(region.zScore / 5, 1)) * 100;

  return (
    <tr
      data-testid="region-row"
      data-cell-key={key}
      className="group relative transition-colors hover:bg-slate-800/40"
    >
      {/* Pin button (+ severity accent rail anchored to the row's left edge) */}
      <td className="relative px-3 py-3 text-center">
        <span
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ backgroundColor: region.zScore >= 1 ? sev.color : 'transparent' }}
          aria-hidden="true"
        />
        <button
          data-testid="pin-button"
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${region.label}` : `Pin ${region.label}`}
          onClick={() => onPin(region)}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-base transition-all hover:bg-slate-700/50 active:scale-90 ${
            isPinned ? 'text-primary-400 hover:text-primary-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {isPinned ? '★' : '☆'}
        </button>
      </td>

      {/* Region label + severity */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-200">{region.label}</span>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sev.badge}`}
          >
            {sev.label}
          </span>
        </div>
      </td>

      {/* Z-score with bar */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm font-bold tabular-nums" style={{ color: region.zScore >= 1 ? sev.color : '#e2e8f0' }}>
          {zDisplay}
        </span>
        <div className="ml-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, backgroundColor: sev.color }} />
        </div>
      </td>

      {/* Current rate (7d) */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm font-medium text-slate-200 tabular-nums">{region.currentRate.toFixed(1)}</span>
      </td>

      {/* Baseline rate */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-sm text-slate-500 tabular-nums">{region.baselineRate.toFixed(1)}</span>
      </td>

      {/* Largest recent quake */}
      <td className="px-3 py-3 text-right">
        {mag !== null ? (
          <span className={`font-mono text-sm font-medium tabular-nums ${mag >= 6 ? 'text-red-400' : mag >= 4 ? 'text-orange-300' : 'text-slate-300'}`}>
            M{mag.toFixed(1)}
          </span>
        ) : (
          <span className="text-sm text-slate-600">—</span>
        )}
      </td>

      {/* Sparkline */}
      <td className="px-3 py-3">
        <div className="flex justify-center">
          <Sparkline data={region.dailyCounts14d} width={80} height={24} color={sev.color} fillOpacity={0.18} />
        </div>
      </td>

      {/* Events 7d count */}
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-xs text-slate-400 tabular-nums">{region.totalEvents7d}</span>
      </td>
    </tr>
  );
}

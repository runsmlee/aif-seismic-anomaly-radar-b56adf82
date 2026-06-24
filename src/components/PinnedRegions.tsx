import Sparkline from './Sparkline';
import type { PinnedRegion } from '../types';

interface PinnedRegionsProps {
  pinned: PinnedRegion[];
  onUnpin: (cellKey: string) => void;
}

export default function PinnedRegions({ pinned, onUnpin }: PinnedRegionsProps) {
  if (pinned.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <svg className="h-4 w-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Pinned Regions
          <span className="ml-2 rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] text-slate-400">
            {pinned.length}
          </span>
        </h2>
      </div>
      <div className="space-y-2">
        {pinned.map((region) => {
          const historyData = region.history.map((h) => h.zScore);
          const historyLabel =
            historyData.length > 1
              ? `${historyData.length} snapshots`
              : 'First snapshot';

          const zColor =
            region.zScore >= 2
              ? 'text-red-400'
              : region.zScore >= 1
                ? 'text-orange-400'
                : 'text-slate-400';

          return (
            <div
              key={region.cellKey}
              data-testid="pinned-region"
              data-cell-key={region.cellKey}
              className="group flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-slate-700 hover:bg-slate-900/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-200">
                    {region.label}
                  </span>
                  <span className={`shrink-0 font-mono text-xs font-bold ${zColor}`}>
                    z={region.zScore.toFixed(2)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {new Date(region.timestamp).toLocaleDateString()} · {historyLabel}
                </div>
              </div>

              <Sparkline
                data={historyData.length > 1 ? historyData : [region.zScore, region.zScore]}
                width={60}
                height={20}
                color="#d6361f"
              />

              <button
                data-testid="unpin-button"
                aria-label={`Unpin ${region.label}`}
                onClick={() => onUnpin(region.cellKey)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-all hover:bg-red-500/10 hover:text-red-400 active:scale-90"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

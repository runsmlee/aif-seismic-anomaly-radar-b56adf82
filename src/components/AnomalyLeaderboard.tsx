import RegionRow from './RegionRow';
import type { AnomalyRegion } from '../types';

interface AnomalyLeaderboardProps {
  regions: AnomalyRegion[];
  pinnedKeys: Set<string>;
  onPin: (region: AnomalyRegion) => void;
}

export default function AnomalyLeaderboard({
  regions,
  pinnedKeys,
  onPin,
}: AnomalyLeaderboardProps) {
  return (
    <div data-testid="anomaly-leaderboard" className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <caption className="sr-only">
            Global seismic anomaly ranking — regions ranked by z-score showing where earthquake
            activity is unusually elevated compared to each region's own 30-day baseline. Columns:
            pin, region coordinates, z-score, current daily rate, baseline daily rate, largest
            magnitude, 14-day trend, and 7-day event count.
          </caption>
          <thead>
            <tr className="border-b border-slate-800 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3.5 w-12" scope="col">
                <span className="sr-only">Pin region</span>
              </th>
              <th className="px-3 py-3.5" scope="col">Region (10°×10°)</th>
              <th className="px-3 py-3.5 text-right" scope="col" title="Z-Score: (current 7-day rate − 23-day baseline mean) ÷ baseline std dev">
                Z-Score
              </th>
              <th className="px-3 py-3.5 text-right" scope="col" title="Mean earthquakes per day in the last 7 days">
                Cur/Day
              </th>
              <th className="px-3 py-3.5 text-right" scope="col" title="Mean earthquakes per day in the 23-day baseline period">
                Base/Day
              </th>
              <th className="px-3 py-3.5 text-right" scope="col">Largest M</th>
              <th className="px-3 py-3.5 text-center" scope="col">14-Day Trend</th>
              <th className="px-3 py-3.5 text-right" scope="col">7d Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {regions.map((region) => {
              const key = `${region.cell.latIndex},${region.cell.lngIndex}`;
              return (
                <RegionRow
                  key={key}
                  region={region}
                  isPinned={pinnedKeys.has(key)}
                  onPin={onPin}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 border-t border-slate-800/50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        <p>
          <span className="font-semibold text-slate-400">Method:</span> Each region's
          current 7-day daily earthquake rate is compared against its prior 23-day
          baseline using z = (current − baseline_mean) ÷ baseline_std_dev.
          Higher z-scores indicate statistically unusual activity.
        </p>
      </div>
    </div>
  );
}

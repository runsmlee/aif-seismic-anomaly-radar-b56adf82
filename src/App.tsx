import { useState, useEffect, useCallback } from 'react';
import AnomalyLeaderboard from './components/AnomalyLeaderboard';
import PinnedRegions from './components/PinnedRegions';
import HeroInsight from './components/HeroInsight';
import SeismicMap from './components/SeismicMap';
import { useEarthquakeData } from './hooks/useEarthquakeData';
import { cellKey } from './lib/seismic';
import type { AnomalyRegion, PinnedRegion, PinnedRegionSnapshot } from './types';

const STORAGE_KEY = 'seismic-radar-pinned';

function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.aif?.track) {
    window.aif.track(event, props);
  }
}

/** Load pinned regions from localStorage */
function loadPinned(): PinnedRegion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const snapshots: PinnedRegionSnapshot[] = JSON.parse(raw);
    // Group by cellKey to build history
    const byKey = new Map<string, PinnedRegionSnapshot[]>();
    for (const snap of snapshots) {
      const list = byKey.get(snap.cellKey) ?? [];
      list.push(snap);
      byKey.set(snap.cellKey, list);
    }
    const result: PinnedRegion[] = [];
    for (const [key, list] of byKey) {
      // Sort by timestamp descending (newest first)
      list.sort((a, b) => b.timestamp - a.timestamp);
      const latest = list[0];
      const history = list.slice(0, 10).reverse().map((s) => ({
        zScore: s.zScore,
        timestamp: s.timestamp,
      }));
      result.push({
        cellKey: key,
        label: latest.label,
        zScore: latest.zScore,
        timestamp: latest.timestamp,
        history,
      });
    }
    return result;
  } catch {
    return [];
  }
}

/** Save a new pinned region snapshot to localStorage */
function savePinSnapshot(snapshot: PinnedRegionSnapshot): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: PinnedRegionSnapshot[] = raw ? JSON.parse(raw) : [];
    existing.push(snapshot);
    // Keep only last 10 snapshots per cellKey
    const byKey = new Map<string, PinnedRegionSnapshot[]>();
    for (const snap of existing) {
      const list = byKey.get(snap.cellKey) ?? [];
      list.push(snap);
      byKey.set(snap.cellKey, list);
    }
    const trimmed: PinnedRegionSnapshot[] = [];
    for (const list of byKey.values()) {
      list.sort((a, b) => b.timestamp - a.timestamp);
      trimmed.push(...list.slice(0, 10));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be unavailable
  }
}

/** Remove all snapshots for a cellKey from localStorage */
function removePinnedByKey(key: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const existing: PinnedRegionSnapshot[] = JSON.parse(raw);
    const filtered = existing.filter((s) => s.cellKey !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage may be unavailable
  }
}

export default function App() {
  const { regions, loading, error, lastUpdated, refresh } = useEarthquakeData();
  const [pinned, setPinned] = useState<PinnedRegion[]>([]);

  // Track page view on mount
  useEffect(() => {
    trackEvent('page_view', { path: window.location.pathname });
  }, []);

  // Load pinned regions from localStorage on mount
  useEffect(() => {
    setPinned(loadPinned());
  }, []);

  const pinnedKeys = new Set(pinned.map((p) => p.cellKey));

  const handlePin = useCallback(
    (region: AnomalyRegion) => {
      const key = cellKey(region.cell);
      const isPinned = pinnedKeys.has(key);

      if (isPinned) {
        // Unpin
        removePinnedByKey(key);
        setPinned((prev) => prev.filter((p) => p.cellKey !== key));
        trackEvent('region_unpin', { cell_key: key });
      } else {
        // Pin: save snapshot and add to state
        const snapshot: PinnedRegionSnapshot = {
          cellKey: key,
          label: region.label,
          zScore: region.zScore,
          timestamp: Date.now(),
        };
        savePinSnapshot(snapshot);
        setPinned((prev) => [
          ...prev,
          {
            ...snapshot,
            history: [{ zScore: snapshot.zScore, timestamp: snapshot.timestamp }],
          },
        ]);
        trackEvent('region_pin', {
          cell_key: key,
          z_score: region.zScore,
        });
      }
    },
    [pinnedKeys],
  );

  const handleUnpin = useCallback((key: string) => {
    removePinnedByKey(key);
    setPinned((prev) => prev.filter((p) => p.cellKey !== key));
    trackEvent('region_unpin', { cell_key: key });
  }, []);

  const handleRefresh = useCallback(() => {
    trackEvent('data_refresh', { trigger: 'manual' });
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#0c0e13]">
      {/* Subtle top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-primary-700 via-primary-500 to-primary-700" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary-500 live-dot shadow-[0_0_6px_rgba(214,54,31,0.5)]" aria-hidden="true" />
              <span className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Live Seismic Data
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl lg:text-4xl">
              Seismic Anomaly Radar
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Where is the ground unusually active right now? Z-score analysis of live USGS data ranks regions by anomaly severity.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-500" aria-label="Last updated time">
                <span className="text-slate-600">Updated</span>{' '}
                <span className="font-medium text-slate-400">
                  {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </span>
            )}
            <button
              data-testid="refresh-button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh earthquake data"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* Loading state — skeleton screen */}
        {loading && regions.length === 0 && (
          <div data-testid="loading-state" className="animate-fade-in space-y-3" role="status" aria-label="Loading seismic data">
            {/* Skeleton header row */}
            <div className="flex items-center gap-2 px-2 py-3">
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-4 flex-1 rounded" />
              <div className="skeleton-shimmer h-4 w-20 rounded" />
              <div className="skeleton-shimmer h-4 w-16 rounded" />
              <div className="skeleton-shimmer h-4 w-12 rounded" />
              <div className="skeleton-shimmer h-4 w-24 rounded" />
            </div>
            {/* Skeleton rows */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-3" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="skeleton-shimmer h-6 w-6 rounded" />
                <div className="skeleton-shimmer h-5 flex-1 rounded" />
                <div className="skeleton-shimmer h-5 w-20 rounded" />
                <div className="skeleton-shimmer h-5 w-16 rounded" />
                <div className="skeleton-shimmer h-5 w-14 rounded" />
                <div className="skeleton-shimmer h-5 w-12 rounded" />
                <div className="skeleton-shimmer h-6 w-24 rounded" />
              </div>
            ))}
            <span className="sr-only">Fetching USGS seismic data...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            data-testid="error-state"
            className="flex min-h-[16rem] animate-fade-in items-center justify-center"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/30">
                <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="mb-1.5 text-lg font-semibold text-slate-200">
                Failed to load data
              </p>
              <p className="mb-4 text-sm text-slate-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 active:scale-[0.98]"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        {!loading && !error && regions.length > 0 && (
          <div className="animate-fade-in space-y-6">
            <HeroInsight regions={regions} />
            <SeismicMap regions={regions} onSelectRegion={handlePin} />
            <PinnedRegions pinned={pinned} onUnpin={handleUnpin} />
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Full anomaly ranking</h2>
                  <p className="text-xs text-slate-500">Click any region to pin it and track its trend</p>
                </div>
                <span className="hidden text-xs text-slate-500 sm:block">{regions.length} regions</span>
              </div>
              <AnomalyLeaderboard
                regions={regions}
                pinnedKeys={pinnedKeys}
                onPin={handlePin}
              />
            </div>
          </div>
        )}

        {/* Empty state - data loaded but no anomalies */}
        {!loading && !error && regions.length === 0 && (
          <div className="flex min-h-[16rem] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
                <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-slate-200">
                No significant seismic anomalies detected
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                All monitored regions are within normal activity ranges.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-800/80 pt-5 text-xs text-slate-600">
          <p className="leading-relaxed">
            Data source:{' '}
            <a
              href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
              className="font-medium text-slate-500 underline-offset-2 transition-colors hover:text-slate-400 hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              USGS Earthquake Hazards Program
            </a>{' '}
            <span className="text-slate-700">(public domain)</span>{' '}
            · Auto-refreshes every 60 minutes
          </p>
        </footer>
      </div>
    </div>
  );
}

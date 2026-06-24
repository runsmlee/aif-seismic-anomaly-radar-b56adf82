import { useState, useEffect, useCallback } from 'react';
import { computeAnomalies } from '../lib/seismic';
import type { AnomalyRegion, USGSFeatureCollection } from '../types';

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';

interface EarthquakeDataState {
  regions: AnomalyRegion[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface EarthquakeData extends EarthquakeDataState {
  refresh: () => void;
}

const REFRESH_INTERVAL = 60 * 60 * 1000; // 60 minutes

export function useEarthquakeData(autoRefresh: boolean = true): EarthquakeData {
  const [state, setState] = useState<EarthquakeDataState>({
    regions: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(USGS_URL);
      if (!response.ok) {
        throw new Error(`USGS API returned ${response.status}`);
      }

      const data: USGSFeatureCollection = await response.json();
      const now = Date.now();
      const regions = computeAnomalies(data, now);

      setState({
        regions,
        loading: false,
        error: null,
        lastUpdated: now,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch earthquake data';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}

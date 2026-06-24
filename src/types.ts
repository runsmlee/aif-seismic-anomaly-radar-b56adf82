// Core domain types for Seismic Anomaly Radar

/** A single earthquake event from USGS GeoJSON feed */
export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  place: string;
  time: number; // epoch ms
  longitude: number;
  latitude: number;
}

/** A 10°×10° geographic grid cell identifier */
export interface GridCell {
  latIndex: number; // -9 to 8 (for -90..80)
  lngIndex: number; // -18 to 17 (for -180..170)
}

/** The computed z-score anomaly data for a grid cell */
export interface AnomalyRegion {
  cell: GridCell;
  label: string; // human-readable region label
  zScore: number;
  currentRate: number; // earthquakes per day in last 7 days
  baselineRate: number; // mean earthquakes per day over 30 days
  baselineStdDev: number; // std dev of daily counts over 30 days
  totalEvents7d: number;
  totalEvents30d: number;
  largestRecentQuake: EarthquakeEvent | null;
  dailyCounts14d: number[]; // sparkline data: 14 daily counts
  dailyCounts30d: number[]; // 30 daily counts for baseline computation
}

/** A pinned region snapshot stored in localStorage */
export interface PinnedRegionSnapshot {
  cellKey: string;
  label: string;
  zScore: number;
  timestamp: number; // epoch ms
}

/** A pinned region with full history (max 10 snapshots) */
export interface PinnedRegion extends PinnedRegionSnapshot {
  history: { zScore: number; timestamp: number }[];
}

/** USGS GeoJSON Feature shape (simplified) */
export interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
  };
  geometry: {
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
}

export interface USGSFeatureCollection {
  type: 'FeatureCollection';
  features: USGSFeature[];
  metadata: {
    generated: number;
    title: string;
  };
}

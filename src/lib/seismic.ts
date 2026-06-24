import type {
  EarthquakeEvent,
  GridCell,
  AnomalyRegion,
  USGSFeatureCollection,
  USGSFeature,
} from '../types';

/**
 * Get the 10°×10° grid cell for a lat/lng coordinate.
 * Cell indices represent the lower-left corner of each 10° cell.
 * latIndex = floor(lat / 10), lngIndex = floor(lng / 10)
 */
export function getGridCell(lat: number, lng: number): GridCell {
  return {
    latIndex: Math.floor(lat / 10),
    lngIndex: Math.floor(lng / 10),
  };
}

/** Unique string key for a grid cell */
export function cellKey(cell: GridCell): string {
  return `${cell.latIndex},${cell.lngIndex}`;
}

/** Human-readable label for a grid cell, e.g. "30°N–40°N, 130°E–140°E" */
export function cellLabel(cell: GridCell): string {
  const latBase = cell.latIndex * 10;
  const lngBase = cell.lngIndex * 10;
  const latMax = latBase + 10;
  const lngMax = lngBase + 10;

  const formatLat = (l: number): string => {
    const abs = Math.abs(l);
    const dir = l >= 0 ? 'N' : 'S';
    return `${abs}°${dir}`;
  };

  const formatLng = (l: number): string => {
    const abs = Math.abs(l);
    const dir = l >= 0 ? 'E' : 'W';
    return `${abs}°${dir}`;
  };

  return `${formatLat(latBase)}–${formatLat(latMax)}, ${formatLng(lngBase)}–${formatLng(lngMax)}`;
}

/** Convert a USGS feature to an EarthquakeEvent */
export function featureToEvent(feature: USGSFeature): EarthquakeEvent {
  return {
    id: feature.id,
    magnitude: feature.properties.mag,
    place: feature.properties.place,
    time: feature.properties.time,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  };
}

/**
 * Bin earthquakes into grid cells.
 * Returns a map of cellKey -> earthquakes in that cell.
 */
export function binQuakes(quakes: EarthquakeEvent[]): Map<string, EarthquakeEvent[]> {
  const bins = new Map<string, EarthquakeEvent[]>();
  for (const q of quakes) {
    const cell = getGridCell(q.latitude, q.longitude);
    const key = cellKey(cell);
    const bin = bins.get(key);
    if (bin) {
      bin.push(q);
    } else {
      bins.set(key, [q]);
    }
  }
  return bins;
}

/** Compute arithmetic mean of an array */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Compute population standard deviation of an array */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute daily counts for a set of earthquakes over `days` days ending at `now`.
 * Returns an array of length `days`, index 0 = oldest day, index days-1 = most recent day.
 */
export function computeDailyCounts(
  quakes: EarthquakeEvent[],
  days: number,
  now: number,
): number[] {
  const oneDayMs = 86400000;
  const counts = new Array(days).fill(0);
  const startTime = now - days * oneDayMs;

  for (const q of quakes) {
    if (q.time < startTime || q.time > now) continue;
    const daysAgo = Math.floor((now - q.time) / oneDayMs);
    const index = days - 1 - daysAgo;
    if (index >= 0 && index < days) {
      counts[index]++;
    }
  }

  return counts;
}

/**
 * Compute the z-score comparing current 7-day rate vs 30-day baseline.
 * z = (currentRate - baselineMean) / baselineStd
 * Returns 0 if baseline std dev is 0 to avoid division by zero.
 */
export function computeZScore(
  currentCounts: number[],
  baselineCounts: number[],
): number {
  const baselineMean = mean(baselineCounts);
  const baselineStd = stdDev(baselineCounts);

  if (baselineStd === 0) return 0;

  const currentRate = mean(currentCounts);
  return (currentRate - baselineMean) / baselineStd;
}

/**
 * Compute anomalies for all grid cells from USGS GeoJSON data.
 * Bins quakes into 10°×10° cells, computes z-scores, sorts descending.
 * Filters out cells with fewer than 5 total events (noise filter).
 */
export function computeAnomalies(
  geoJson: USGSFeatureCollection,
  now: number,
): AnomalyRegion[] {
  const quakes = geoJson.features
    .filter((f) => f.properties.mag != null && f.geometry?.coordinates != null)
    .map(featureToEvent);

  const bins = binQuakes(quakes);
  const regions: AnomalyRegion[] = [];

  const oneDayMs = 86400000;
  const sevenDaysAgo = now - 7 * oneDayMs;

  for (const [key, cellQuakes] of bins) {
    // Noise filter: need at least 5 events total
    if (cellQuakes.length < 5) continue;

    const [latIdx, lngIdx] = key.split(',').map(Number);
    const cell: GridCell = { latIndex: latIdx, lngIndex: lngIdx };

    // Compute 30-day daily counts for baseline
    const dailyCounts30 = computeDailyCounts(cellQuakes, 30, now);
    // 7-day counts (current) - last 7 days
    const currentCounts = dailyCounts30.slice(-7);
    // Baseline counts: first 23 days of the 30-day window (excludes current 7 days)
    const baselineCounts = dailyCounts30.slice(0, 23);
    // 14-day sparkline counts
    const dailyCounts14 = dailyCounts30.slice(-14);

    const z = computeZScore(currentCounts, baselineCounts);

    // Find largest quake in last 7 days
    const recentQuakes = cellQuakes.filter((q) => q.time >= sevenDaysAgo);
    const largestRecentQuake = recentQuakes.length > 0
      ? recentQuakes.reduce((max, q) => (q.magnitude > max.magnitude ? q : max))
      : null;

    const totalEvents7d = recentQuakes.length;
    const baselineMean = mean(baselineCounts);
    const baselineStd = stdDev(baselineCounts);

    regions.push({
      cell,
      label: cellLabel(cell),
      zScore: z,
      currentRate: mean(currentCounts),
      baselineRate: baselineMean,
      baselineStdDev: baselineStd,
      totalEvents7d,
      totalEvents30d: cellQuakes.length,
      largestRecentQuake,
      dailyCounts14d: dailyCounts14,
      dailyCounts30d: dailyCounts30,
    });
  }

  // Sort by z-score descending
  regions.sort((a, b) => b.zScore - a.zScore);

  return regions;
}

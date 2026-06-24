import { describe, it, expect } from 'vitest';
import {
  getGridCell,
  cellKey,
  cellLabel,
  binQuakes,
  computeDailyCounts,
  computeZScore,
  mean,
  stdDev,
  computeAnomalies,
} from '../src/lib/seismic';
import type { EarthquakeEvent, USGSFeatureCollection } from '../src/types';

describe('getGridCell', () => {
  it('places coordinates in correct 10°×10° cell', () => {
    expect(getGridCell(35.7, 139.7)).toEqual({ latIndex: 3, lngIndex: 13 });
    expect(getGridCell(-33.4, -70.6)).toEqual({ latIndex: -4, lngIndex: -8 });
    expect(getGridCell(0, 0)).toEqual({ latIndex: 0, lngIndex: 0 });
    expect(getGridCell(89.9, 179.9)).toEqual({ latIndex: 8, lngIndex: 17 });
    expect(getGridCell(-89.9, -179.9)).toEqual({ latIndex: -9, lngIndex: -18 });
  });

  it('handles edge values at grid boundaries', () => {
    expect(getGridCell(10.0, 10.0)).toEqual({ latIndex: 1, lngIndex: 1 });
    expect(getGridCell(9.9, 9.9)).toEqual({ latIndex: 0, lngIndex: 0 });
  });
});

describe('cellKey and cellLabel', () => {
  it('produces a unique string key for each cell', () => {
    expect(cellKey({ latIndex: 3, lngIndex: 13 })).toBe('3,13');
    expect(cellKey({ latIndex: -4, lngIndex: -8 })).toBe('-4,-8');
    expect(cellKey({ latIndex: 3, lngIndex: 13 })).not.toBe(cellKey({ latIndex: 13, lngIndex: 3 }));
  });

  it('produces a human-readable label', () => {
    const label = cellLabel({ latIndex: 3, lngIndex: 13 });
    expect(label).toContain('30°N');
    expect(label).toContain('130°E');

    const label2 = cellLabel({ latIndex: -4, lngIndex: -8 });
    expect(label2).toContain('40°S');
    expect(label2).toContain('80°W');
  });
});

describe('binQuakes', () => {
  it('groups earthquakes into grid cells', () => {
    const quakes: EarthquakeEvent[] = [
      { id: '1', magnitude: 5.0, place: 'Tokyo', time: Date.now(), longitude: 139.7, latitude: 35.7 },
      { id: '2', magnitude: 4.0, place: 'Near Tokyo', time: Date.now(), longitude: 139.0, latitude: 36.0 },
      { id: '3', magnitude: 6.0, place: 'Chile', time: Date.now(), longitude: -70.6, latitude: -33.4 },
    ];
    const bins = binQuakes(quakes);
    expect(bins.size).toBe(2);
    const tokyoKey = cellKey(getGridCell(35.7, 139.7));
    expect(bins.get(tokyoKey)?.length).toBe(2);
    const chileKey = cellKey(getGridCell(-33.4, -70.6));
    expect(bins.get(chileKey)?.length).toBe(1);
  });

  it('returns empty map for empty input', () => {
    expect(binQuakes([]).size).toBe(0);
  });
});

describe('mean and stdDev', () => {
  it('computes mean correctly', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([10])).toBe(10);
    expect(mean([])).toBe(0);
  });

  it('computes standard deviation correctly', () => {
    expect(stdDev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2), 5);
    expect(stdDev([5, 5, 5, 5])).toBe(0);
    expect(stdDev([])).toBe(0);
  });
});

describe('computeDailyCounts', () => {
  it('returns array of daily counts for the given period', () => {
    const now = Date.now();
    const oneDayMs = 86400000;
    // 3 events across 2 days
    const quakes: EarthquakeEvent[] = [
      { id: '1', magnitude: 3.0, place: 'A', time: now - 3600000, longitude: 0, latitude: 0 },
      { id: '2', magnitude: 3.0, place: 'B', time: now - 3600000, longitude: 0, latitude: 0 },
      { id: '3', magnitude: 3.0, place: 'C', time: now - oneDayMs - 3600000, longitude: 0, latitude: 0 },
    ];
    const counts = computeDailyCounts(quakes, 7, now);
    expect(counts).toHaveLength(7);
    expect(counts[counts.length - 1]).toBe(2); // today: 2 events
    expect(counts[counts.length - 2]).toBe(1); // yesterday: 1 event
  });

  it('handles empty input', () => {
    const counts = computeDailyCounts([], 7, Date.now());
    expect(counts).toHaveLength(7);
    expect(counts.every(c => c === 0)).toBe(true);
  });
});

describe('computeZScore', () => {
  it('returns z-score = (current - mean) / std', () => {
    // Baseline daily counts: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
    // mean = 1.5, std = 0.5
    // Current 7-day daily counts: [5, 5, 5, 5, 5, 5, 5] => current rate = 5
    // z = (5 - 1.5) / 0.5 = 7
    const baselineCounts = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 1 : 2));
    const currentCounts = [5, 5, 5, 5, 5, 5, 5];
    const z = computeZScore(currentCounts, baselineCounts);
    expect(z).toBeCloseTo(7, 1);
  });

  it('returns 0 when baseline std dev is 0 (no variation)', () => {
    const baselineCounts = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    const currentCounts = [10, 10, 10, 10, 10, 10, 10];
    const z = computeZScore(currentCounts, baselineCounts);
    // std = 0 → return 0 to avoid division by zero
    expect(z).toBe(0);
  });

  it('returns positive z for elevated activity', () => {
    const baselineCounts = Array.from({ length: 30 }, () => 2);
    const currentCounts = [4, 4, 4, 4, 4, 4, 4];
    // std of baseline = 0, so z = 0
    const z = computeZScore(currentCounts, baselineCounts);
    expect(z).toBe(0); // std=0 case
  });

  it('returns negative z for decreased activity', () => {
    const baselineCounts = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 1 : 3));
    const currentCounts = [1, 1, 1, 1, 1, 1, 1];
    const z = computeZScore(currentCounts, baselineCounts);
    expect(z).toBeLessThan(0);
  });
});

describe('computeAnomalies', () => {
  it('takes USGS GeoJSON and returns ranked anomaly regions', () => {
    const now = Date.now();
    const oneDayMs = 86400000;

    // Create a region with unusual recent activity
    const features: USGSFeatureCollection['features'] = [];
    // 30 days of baseline: 1-2 events per day in cell at (35, 139)
    for (let d = 30; d > 7; d--) {
      const count = d % 2 === 0 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        features.push({
          id: `base-${d}-${i}`,
          properties: { mag: 3.0, place: 'Japan', time: now - d * oneDayMs },
          geometry: { coordinates: [139, 35, 10] },
        });
      }
    }
    // Last 7 days: 8 events per day (way above baseline)
    for (let d = 7; d > 0; d--) {
      for (let i = 0; i < 8; i++) {
        features.push({
          id: `recent-${d}-${i}`,
          properties: { mag: 4.5, place: 'Japan', time: now - (d - 1) * oneDayMs - 3600000 },
          geometry: { coordinates: [139, 35, 10] },
        });
      }
    }

    const geoJson: USGSFeatureCollection = {
      type: 'FeatureCollection',
      features,
      metadata: { generated: now, title: 'Past 30 Days' },
    };

    const anomalies = computeAnomalies(geoJson, now);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].zScore).toBeGreaterThan(2.0); // Statistically significant
    expect(anomalies[0].currentRate).toBeGreaterThan(anomalies[0].baselineRate);
    expect(anomalies[0].label).toContain('30°N');
    expect(anomalies[0].dailyCounts14d).toHaveLength(14);
    expect(anomalies[0].totalEvents7d).toBe(56); // 7 days * 8 events
    expect(anomalies[0].largestRecentQuake).not.toBeNull();
    expect(anomalies[0].largestRecentQuake?.magnitude).toBe(4.5);
  });

  it('sorts regions by z-score descending', () => {
    const now = Date.now();
    const oneDayMs = 86400000;

    const features: USGSFeatureCollection['features'] = [];
    // Region A: high anomaly (cell 10,10)
    for (let d = 30; d > 7; d--) {
      features.push({
        id: `a-base-${d}`,
        properties: { mag: 3.0, place: 'A', time: now - d * oneDayMs },
        geometry: { coordinates: [10, 10, 10] },
      });
    }
    for (let d = 7; d > 0; d--) {
      for (let i = 0; i < 6; i++) {
        features.push({
          id: `a-recent-${d}-${i}`,
          properties: { mag: 4.0, place: 'A', time: now - (d - 1) * oneDayMs - 3600000 },
          geometry: { coordinates: [10, 10, 10] },
        });
      }
    }
    // Region B: low anomaly (cell 20,20)
    for (let d = 30; d > 7; d--) {
      features.push({
        id: `b-base-${d}`,
        properties: { mag: 3.0, place: 'B', time: now - d * oneDayMs },
        geometry: { coordinates: [20, 20, 10] },
      });
    }
    for (let d = 7; d > 0; d--) {
      features.push({
        id: `b-recent-${d}`,
        properties: { mag: 3.0, place: 'B', time: now - (d - 1) * oneDayMs - 3600000 },
        geometry: { coordinates: [20, 20, 10] },
      });
    }

    const geoJson: USGSFeatureCollection = {
      type: 'FeatureCollection',
      features,
      metadata: { generated: now, title: 'Past 30 Days' },
    };

    const anomalies = computeAnomalies(geoJson, now);
    expect(anomalies.length).toBeGreaterThanOrEqual(2);
    // Sorted descending
    expect(anomalies[0].zScore).toBeGreaterThanOrEqual(anomalies[1].zScore);
  });

  it('returns empty array for empty GeoJSON', () => {
    const geoJson: USGSFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
      metadata: { generated: Date.now(), title: 'Empty' },
    };
    expect(computeAnomalies(geoJson, Date.now())).toEqual([]);
  });

  it('excludes regions with fewer than 5 total events (noise filter)', () => {
    const now = Date.now();
    const features: USGSFeatureCollection['features'] = [
      {
        id: 'lone-1',
        properties: { mag: 3.0, place: 'Solo', time: now - 3600000 },
        geometry: { coordinates: [50, 50, 10] },
      },
      {
        id: 'lone-2',
        properties: { mag: 3.0, place: 'Solo', time: now - 7200000 },
        geometry: { coordinates: [50, 50, 10] },
      },
    ];
    const geoJson: USGSFeatureCollection = {
      type: 'FeatureCollection',
      features,
      metadata: { generated: now, title: 'Sparse' },
    };
    const anomalies = computeAnomalies(geoJson, now);
    expect(anomalies).toEqual([]);
  });
});

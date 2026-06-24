import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import type { USGSFeatureCollection } from '../src/types';

// Helper: generate mock USGS data with anomalous region
function makeMockUSGS(now: number): USGSFeatureCollection {
  const oneDayMs = 86400000;
  const features: USGSFeatureCollection['features'] = [];
  // Anomalous region at (35, 139): 2 events/day baseline, 8/day recent
  for (let d = 30; d > 7; d--) {
    for (let i = 0; i < 2; i++) {
      features.push({
        id: `base-${d}-${i}`,
        properties: { mag: 3.0, place: 'Japan', time: now - d * oneDayMs },
        geometry: { coordinates: [139, 35, 10] },
      });
    }
  }
  for (let d = 7; d > 0; d--) {
    for (let i = 0; i < 8; i++) {
      features.push({
        id: `recent-${d}-${i}`,
        properties: { mag: 4.5, place: 'Japan', time: now - (d - 1) * oneDayMs - 3600000 },
        geometry: { coordinates: [139, 35, 10] },
      });
    }
  }
  return { type: 'FeatureCollection', features, metadata: { generated: now, title: 'Test' } };
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
    // Mock window.aif
    vi.stubGlobal('aif', { track: vi.fn() });
  });

  it('renders the product name as h1', async () => {
    const mockData = makeMockUSGS(Date.now());
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Seismic Anomaly Radar');
  });

  it('fetches USGS data on mount and renders anomaly leaderboard', async () => {
    const now = Date.now();
    const mockData = makeMockUSGS(now);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('anomaly-leaderboard')).toBeInTheDocument();
    });

    // Should show at least one region row
    const rows = screen.getAllByTestId('region-row');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('shows loading state before data loads', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // never resolves

    render(<App />);
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
  });

  it('shows refresh button and triggers new fetch on click', async () => {
    const now = Date.now();
    const mockData = makeMockUSGS(now);
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('anomaly-leaderboard')).toBeInTheDocument();
    });

    // Provide second fetch response for refresh
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const refreshBtn = screen.getByTestId('refresh-button');
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays the tagline', async () => {
    const mockData = makeMockUSGS(Date.now());
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('anomaly-leaderboard')).toBeInTheDocument();
    });

    expect(screen.getByText(/Where is the ground unusually active/i)).toBeInTheDocument();
  });
});

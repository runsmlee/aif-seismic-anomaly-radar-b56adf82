import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegionRow from '../src/components/RegionRow';
import type { AnomalyRegion, EarthquakeEvent } from '../src/types';

function makeRegion(overrides: Partial<AnomalyRegion> = {}): AnomalyRegion {
  const quake: EarthquakeEvent = {
    id: 'q1',
    magnitude: 5.2,
    place: 'Japan',
    time: Date.now() - 3600000,
    longitude: 139.7,
    latitude: 35.7,
  };
  return {
    cell: { latIndex: 3, lngIndex: 13 },
    label: '30°N–40°N, 130°E–140°E',
    zScore: 3.5,
    currentRate: 8.0,
    baselineRate: 1.5,
    baselineStdDev: 0.5,
    totalEvents7d: 56,
    totalEvents30d: 86,
    largestRecentQuake: quake,
    dailyCounts14d: [1, 2, 1, 2, 1, 2, 1, 8, 8, 8, 8, 8, 8, 8],
    dailyCounts30d: [],
    ...overrides,
  };
}

describe('RegionRow', () => {
  beforeEach(() => {
    vi.stubGlobal('aif', { track: vi.fn() });
  });

  it('renders region label and z-score', () => {
    const region = makeRegion();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('30°N–40°N, 130°E–140°E')).toBeInTheDocument();
    expect(screen.getByText('+3.50')).toBeInTheDocument();
  });

  it('shows current vs baseline rates', () => {
    const region = makeRegion();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText(/8\.0/)).toBeInTheDocument();
    expect(screen.getByText(/1\.5/)).toBeInTheDocument();
  });

  it('shows largest recent quake magnitude', () => {
    const region = makeRegion();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText(/5\.2/)).toBeInTheDocument();
  });

  it('renders sparkline SVG', () => {
    const region = makeRegion();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    const sparkline = document.querySelector('svg.sparkline');
    expect(sparkline).toBeInTheDocument();
  });

  it('calls onPin when pin button is clicked', async () => {
    const region = makeRegion();
    const onPin = vi.fn();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={onPin} />
        </tbody>
      </table>,
    );

    const pinBtn = screen.getByTestId('pin-button');
    await userEvent.click(pinBtn);
    expect(onPin).toHaveBeenCalledWith(region);
  });

  it('shows pinned state with visual indicator', () => {
    const region = makeRegion();
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={true} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    const pinBtn = screen.getByTestId('pin-button');
    expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies severity color based on z-score', () => {
    const highAnomaly = makeRegion({ zScore: 4.0 });
    const { container } = render(
      <table>
        <tbody>
          <RegionRow region={highAnomaly} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    // Severity color is applied via the accent rail span's inline background-color
    const accentRail = container.querySelector('td span[aria-hidden="true"]') as HTMLElement;
    expect(accentRail).toBeTruthy();
    expect(accentRail.style.backgroundColor).toBeTruthy();
  });

  it('shows z-score as "—" when it is 0 and baseline is 0', () => {
    const region = makeRegion({ zScore: 0, baselineRate: 0 });
    render(
      <table>
        <tbody>
          <RegionRow region={region} isPinned={false} onPin={vi.fn()} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

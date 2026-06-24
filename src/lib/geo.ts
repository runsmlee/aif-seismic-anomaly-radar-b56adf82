import type { GridCell } from '../types';

/** Centroid lat/lng of a 10°×10° grid cell. */
export function cellCentroid(cell: GridCell): { lat: number; lng: number } {
  return { lat: cell.latIndex * 10 + 5, lng: cell.lngIndex * 10 + 5 };
}

/** Project lat/lng onto an equirectangular canvas of the given size. */
export function project(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

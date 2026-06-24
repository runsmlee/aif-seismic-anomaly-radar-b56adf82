# Seismic Anomaly Radar — Product Requirements Document

## Problem
Earthquake monitoring dashboards show where the biggest quakes just happened, not where activity is *unusually elevated* relative to normal. A M3 swarm in a typically quiet region is far more newsworthy than a routine M5 in an always-active subduction zone — but no free tool surfaces this. Seismic Anomaly Radar answers: "Where is the ground behaving abnormally right now?" using a rigorous z-score comparison of each region's current 7-day activity against its own 30-day baseline.

## Target Users
Seismology enthusiasts, emergency management professionals, and geo-curious news followers who want to spot unusual seismic activity before it makes headlines — people who check IRIS/USGS regularly but want signal, not raw data.

## Core Feature (ONE)
- **Anomaly Z-Score Ranking**: Fetches the USGS 30-day all-earthquakes GeoJSON feed client-side, bins every quake into a 10°×10° geographic grid cell, computes each cell's current 7-day daily rate vs. its 30-day daily mean/std-dev (z-score), and ranks cells by anomaly severity in a live, color-coded leaderboard. Each row shows the z-score, current vs. baseline rates, largest recent quake, and a 14-day daily-count sparkline. The hero IS this ranking — no "click to start." — Acceptance Criteria: On page load, the app fetches live USGS data, computes z-scores for all active grid cells, and renders a ranked list where the top entry has a z-score ≥ 2.0 (statistically significant anomaly) with a visible sparkline; data refreshes automatically every 60 minutes.

## Should Have
- **Region Pinning & History**: Users click any ranked region to "pin" it; pinned regions are saved to localStorage with their current z-score snapshot and timestamp. On next visit, pinned regions show their z-score trend (last 10 snapshots as a mini-chart). — Acceptance Criteria: A pinned region persists across page reloads and displays its historical z-score progression as a sparkline after 2+ visits.

## Out of Scope (v1)
- **Interactive map visualization** — a Leaflet/Mapbox map would be visually compelling but adds complexity (map tiles, projection math, clustering) without improving the core ranking insight; the leaderboard communicates anomalies more directly.
- **Push notifications / email alerts** — requires a backend with user accounts and a scheduler; the hourly auto-refresh + localStorage history covers the "reason to return" loop without infrastructure.
- **Fault-line overlay or tectonic context** — adding geological metadata per region is interesting but requires a second dataset join and domain expertise; the z-score alone is the differentiated insight.
- **User accounts / multi-device sync** — localStorage persistence is sufficient for v1; a backend adds auth complexity for a single-purpose tool.

## Success Metrics
- Primary: User views the full anomaly ranking within 5 seconds of page load (data fetch + computation + render)
- Secondary: Pinned region exists on 20%+ of return visits (indicates tracking behavior)

## Design Principles
- **Data-first, no decoration**: Every pixel either shows data or controls data — no hero illustrations, no marketing copy
- **Scannable severity**: Color and position encode anomaly urgency instantly — red = high z-score, sorted descending
- **The hero IS the product**: The ranking fills the viewport on load; no intro, no scroll prompt, no "Get Started"

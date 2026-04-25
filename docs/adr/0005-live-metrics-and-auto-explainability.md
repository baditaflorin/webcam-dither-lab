# 0005: Show Live Metrics and Auto Decisions

## Status

Accepted

## Context

Auto Best Detail is useful only if users can understand what it picked and
whether the app is still running comfortably while processing webcam frames.

## Decision

Display a compact live HUD over the preview with smoothed FPS, render time, and
the current lane summaries. Auto Best Detail also reports the winning filter and
its detail, edge, and tone scores in the lane panel.

## Consequences

Users get feedback on both performance and algorithm decisions. That makes the
auto mode feel inspectable rather than opaque.

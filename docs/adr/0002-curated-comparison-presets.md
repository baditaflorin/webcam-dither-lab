# 0002: Add Curated Comparison Presets

## Status

Accepted

## Context

The app exposes many controls. That flexibility is the point, but a blank set
of knobs slows down exploration when someone wants to quickly test the most
interesting visual directions.

## Decision

Provide preset buttons that configure both lanes, the split position, tone
model, filter choices, color modes, palette, threshold, contrast, noise, and
seed together.

Presets should be opinionated starting points rather than hidden magic. Users
can still change every control after applying a preset.

## Consequences

The app becomes easier to demo and easier to compare visually. New algorithms
can be introduced through presets before users understand every control.

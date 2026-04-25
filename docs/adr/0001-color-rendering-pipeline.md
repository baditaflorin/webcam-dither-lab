# 0001: Add a Color Rendering Pipeline

## Status

Accepted

## Context

The lab began as a black-and-white dithering comparator. That is useful for
algorithm study, but it hides how these algorithms behave when the output needs
to remain expressive, poster-like, or faithful to a source scene.

## Decision

Each filter lane will separate the structural filter from the final color
rendering step. Filters can still produce monochrome or native color output,
but the lane can then render that result as native, duotone, palette-mapped,
source-color masked, or thermal-ramp output.

The lab will also include an RGB Dither filter that thresholds red, green, and
blue independently so color behavior can be compared directly.

## Consequences

Color experiments become first-class without duplicating every dithering
algorithm. Auto Best Detail can continue to score structural detail separately
from final color styling.

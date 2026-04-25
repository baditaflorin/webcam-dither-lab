# 0004: Support Snapshot Export

## Status

Accepted

## Context

Dither comparisons are visual artifacts. Users need a low-friction way to
capture a moment without reaching for external screenshot tooling.

## Decision

Add a PNG capture action that exports the current comparison canvas with a
small title strip and the active lane labels.

## Consequences

The app can produce shareable visual results directly. The export remains
browser-native and does not require a server.

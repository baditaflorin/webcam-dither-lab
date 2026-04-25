# 0003: Encode Lab State in the URL

## Status

Accepted

## Context

The project is published as a static GitHub Pages app. There is no backend
database, account system, or server-side session storage. Useful experiments
should still be shareable and reproducible.

## Decision

Encode the split position and both filter lanes into the URL hash. Updating
controls debounces the hash update, and opening a URL with a lab hash restores
the same settings.

## Consequences

People can share exact comparisons through a link. The approach stays fully
client-side and works on GitHub Pages.

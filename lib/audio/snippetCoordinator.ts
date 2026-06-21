// Ensures only one attached-audio snippet plays at a time across the feed.
// Each snippet registers a stop callback when it starts; claiming a new one
// stops the previous.

let currentStop: (() => void) | null = null;

export function claimSnippet(stop: () => void): void {
  if (currentStop && currentStop !== stop) currentStop();
  currentStop = stop;
}

export function releaseSnippet(stop: () => void): void {
  if (currentStop === stop) currentStop = null;
}
